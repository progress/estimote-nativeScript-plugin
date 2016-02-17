///<reference path="../../.d.ts"/>
"use strict";
var net = require("net");
var ref = require("ref");
var path = require("path");
var util = require("util");
var ios_core_1 = require("./ios-core");
var iOSProxyServices = require("./ios-proxy-services");
var applicationManagerPath = require("./ios-application-manager");
var fileSystemPath = require("./ios-device-file-system");
var IOSDevice = (function () {
    function IOSDevice(devicePointer, $childProcess, $coreFoundation, $errors, $fs, $injector, $logger, $mobileDevice, $devicePlatformsConstants, $hostInfo, $options) {
        this.devicePointer = devicePointer;
        this.$childProcess = $childProcess;
        this.$coreFoundation = $coreFoundation;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$injector = $injector;
        this.$logger = $logger;
        this.$mobileDevice = $mobileDevice;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$hostInfo = $hostInfo;
        this.$options = $options;
        this.mountImageCallbackPtr = null;
        this.mountImageCallbackPtr = ios_core_1.CoreTypes.am_device_mount_image_callback.toPointer(IOSDevice.mountImageCallback);
        this.applicationManager = this.$injector.resolve(applicationManagerPath.IOSApplicationManager, { device: this, devicePointer: this.devicePointer });
        this.fileSystem = this.$injector.resolve(fileSystemPath.IOSDeviceFileSystem, { device: this, devicePointer: this.devicePointer });
        this.deviceInfo = {
            identifier: this.$coreFoundation.convertCFStringToCString(this.$mobileDevice.deviceCopyDeviceIdentifier(this.devicePointer)),
            displayName: this.getValue("ProductType"),
            model: this.getValue("ProductType"),
            version: this.getValue("ProductVersion"),
            vendor: "Apple",
            platform: this.$devicePlatformsConstants.iOS
        };
    }
    IOSDevice.mountImageCallback = function (dictionary, user) {
        var coreFoundation = $injector.resolve("coreFoundation");
        var logger = $injector.resolve("logger");
        var jsDictionary = coreFoundation.cfTypeTo(dictionary);
        logger.info("[Mounting] %s", jsDictionary["Status"]);
    };
    IOSDevice.prototype.getValue = function (value) {
        this.connect();
        this.startSession();
        try {
            var cfValue = this.$coreFoundation.createCFString(value);
            return this.$coreFoundation.convertCFStringToCString(this.$mobileDevice.deviceCopyValue(this.devicePointer, null, cfValue));
        }
        finally {
            this.stopSession();
            this.disconnect();
        }
    };
    IOSDevice.prototype.validateResult = function (result, error) {
        if (result !== 0) {
            this.$errors.fail(util.format("%s. Result code is: %s", error, result));
        }
    };
    IOSDevice.prototype.isPaired = function () {
        return this.$mobileDevice.deviceIsPaired(this.devicePointer) !== 0;
    };
    IOSDevice.prototype.pair = function () {
        var result = this.$mobileDevice.devicePair(this.devicePointer);
        this.validateResult(result, "If your phone is locked with a passcode, unlock then reconnect it");
        return result;
    };
    IOSDevice.prototype.validatePairing = function () {
        var result = this.$mobileDevice.deviceValidatePairing(this.devicePointer);
        this.validateResult(result, "Unable to validate pairing");
        return result;
    };
    IOSDevice.prototype.connect = function () {
        var result = this.$mobileDevice.deviceConnect(this.devicePointer);
        this.validateResult(result, "Unable to connect to device");
        if (!this.isPaired()) {
            this.pair();
        }
        return this.validatePairing();
    };
    IOSDevice.prototype.disconnect = function () {
        var result = this.$mobileDevice.deviceDisconnect(this.devicePointer);
        this.validateResult(result, "Unable to disconnect from device");
    };
    IOSDevice.prototype.startSession = function () {
        var result = this.$mobileDevice.deviceStartSession(this.devicePointer);
        this.validateResult(result, "Unable to start session");
    };
    IOSDevice.prototype.stopSession = function () {
        var result = this.$mobileDevice.deviceStopSession(this.devicePointer);
        this.validateResult(result, "Unable to stop session");
    };
    IOSDevice.prototype.getDeviceValue = function (value) {
        var deviceCopyValue = this.$mobileDevice.deviceCopyValue(this.devicePointer, null, this.$coreFoundation.createCFString(value));
        return this.$coreFoundation.convertCFStringToCString(deviceCopyValue);
    };
    IOSDevice.prototype.findDeveloperDirectory = function () {
        var _this = this;
        return (function () {
            var childProcess = _this.$childProcess.spawnFromEvent("xcode-select", ["-print-path"], "close").wait();
            return childProcess.stdout.trim();
        }).future()();
    };
    IOSDevice.prototype.tryExecuteFunction = function (func) {
        this.connect();
        try {
            this.startSession();
            try {
                return func.apply(this, []);
            }
            finally {
                this.stopSession();
            }
        }
        finally {
            this.disconnect();
        }
    };
    IOSDevice.prototype.findDeveloperDiskImageDirectoryPath = function () {
        var _this = this;
        return (function () {
            var developerDirectory = _this.findDeveloperDirectory().wait();
            var buildVersion = _this.getDeviceValue("BuildVersion");
            var productVersion = _this.getDeviceValue("ProductVersion");
            var productVersionParts = productVersion.split(".");
            var productMajorVersion = productVersionParts[0];
            var productMinorVersion = productVersionParts[1];
            var developerDiskImagePath = path.join(developerDirectory, "Platforms", "iPhoneOS.platform", "DeviceSupport");
            var supportPaths = _this.$fs.readDirectory(developerDiskImagePath).wait();
            var supportPath = null;
            _.each(supportPaths, function (sp) {
                var parts = sp.split(' ');
                var version = parts[0];
                var versionParts = version.split(".");
                var supportPathData = {
                    version: version,
                    majorVersion: versionParts[0],
                    minorVersion: versionParts[1],
                    build: parts.length > 1 ? parts[1].replace(/[()]/, function () { return ""; }) : null,
                    path: path.join(developerDiskImagePath, sp)
                };
                if (supportPathData.majorVersion === productMajorVersion) {
                    if (!supportPath) {
                        supportPath = supportPathData;
                    }
                    else {
                        if (supportPathData.minorVersion === productMinorVersion) {
                            if (supportPathData.build === buildVersion) {
                                supportPath = supportPathData;
                            }
                            else {
                                if (supportPath.build !== supportPathData.build || supportPath.build === null) {
                                    supportPath = supportPathData;
                                }
                            }
                        }
                    }
                }
            });
            if (!supportPath) {
                _this.$errors.fail("Unable to find device support path. Verify that you have installed sdk compatible with your device version.");
            }
            return supportPath.path;
        }).future()();
    };
    IOSDevice.prototype.mountImage = function () {
        var _this = this;
        return (function () {
            var imagePath = _this.$options.ddi;
            if (_this.$hostInfo.isWindows) {
                if (!imagePath) {
                    _this.$errors.fail("On windows operating system you must specify the path to developer disk image using --ddi option");
                }
                var imageSignature = _this.$fs.readFile(util.format("%s.signature", imagePath)).wait();
                var imageSize = _this.$fs.getFsStats(imagePath).wait().size;
                var imageMounterService = _this.startService(iOSProxyServices.MobileServices.MOBILE_IMAGE_MOUNTER);
                var plistService = _this.$injector.resolve(ios_core_1.PlistService, { service: imageMounterService, format: ios_core_1.CoreTypes.kCFPropertyListXMLFormat_v1_0 });
                var result = plistService.exchange({
                    Command: "ReceiveBytes",
                    ImageSize: imageSize,
                    ImageType: "Developer",
                    ImageSignature: imageSignature
                }).wait();
                if (result.Status === "ReceiveBytesAck") {
                    var fileData = _this.$fs.readFile(imagePath).wait();
                    plistService.sendAll(fileData);
                }
                else {
                    var afcService = _this.startService(iOSProxyServices.MobileServices.APPLE_FILE_CONNECTION);
                    var afcClient = _this.$injector.resolve(iOSProxyServices.AfcClient, { service: afcService });
                    afcClient.transfer(imagePath, "PublicStaging/staging.dimage").wait();
                }
                try {
                    result = plistService.exchange({
                        Command: "MountImage",
                        ImageType: "Developer",
                        ImageSignature: imageSignature,
                        ImagePath: "/let/mobile/Media/PublicStaging/staging.dimage"
                    }).wait();
                    if (result.Error) {
                        _this.$errors.fail("Unable to mount image. %s", result.Error);
                    }
                    if (result.Status) {
                        _this.$logger.info("Mount image: %s", result.Status);
                    }
                }
                finally {
                    plistService.close();
                }
            }
            else {
                var func = function () {
                    var developerDiskImageDirectoryPath = _this.findDeveloperDiskImageDirectoryPath().wait();
                    imagePath = path.join(developerDiskImageDirectoryPath, "DeveloperDiskImage.dmg");
                    _this.$logger.info("Mounting %s", imagePath);
                    var signature = _this.$fs.readFile(util.format("%s.signature", imagePath)).wait();
                    var cfImagePath = _this.$coreFoundation.createCFString(imagePath);
                    var cfOptions = _this.$coreFoundation.cfTypeFrom({
                        ImageType: "Developer",
                        ImageSignature: signature
                    });
                    var result = _this.$mobileDevice.deviceMountImage(_this.devicePointer, cfImagePath, cfOptions, _this.mountImageCallbackPtr);
                    if (result !== 0 && result !== IOSDevice.IMAGE_ALREADY_MOUNTED_ERROR_CODE) {
                        if (result === IOSDevice.INCOMPATIBLE_IMAGE_SIGNATURE_ERROR_CODE) {
                            _this.$logger.warn("Unable to mount image %s on device %s.", imagePath, _this.deviceInfo.identifier);
                        }
                        else {
                            _this.$errors.fail("Unable to mount image on device.");
                        }
                    }
                };
                _this.tryExecuteFunction(func);
            }
        }).future()();
    };
    IOSDevice.prototype.getInterfaceType = function () {
        return this.$mobileDevice.deviceGetInterfaceType(this.devicePointer);
    };
    IOSDevice.prototype.startService = function (serviceName) {
        var _this = this;
        var func = function () {
            var socket = ref.alloc("int");
            var result = _this.$mobileDevice.deviceStartService(_this.devicePointer, _this.$coreFoundation.createCFString(serviceName), socket);
            _this.validateResult(result, "Unable to start service " + serviceName);
            return ref.deref(socket);
        };
        return this.tryExecuteFunction(func);
    };
    IOSDevice.prototype.deploy = function (packageFile, packageName) {
        return this.applicationManager.reinstallApplication(packageName, packageFile);
    };
    IOSDevice.prototype.openDeviceLogStream = function () {
        var iOSSystemLog = this.$injector.resolve(iOSProxyServices.IOSSyslog, { device: this });
        iOSSystemLog.read();
    };
    IOSDevice.prototype.connectToPort = function (port) {
        var interfaceType = this.getInterfaceType();
        if (interfaceType === IOSDevice.INTERFACE_USB) {
            var connectionId = this.$mobileDevice.deviceGetConnectionId(this.devicePointer);
            var socketRef = ref.alloc(ios_core_1.CoreTypes.intType);
            this.$mobileDevice.uSBMuxConnectByPort(connectionId, this.htons(port), socketRef);
            var socketValue = socketRef.deref();
            var socket;
            if (socketValue < 0) {
                socket = new net.Socket();
                process.nextTick(function () { return socket.emit("error", new Error("USBMuxConnectByPort returned bad file descriptor")); });
            }
            else {
                socket = new net.Socket({ fd: socketValue });
                process.nextTick(function () { return socket.emit("connect"); });
            }
            return socket;
        }
        return null;
    };
    IOSDevice.prototype.htons = function (port) {
        var result = (port & 0xff00) >> 8 | (port & 0x00ff) << 8;
        return result;
    };
    IOSDevice.IMAGE_ALREADY_MOUNTED_ERROR_CODE = 3892314230;
    IOSDevice.INCOMPATIBLE_IMAGE_SIGNATURE_ERROR_CODE = 3892314163;
    IOSDevice.INTERFACE_USB = 1;
    return IOSDevice;
})();
exports.IOSDevice = IOSDevice;
$injector.register("iOSDevice", IOSDevice);
