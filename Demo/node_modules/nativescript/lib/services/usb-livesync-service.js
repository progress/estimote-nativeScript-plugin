///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var androidLiveSyncServiceLib = require("../common/mobile/android/android-livesync-service");
var constants = require("../constants");
var usbLivesyncServiceBaseLib = require("../common/services/usb-livesync-service-base");
var path = require("path");
var semver = require("semver");
var net = require("net");
var Future = require("fibers/future");
var helpers = require("../common/helpers");
var moment = require("moment");
var UsbLiveSyncService = (function (_super) {
    __extends(UsbLiveSyncService, _super);
    function UsbLiveSyncService($devicesService, $fs, $mobileHelper, $localToDevicePathDataFactory, $options, $platformsData, $projectData, $deviceAppDataFactory, $logger, $injector, $platformService, $dispatcher, $childProcess, $iOSEmulatorServices, $hooksService, $devicePlatformsConstants, $projectDataService, $prompter, $errors, $hostInfo) {
        _super.call(this, $devicesService, $mobileHelper, $localToDevicePathDataFactory, $logger, $options, $deviceAppDataFactory, $fs, $dispatcher, $injector, $childProcess, $iOSEmulatorServices, $hooksService, $hostInfo);
        this.$platformsData = $platformsData;
        this.$projectData = $projectData;
        this.$platformService = $platformService;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$projectDataService = $projectDataService;
        this.$prompter = $prompter;
        this.$errors = $errors;
        this.excludedProjectDirsAndFiles = [
            "**/*.ts",
        ];
    }
    UsbLiveSyncService.prototype.liveSync = function (platform) {
        var _this = this;
        return (function () {
            platform = platform || _this.initialize(platform).wait();
            var platformLowerCase = platform ? platform.toLowerCase() : null;
            _this.$platformService.ensurePlatformInstalled(platform).wait();
            var platformData = _this.$platformsData.getPlatformData(platformLowerCase);
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var frameworkVersion = _this.$projectDataService.getValue(platformData.frameworkPackageName).wait().version;
            if (platformLowerCase === _this.$devicePlatformsConstants.Android.toLowerCase()) {
                if (semver.lt(frameworkVersion, "1.2.1")) {
                    var shouldUpdate = _this.$prompter.confirm("You need Android Runtime 1.2.1 or later for LiveSync to work properly. Do you want to update your runtime now?").wait();
                    if (shouldUpdate) {
                        _this.$platformService.updatePlatforms([_this.$devicePlatformsConstants.Android.toLowerCase()]).wait();
                    }
                    else {
                        return;
                    }
                }
            }
            if (!_this.$platformService.preparePlatform(platform).wait()) {
                _this.$errors.failWithoutHelp("Verify that listed files are well-formed and try again the operation.");
            }
            var projectFilesPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME);
            var notInstalledAppOnDeviceAction = function (device) { return _this.$platformService.installOnDevice(platform); };
            var notRunningiOSSimulatorAction = function () { return _this.$platformService.deployOnEmulator(_this.$devicePlatformsConstants.iOS.toLowerCase()); };
            var beforeLiveSyncAction = function (device, deviceAppData) {
                var platformSpecificUsbLiveSyncService = _this.resolveUsbLiveSyncService(platform || _this.$devicesService.platform, device);
                if (platformSpecificUsbLiveSyncService.beforeLiveSyncAction) {
                    return platformSpecificUsbLiveSyncService.beforeLiveSyncAction(deviceAppData);
                }
                return Future.fromResult();
            };
            var beforeBatchLiveSyncAction = function (filePath) {
                return (function () {
                    var projectFileInfo = _this.getProjectFileInfo(filePath, platform);
                    var mappedFilePath = path.join(projectFilesPath, path.relative(path.join(_this.$projectData.projectDir, constants.APP_FOLDER_NAME), projectFileInfo.onDeviceName));
                    var appResourcesDirectoryPath = path.join(constants.APP_FOLDER_NAME, constants.APP_RESOURCES_FOLDER_NAME);
                    var platformSpecificAppResourcesDirectoryPath = path.join(appResourcesDirectoryPath, platformData.normalizedPlatformName);
                    if (filePath.indexOf(appResourcesDirectoryPath) > -1 && filePath.indexOf(platformSpecificAppResourcesDirectoryPath) === -1) {
                        _this.$logger.warn("Unable to sync " + filePath + ".");
                        return null;
                    }
                    if (filePath.indexOf(platformSpecificAppResourcesDirectoryPath) > -1) {
                        var appResourcesRelativePath = path.relative(path.join(_this.$projectData.projectDir, constants.APP_FOLDER_NAME, constants.APP_RESOURCES_FOLDER_NAME, platformData.normalizedPlatformName), filePath);
                        mappedFilePath = path.join(platformData.platformProjectService.getAppResourcesDestinationDirectoryPath().wait(), appResourcesRelativePath);
                    }
                    return mappedFilePath;
                }).future()();
            };
            var iOSSimulatorRelativeToProjectBasePathAction = function (projectFile) {
                return path.join(constants.APP_FOLDER_NAME, path.dirname(projectFile.split("/" + constants.APP_FOLDER_NAME + "/")[1]));
            };
            var watchGlob = path.join(_this.$projectData.projectDir, constants.APP_FOLDER_NAME);
            var platformSpecificLiveSyncServices = {
                android: AndroidUsbLiveSyncService,
                ios: IOSUsbLiveSyncService
            };
            var localProjectRootPath = platform.toLowerCase() === "ios" ? platformData.appDestinationDirectoryPath : null;
            var fastLivesyncFileExtensions = [".css", ".xml"];
            var fastLiveSync = function (filePath) {
                _this.$dispatcher.dispatch(function () {
                    return (function () {
                        if (!_this.$platformService.preparePlatform(platform).wait()) {
                            _this.$logger.out("Verify that listed files are well-formed and try again the operation.");
                            return;
                        }
                        var mappedFilePath = beforeBatchLiveSyncAction(filePath).wait();
                        if (_this.shouldSynciOSSimulator(platform).wait()) {
                            _this.$iOSEmulatorServices.transferFiles(_this.$projectData.projectId, [filePath], iOSSimulatorRelativeToProjectBasePathAction).wait();
                            var platformSpecificUsbLiveSyncService = _this.resolvePlatformSpecificLiveSyncService(platform || _this.$devicesService.platform, null, platformSpecificLiveSyncServices);
                            platformSpecificUsbLiveSyncService.sendPageReloadMessageToSimulator().wait();
                        }
                        else {
                            var deviceAppData = _this.$deviceAppDataFactory.create(_this.$projectData.projectId, _this.$mobileHelper.normalizePlatformName(platform));
                            var localToDevicePaths = _this.createLocalToDevicePaths(platform, _this.$projectData.projectId, localProjectRootPath || projectFilesPath, [mappedFilePath]);
                            var devices = _this.$devicesService.getDeviceInstances();
                            _.each(devices, function (device) {
                                if (_this.$fs.exists(filePath).wait()) {
                                    _this.transferFiles(device, deviceAppData, localToDevicePaths, projectFilesPath, true).wait();
                                }
                                var platformSpecificUsbLiveSyncService = _this.resolvePlatformSpecificLiveSyncService(platform || _this.$devicesService.platform, device, platformSpecificLiveSyncServices);
                                return platformSpecificUsbLiveSyncService.sendPageReloadMessageToDevice(deviceAppData).wait();
                            });
                        }
                        _this.$logger.info("Successfully synced application " + _this.$projectData.projectId + " at " + moment().format("ll LTS") + ".");
                    }).future()();
                });
            };
            var getApplicationPathForiOSSimulatorAction = function () {
                return (function () {
                    if (!_this.$fs.exists(platformData.emulatorBuildOutputPath).wait()) {
                        _this.$platformService.buildPlatform(platformData.normalizedPlatformName).wait();
                    }
                    return _this.$platformService.getLatestApplicationPackageForEmulator(platformData).wait().packageName;
                }).future()();
            };
            var liveSyncData = {
                platform: platform,
                appIdentifier: _this.$projectData.projectId,
                projectFilesPath: projectFilesPath,
                excludedProjectDirsAndFiles: _this.excludedProjectDirsAndFiles,
                watchGlob: watchGlob,
                platformSpecificLiveSyncServices: platformSpecificLiveSyncServices,
                notInstalledAppOnDeviceAction: notInstalledAppOnDeviceAction,
                notRunningiOSSimulatorAction: notRunningiOSSimulatorAction,
                getApplicationPathForiOSSimulatorAction: getApplicationPathForiOSSimulatorAction,
                localProjectRootPath: localProjectRootPath,
                beforeLiveSyncAction: beforeLiveSyncAction,
                beforeBatchLiveSyncAction: beforeBatchLiveSyncAction,
                iOSSimulatorRelativeToProjectBasePathAction: iOSSimulatorRelativeToProjectBasePathAction,
                canExecuteFastLiveSync: function (filePath) { return _.contains(fastLivesyncFileExtensions, path.extname(filePath)) && semver.gte(frameworkVersion, "1.5.0"); },
                fastLiveSync: fastLiveSync
            };
            _this.sync(liveSyncData).wait();
        }).future()();
    };
    UsbLiveSyncService.prototype.preparePlatformForSync = function (platform) {
        if (!this.$platformService.preparePlatform(platform).wait()) {
            this.$logger.out("Verify that listed files are well-formed and try again the operation.");
            return;
        }
    };
    UsbLiveSyncService.prototype.resolveUsbLiveSyncService = function (platform, device) {
        var platformSpecificUsbLiveSyncService = null;
        if (platform.toLowerCase() === "android") {
            platformSpecificUsbLiveSyncService = this.$injector.resolve(AndroidUsbLiveSyncService, { _device: device });
        }
        else if (platform.toLowerCase() === "ios") {
            platformSpecificUsbLiveSyncService = this.$injector.resolve(IOSUsbLiveSyncService, { _device: device });
        }
        return platformSpecificUsbLiveSyncService;
    };
    return UsbLiveSyncService;
})(usbLivesyncServiceBaseLib.UsbLiveSyncServiceBase);
exports.UsbLiveSyncService = UsbLiveSyncService;
$injector.register("usbLiveSyncService", UsbLiveSyncService);
var currentPageReloadId = 0;
var IOSUsbLiveSyncService = (function () {
    function IOSUsbLiveSyncService(_device, $iOSSocketRequestExecutor, $iOSNotification, $iOSEmulatorServices, $injector) {
        this._device = _device;
        this.$iOSSocketRequestExecutor = $iOSSocketRequestExecutor;
        this.$iOSNotification = $iOSNotification;
        this.$iOSEmulatorServices = $iOSEmulatorServices;
        this.$injector = $injector;
    }
    Object.defineProperty(IOSUsbLiveSyncService.prototype, "device", {
        get: function () {
            return this._device;
        },
        enumerable: true,
        configurable: true
    });
    IOSUsbLiveSyncService.prototype.restartApplication = function (deviceAppData) {
        return this.device.applicationManager.restartApplication(deviceAppData.appIdentifier);
    };
    IOSUsbLiveSyncService.prototype.sendPageReloadMessageToDevice = function (deviceAppData) {
        var _this = this;
        return (function () {
            var timeout = 9000;
            _this.$iOSSocketRequestExecutor.executeAttachRequest(_this.device, timeout).wait();
            var socket = _this.device.connectToPort(IOSUsbLiveSyncService.BACKEND_PORT);
            _this.sendPageReloadMessage(socket);
        }).future()();
    };
    IOSUsbLiveSyncService.prototype.sendPageReloadMessageToSimulator = function () {
        var _this = this;
        helpers.connectEventually(function () { return net.connect(IOSUsbLiveSyncService.BACKEND_PORT); }, function (socket) { return _this.sendPageReloadMessage(socket); });
        return this.$iOSEmulatorServices.postDarwinNotification(this.$iOSNotification.attachRequest);
    };
    IOSUsbLiveSyncService.prototype.removeFile = function (appIdentifier, localToDevicePaths) {
        var _this = this;
        return (function () {
            _.each(localToDevicePaths, function (localToDevicePathData) {
                _this.device.fileSystem.deleteFile(localToDevicePathData.getDevicePath(), appIdentifier);
            });
        }).future()();
    };
    IOSUsbLiveSyncService.prototype.sendPageReloadMessage = function (socket) {
        try {
            this.sendPageReloadMessageCore(socket);
        }
        finally {
            socket.destroy();
        }
    };
    IOSUsbLiveSyncService.prototype.sendPageReloadMessageCore = function (socket) {
        var message = "{ \"method\":\"Page.reload\",\"params\":{\"ignoreCache\":false},\"id\":" + ++currentPageReloadId + " }";
        var length = Buffer.byteLength(message, "utf16le");
        var payload = new Buffer(length + 4);
        payload.writeInt32BE(length, 0);
        payload.write(message, 4, length, "utf16le");
        socket.write(payload);
    };
    IOSUsbLiveSyncService.BACKEND_PORT = 18181;
    return IOSUsbLiveSyncService;
})();
exports.IOSUsbLiveSyncService = IOSUsbLiveSyncService;
$injector.register("iosUsbLiveSyncServiceLocator", { factory: IOSUsbLiveSyncService });
var AndroidUsbLiveSyncService = (function (_super) {
    __extends(AndroidUsbLiveSyncService, _super);
    function AndroidUsbLiveSyncService(_device, $fs, $mobileHelper, $options) {
        _super.call(this, _device, $fs, $mobileHelper);
        this.$options = $options;
    }
    AndroidUsbLiveSyncService.prototype.restartApplication = function (deviceAppData, localToDevicePaths) {
        var _this = this;
        return (function () {
            _this.device.adb.executeShellCommand(["chmod", "777", deviceAppData.deviceProjectRootPath, ("/data/local/tmp/" + deviceAppData.appIdentifier)]).wait();
            if (_this.$options.companion) {
                var commands = [_this.liveSyncCommands.SyncFilesCommand()];
                _this.livesync(deviceAppData.appIdentifier, deviceAppData.deviceProjectRootPath, commands).wait();
            }
            else {
                var devicePathRoot = "/data/data/" + deviceAppData.appIdentifier + "/files";
                var devicePath = _this.$mobileHelper.buildDevicePath(devicePathRoot, "code_cache", "secondary_dexes", "proxyThumb");
                _this.device.adb.executeShellCommand(["rm", "-rf", devicePath]).wait();
            }
            _this.device.applicationManager.restartApplication(deviceAppData.appIdentifier).wait();
        }).future()();
    };
    AndroidUsbLiveSyncService.prototype.beforeLiveSyncAction = function (deviceAppData) {
        var _this = this;
        return (function () {
            var deviceRootPath = _this.getDeviceRootPath(deviceAppData.appIdentifier);
            _this.device.adb.executeShellCommand(["rm", "-rf", _this.$mobileHelper.buildDevicePath(deviceRootPath, "fullsync"),
                _this.$mobileHelper.buildDevicePath(deviceRootPath, "sync"),
                _this.$mobileHelper.buildDevicePath(deviceRootPath, "removedsync")]).wait();
        }).future()();
    };
    AndroidUsbLiveSyncService.prototype.sendPageReloadMessageToDevice = function (deviceAppData) {
        var _this = this;
        return (function () {
            _this.device.adb.executeCommand(["forward", ("tcp:" + AndroidUsbLiveSyncService.BACKEND_PORT.toString()), ("localabstract:" + deviceAppData.appIdentifier + "-livesync")]).wait();
            _this.sendPageReloadMessage().wait();
        }).future()();
    };
    AndroidUsbLiveSyncService.prototype.removeFile = function (appIdentifier, localToDevicePaths) {
        var _this = this;
        return (function () {
            var deviceRootPath = _this.getDeviceRootPath(appIdentifier);
            _.each(localToDevicePaths, function (localToDevicePathData) {
                var relativeUnixPath = _.trimLeft(helpers.fromWindowsRelativePathToUnix(localToDevicePathData.getRelativeToProjectBasePath()), "/");
                var deviceFilePath = _this.$mobileHelper.buildDevicePath(deviceRootPath, "removedsync", relativeUnixPath);
                _this.device.adb.executeShellCommand(["mkdir", "-p", path.dirname(deviceFilePath), "&&", "touch", deviceFilePath]).wait();
            });
        }).future()();
    };
    AndroidUsbLiveSyncService.prototype.getDeviceRootPath = function (appIdentifier) {
        return "/data/local/tmp/" + appIdentifier;
    };
    AndroidUsbLiveSyncService.prototype.sendPageReloadMessage = function () {
        var future = new Future();
        var socket = new net.Socket();
        socket.connect(AndroidUsbLiveSyncService.BACKEND_PORT, '127.0.0.1', function () {
            try {
                socket.write(new Buffer([0, 0, 0, 1, 1]));
                future.return();
            }
            catch (e) {
                future.throw(e);
            }
            finally {
                socket.destroy();
            }
        });
        return future;
    };
    AndroidUsbLiveSyncService.BACKEND_PORT = 18181;
    return AndroidUsbLiveSyncService;
})(androidLiveSyncServiceLib.AndroidLiveSyncService);
exports.AndroidUsbLiveSyncService = AndroidUsbLiveSyncService;
$injector.register("androidUsbLiveSyncServiceLocator", { factory: AndroidUsbLiveSyncService });
