///<reference path="../.d.ts"/>
"use strict";
var minimatch = require("minimatch");
var path = require("path");
var util = require("util");
var moment = require("moment");
var gaze = require("gaze");
var SyncBatch = (function () {
    function SyncBatch($logger, $dispatcher, done) {
        this.$logger = $logger;
        this.$dispatcher = $dispatcher;
        this.done = done;
        this.timer = null;
        this.syncQueue = [];
    }
    SyncBatch.prototype.addFile = function (filePath) {
        var _this = this;
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.syncQueue.push(filePath);
        this.timer = setTimeout(function () {
            var filesToSync = _this.syncQueue;
            if (filesToSync.length > 0) {
                _this.syncQueue = [];
                _this.$logger.trace("Syncing %s", filesToSync.join(", "));
                _this.$dispatcher.dispatch(function () {
                    return (function () { return _this.done(filesToSync); }).future()();
                });
            }
            _this.timer = null;
        }, 250);
    };
    Object.defineProperty(SyncBatch.prototype, "syncPending", {
        get: function () {
            return this.syncQueue.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    return SyncBatch;
})();
var UsbLiveSyncServiceBase = (function () {
    function UsbLiveSyncServiceBase($devicesService, $mobileHelper, $localToDevicePathDataFactory, $logger, $options, $deviceAppDataFactory, $fs, $dispatcher, $injector, $childProcess, $iOSEmulatorServices, $hooksService, $hostInfo) {
        this.$devicesService = $devicesService;
        this.$mobileHelper = $mobileHelper;
        this.$localToDevicePathDataFactory = $localToDevicePathDataFactory;
        this.$logger = $logger;
        this.$options = $options;
        this.$deviceAppDataFactory = $deviceAppDataFactory;
        this.$fs = $fs;
        this.$dispatcher = $dispatcher;
        this.$injector = $injector;
        this.$childProcess = $childProcess;
        this.$iOSEmulatorServices = $iOSEmulatorServices;
        this.$hooksService = $hooksService;
        this.$hostInfo = $hostInfo;
        this._initialized = false;
        this.batch = null;
        this.fileHashes = Object.create(null);
    }
    UsbLiveSyncServiceBase.prototype.initialize = function (platform) {
        var _this = this;
        return (function () {
            if (!(_this.$options.emulator && platform && platform.toLowerCase() === "ios")) {
                _this.$devicesService.initialize({ platform: platform, deviceId: _this.$options.device }).wait();
                _this._initialized = true;
                return _this.$devicesService.platform;
            }
        }).future()();
    };
    Object.defineProperty(UsbLiveSyncServiceBase.prototype, "isInitialized", {
        get: function () {
            return this._initialized;
        },
        enumerable: true,
        configurable: true
    });
    UsbLiveSyncServiceBase.prototype.sync = function (data) {
        var _this = this;
        return (function () {
            var synciOSSimulator = _this.shouldSynciOSSimulator(data.platform).wait();
            if (synciOSSimulator) {
                _this.$iOSEmulatorServices.sync(data.appIdentifier, data.projectFilesPath, data.notRunningiOSSimulatorAction, data.getApplicationPathForiOSSimulatorAction).wait();
            }
            if (!_this.$options.emulator || data.platform.toLowerCase() === "android") {
                if (!_this._initialized) {
                    _this.initialize(data.platform).wait();
                }
                var projectFiles = _this.$fs.enumerateFilesInDirectorySync(data.projectFilesPath, function (filePath, stat) { return !_this.isFileExcluded(path.relative(data.projectFilesPath, filePath), data.excludedProjectDirsAndFiles, data.projectFilesPath); }, { enumerateDirectories: true });
                _this.syncCore(data, projectFiles, false).wait();
            }
            if (_this.$options.watch) {
                var that = _this;
                _this.$hooksService.executeBeforeHooks('watch').wait();
                gaze("**/*", { cwd: data.watchGlob }, function (err, watcher) {
                    this.on('all', function (event, filePath) {
                        if (event === "added" || event === "changed") {
                            if (!that.isFileExcluded(filePath, data.excludedProjectDirsAndFiles, data.projectFilesPath)) {
                                that.$dispatcher.dispatch(function () { return (function () {
                                    var fileHash = that.$fs.getFsStats(filePath).wait().isFile() ? that.$fs.getFileShasum(filePath).wait() : "";
                                    if (fileHash === that.fileHashes[filePath]) {
                                        that.$logger.trace("Skipping livesync for " + filePath + " file with " + fileHash + " hash.");
                                        return;
                                    }
                                    that.$logger.trace("Adding " + filePath + " file with " + fileHash + " hash.");
                                    that.fileHashes[filePath] = fileHash;
                                    var canExecuteFastLiveSync = data.canExecuteFastLiveSync && data.canExecuteFastLiveSync(filePath);
                                    if (synciOSSimulator && !canExecuteFastLiveSync) {
                                        that.batchSimulatorLiveSync(data, filePath);
                                    }
                                    if ((!that.$options.emulator || data.platform.toLowerCase() === "android") && !canExecuteFastLiveSync) {
                                        that.batchLiveSync(data, filePath);
                                    }
                                    if (canExecuteFastLiveSync) {
                                        data.fastLiveSync(filePath);
                                    }
                                }).future()(); });
                            }
                        }
                        if (event === "deleted") {
                            if (that.fileHashes[filePath]) {
                                that.fileHashes[filePath] = null;
                            }
                            that.processRemovedFile(data, filePath);
                        }
                    });
                });
                _this.$dispatcher.run();
            }
        }).future()();
    };
    UsbLiveSyncServiceBase.prototype.shouldSynciOSSimulator = function (platform) {
        var _this = this;
        return (function () {
            return _this.$hostInfo.isDarwin && platform.toLowerCase() === "ios" && (_this.$options.emulator || _this.$iOSEmulatorServices.isSimulatorRunning().wait());
        }).future()();
    };
    UsbLiveSyncServiceBase.prototype.createLocalToDevicePaths = function (platform, appIdentifier, projectFilesPath, projectFiles) {
        var _this = this;
        var deviceAppData = this.$deviceAppDataFactory.create(appIdentifier, this.$mobileHelper.normalizePlatformName(platform));
        var localToDevicePaths = _(projectFiles)
            .map(function (projectFile) { return _this.getProjectFileInfo(projectFile, platform); })
            .filter(function (projectFileInfo) { return projectFileInfo.shouldIncludeFile; })
            .map(function (projectFileInfo) { return _this.$localToDevicePathDataFactory.create(projectFileInfo.fileName, projectFilesPath, projectFileInfo.onDeviceName, deviceAppData.deviceProjectRootPath); })
            .value();
        return localToDevicePaths;
    };
    UsbLiveSyncServiceBase.prototype.transferFiles = function (device, deviceAppData, localToDevicePaths, projectFilesPath, batchLiveSync) {
        var _this = this;
        return (function () {
            _this.$logger.info("Transferring project files...");
            if (batchLiveSync) {
                device.fileSystem.transferFiles(deviceAppData.appIdentifier, localToDevicePaths).wait();
            }
            else {
                device.fileSystem.transferDirectory(deviceAppData, localToDevicePaths, projectFilesPath).wait();
            }
            _this.$logger.info("Successfully transferred all project files.");
        }).future()();
    };
    UsbLiveSyncServiceBase.prototype.processRemovedFile = function (data, filePath) {
        var _this = this;
        this.$dispatcher.dispatch(function () { return (function () {
            var synciOSSimulator = _this.shouldSynciOSSimulator(data.platform).wait();
            if (synciOSSimulator) {
                var fileToSync = data.beforeBatchLiveSyncAction ? data.beforeBatchLiveSyncAction(filePath).wait() : filePath;
                _this.$iOSEmulatorServices.removeFiles(data.appIdentifier, data.projectFilesPath, [fileToSync], data.iOSSimulatorRelativeToProjectBasePathAction);
                var canExecuteFastLiveSync = data.canExecuteFastLiveSync && data.canExecuteFastLiveSync(filePath);
                if (canExecuteFastLiveSync) {
                    var platformSpecificUsbLiveSyncService = _this.resolvePlatformSpecificLiveSyncService(data.platform || _this.$devicesService.platform, null, data.platformSpecificLiveSyncServices);
                    platformSpecificUsbLiveSyncService.sendPageReloadMessageToSimulator().wait();
                }
                else {
                    _this.$iOSEmulatorServices.restartApplication(data.appIdentifier, data.getApplicationPathForiOSSimulatorAction).wait();
                }
            }
            else {
                if (!_this.isInitialized) {
                    _this.$devicesService.initialize({ platform: data.platform, deviceId: _this.$options.device }).wait();
                }
                var action = function (device) {
                    return (function () {
                        var fileToSync = data.beforeBatchLiveSyncAction ? data.beforeBatchLiveSyncAction(filePath).wait() : filePath;
                        var localToDevicePaths = _this.createLocalToDevicePaths(data.platform, data.appIdentifier, data.localProjectRootPath || data.projectFilesPath, [fileToSync]);
                        var platformSpecificLiveSyncService = _this.resolvePlatformSpecificLiveSyncService(data.platform, device, data.platformSpecificLiveSyncServices);
                        platformSpecificLiveSyncService.removeFile(data.appIdentifier, localToDevicePaths).wait();
                        var canExecuteFastLiveSync = data.canExecuteFastLiveSync && data.canExecuteFastLiveSync(filePath);
                        if (canExecuteFastLiveSync) {
                            data.fastLiveSync(filePath);
                        }
                        else {
                            var platform = data.platform ? _this.$mobileHelper.normalizePlatformName(data.platform) : _this.$devicesService.platform;
                            var deviceAppData = _this.$deviceAppDataFactory.create(data.appIdentifier, _this.$mobileHelper.normalizePlatformName(platform));
                            platformSpecificLiveSyncService.restartApplication(deviceAppData, localToDevicePaths).wait();
                        }
                    }).future()();
                };
                _this.$devicesService.execute(action).wait();
            }
        }).future()(); });
    };
    UsbLiveSyncServiceBase.prototype.syncCore = function (data, projectFiles, batchLiveSync) {
        var _this = this;
        return (function () {
            var projectFilesPath = data.localProjectRootPath || data.projectFilesPath;
            var platform = data.platform ? _this.$mobileHelper.normalizePlatformName(data.platform) : _this.$devicesService.platform;
            var deviceAppData = _this.$deviceAppDataFactory.create(data.appIdentifier, _this.$mobileHelper.normalizePlatformName(platform));
            var localToDevicePaths = _this.createLocalToDevicePaths(platform, data.appIdentifier, projectFilesPath, projectFiles);
            var action = function (device) {
                return (function () {
                    if (deviceAppData.isLiveSyncSupported(device).wait()) {
                        _this.$logger.info("Start syncing application " + deviceAppData.appIdentifier + " at " + moment().format("ll LTS") + ".");
                        if (data.beforeLiveSyncAction) {
                            data.beforeLiveSyncAction(device, deviceAppData).wait();
                        }
                        var applications = device.applicationManager.getInstalledApplications().wait();
                        if (!_.contains(applications, deviceAppData.appIdentifier)) {
                            _this.$logger.warn("The application with id \"" + deviceAppData.appIdentifier + "\" is not installed on the device yet.");
                            data.notInstalledAppOnDeviceAction(device).wait();
                        }
                        _this.transferFiles(device, deviceAppData, localToDevicePaths, projectFilesPath, batchLiveSync).wait();
                        _this.$logger.info("Applying changes...");
                        var platformSpecificLiveSyncService = _this.resolvePlatformSpecificLiveSyncService(platform, device, data.platformSpecificLiveSyncServices);
                        platformSpecificLiveSyncService.restartApplication(deviceAppData, localToDevicePaths).wait();
                        _this.$logger.info("Successfully synced application " + deviceAppData.appIdentifier + " at " + moment().format("ll LTS") + ".");
                    }
                }).future()();
            };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    UsbLiveSyncServiceBase.prototype.batchLiveSync = function (data, filePath) {
        var _this = this;
        if (!this.batch || !this.batch.syncPending) {
            this.batch = new SyncBatch(this.$logger, this.$dispatcher, function (filesToSync) {
                _this.preparePlatformForSync(data.platform);
                _this.syncCore(data, filesToSync, true).wait();
            });
        }
        this.$dispatcher.dispatch(function () { return (function () {
            var fileToSync = data.beforeBatchLiveSyncAction ? data.beforeBatchLiveSyncAction(filePath).wait() : filePath;
            if (fileToSync) {
                _this.batch.addFile(fileToSync);
            }
        }).future()(); });
    };
    UsbLiveSyncServiceBase.prototype.batchSimulatorLiveSync = function (data, filePath) {
        var _this = this;
        if (!this.batch || !this.batch.syncPending) {
            this.batch = new SyncBatch(this.$logger, this.$dispatcher, function (filesToSync) {
                _this.preparePlatformForSync(data.platform);
                _this.$iOSEmulatorServices.syncFiles(data.appIdentifier, data.projectFilesPath, filesToSync, data.notRunningiOSSimulatorAction, data.getApplicationPathForiOSSimulatorAction, data.iOSSimulatorRelativeToProjectBasePathAction);
            });
        }
        this.batch.addFile(filePath);
    };
    UsbLiveSyncServiceBase.prototype.preparePlatformForSync = function (platform) {
    };
    UsbLiveSyncServiceBase.prototype.isFileExcluded = function (path, exclusionList, projectDir) {
        return !!_.find(exclusionList, function (pattern) { return minimatch(path, pattern, { nocase: true }); });
    };
    UsbLiveSyncServiceBase.prototype.getProjectFileInfo = function (fileName, platform) {
        var parsed = this.parseFile(fileName, this.$mobileHelper.platformNames, platform || this.$devicesService.platform);
        if (!parsed) {
            parsed = this.parseFile(fileName, ["debug", "release"], "debug");
        }
        return parsed || {
            fileName: fileName,
            onDeviceName: fileName,
            shouldIncludeFile: true
        };
    };
    UsbLiveSyncServiceBase.prototype.parseFile = function (fileName, validValues, value) {
        var regex = util.format("^(.+?)[.](%s)([.].+?)$", validValues.join("|"));
        var parsed = fileName.match(new RegExp(regex, "i"));
        if (parsed) {
            return {
                fileName: fileName,
                onDeviceName: parsed[1] + parsed[3],
                shouldIncludeFile: parsed[2].toLowerCase() === value.toLowerCase(),
                value: value
            };
        }
        return undefined;
    };
    UsbLiveSyncServiceBase.prototype.resolvePlatformSpecificLiveSyncService = function (platform, device, platformSpecificLiveSyncServices) {
        return this.$injector.resolve(platformSpecificLiveSyncServices[platform.toLowerCase()], { _device: device });
    };
    return UsbLiveSyncServiceBase;
})();
exports.UsbLiveSyncServiceBase = UsbLiveSyncServiceBase;
$injector.register('usbLiveSyncServiceBase', UsbLiveSyncServiceBase);
