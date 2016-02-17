///<reference path="../../.d.ts"/>
"use strict";
var ref = require("ref");
var path = require("path");
var iOSCore = require("./ios-core");
var helpers = require("../../helpers");
var plistlib = require("plistlib");
var MobileServices = (function () {
    function MobileServices() {
    }
    MobileServices.APPLE_FILE_CONNECTION = "com.apple.afc";
    MobileServices.INSTALLATION_PROXY = "com.apple.mobile.installation_proxy";
    MobileServices.HOUSE_ARREST = "com.apple.mobile.house_arrest";
    MobileServices.NOTIFICATION_PROXY = "com.apple.mobile.notification_proxy";
    MobileServices.SYSLOG = "com.apple.syslog_relay";
    MobileServices.MOBILE_IMAGE_MOUNTER = "com.apple.mobile.mobile_image_mounter";
    MobileServices.DEBUG_SERVER = "com.apple.debugserver";
    return MobileServices;
})();
exports.MobileServices = MobileServices;
var AfcFile = (function () {
    function AfcFile(path, mode, afcConnection, $mobileDevice, $errors) {
        this.afcConnection = afcConnection;
        this.$mobileDevice = $mobileDevice;
        this.$errors = $errors;
        this.open = false;
        var modeValue = 0;
        if (mode.indexOf("r") > -1) {
            modeValue = 0x1;
        }
        if (mode.indexOf("w") > -1) {
            modeValue = 0x2;
        }
        var afcFileRef = ref.alloc(ref.types.uint64);
        this.open = false;
        var result = this.$mobileDevice.afcFileRefOpen(this.afcConnection, path, modeValue, afcFileRef);
        if (result !== 0) {
            this.$errors.fail("Unable to open file reference: '%s' with path '%s", result, path);
        }
        this.afcFile = ref.deref(afcFileRef);
        if (this.afcFile === 0) {
            this.$errors.fail("Invalid file reference");
        }
        this.open = true;
    }
    AfcFile.prototype.read = function (len) {
        var readLengthRef = ref.alloc(iOSCore.CoreTypes.uintType, len);
        var data = new Buffer(len * iOSCore.CoreTypes.pointerSize);
        var result = this.$mobileDevice.afcFileRefRead(this.afcConnection, this.afcFile, data, readLengthRef);
        if (result !== 0) {
            this.$errors.fail("Unable to read data from file '%s'. Result is: '%s'", this.afcFile, result);
        }
        var readLength = readLengthRef.deref();
        return data.slice(0, readLength);
    };
    AfcFile.prototype.write = function (buffer, byteLength) {
        var result = this.$mobileDevice.afcFileRefWrite(this.afcConnection, this.afcFile, buffer, byteLength);
        if (result !== 0) {
            this.$errors.fail("Unable to write to file: '%s'. Result is: '%s'", this.afcFile, result);
        }
        return true;
    };
    AfcFile.prototype.close = function () {
        if (this.open) {
            var result = this.$mobileDevice.afcFileRefClose(this.afcConnection, this.afcFile);
            if (result !== 0) {
                this.$errors.fail("Unable to close afc file connection: '%s'. Result is: '%s'", this.afcFile, result);
            }
            this.open = false;
        }
    };
    Object.defineProperty(AfcFile.prototype, "writable", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    return AfcFile;
})();
exports.AfcFile = AfcFile;
var AfcClient = (function () {
    function AfcClient(service, $mobileDevice, $coreFoundation, $fs, $errors, $logger, $injector) {
        this.service = service;
        this.$mobileDevice = $mobileDevice;
        this.$coreFoundation = $coreFoundation;
        this.$fs = $fs;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$injector = $injector;
        this.afcConnection = null;
        var afcConnection = ref.alloc(ref.refType(ref.types.void));
        var result = $mobileDevice.afcConnectionOpen(this.service, 0, afcConnection);
        if (result !== 0) {
            $errors.fail("Unable to open apple file connection: %s", result);
        }
        this.afcConnection = ref.deref(afcConnection);
    }
    AfcClient.prototype.open = function (path, mode) {
        return this.$injector.resolve(AfcFile, { path: path, mode: mode, afcConnection: this.afcConnection });
    };
    AfcClient.prototype.mkdir = function (path) {
        var result = this.$mobileDevice.afcDirectoryCreate(this.afcConnection, path);
        if (result !== 0) {
            this.$errors.fail("Unable to make directory: %s. Result is %s", path, result);
        }
    };
    AfcClient.prototype.listDir = function (path) {
        var afcDirectoryRef = ref.alloc(ref.refType(ref.types.void));
        var result = this.$mobileDevice.afcDirectoryOpen(this.afcConnection, path, afcDirectoryRef);
        if (result !== 0) {
            this.$errors.fail("Unable to open AFC directory: '%s' %s ", path, result);
        }
        var afcDirectoryValue = ref.deref(afcDirectoryRef);
        var name = ref.alloc(ref.refType(ref.types.char));
        var entries = [];
        while (this.$mobileDevice.afcDirectoryRead(this.afcConnection, afcDirectoryValue, name) === 0) {
            var value = ref.deref(name);
            if (ref.address(value) === 0) {
                break;
            }
            var filePath = ref.readCString(value, 0);
            if (filePath !== "." && filePath !== "..") {
                entries.push(filePath);
            }
        }
        this.$mobileDevice.afcDirectoryClose(this.afcConnection, afcDirectoryValue);
        return entries;
    };
    AfcClient.prototype.close = function () {
        var result = this.$mobileDevice.afcConnectionClose(this.afcConnection);
        if (result !== 0) {
            this.$errors.failWithoutHelp("Unable to close apple file connection: " + result);
        }
    };
    AfcClient.prototype.transferPackage = function (localFilePath, devicePath) {
        var _this = this;
        return (function () {
            _this.transfer(localFilePath, devicePath).wait();
        }).future()();
    };
    AfcClient.prototype.deleteFile = function (devicePath) {
        var removeResult = this.$mobileDevice.afcRemovePath(this.afcConnection, devicePath);
        this.$logger.trace("Removing device file '%s', result: %s", devicePath, removeResult.toString());
    };
    AfcClient.prototype.transfer = function (localFilePath, devicePath) {
        var _this = this;
        return (function () {
            _this.ensureDevicePathExist(path.dirname(devicePath));
            var reader = _this.$fs.createReadStream(localFilePath);
            devicePath = helpers.fromWindowsRelativePathToUnix(devicePath);
            _this.deleteFile(devicePath);
            var target = _this.open(devicePath, "w");
            var localFilePathSize = _this.$fs.getFileSize(localFilePath).wait();
            reader.on("data", function (data) {
                target.write(data, data.length);
                _this.$logger.trace("transfer-> localFilePath: '%s', devicePath: '%s', localFilePathSize: '%s', transferred bytes: '%s'", localFilePath, devicePath, localFilePathSize.toString(), data.length.toString());
            })
                .on("error", function (error) {
                _this.$errors.fail(error);
            })
                .on("end", function () { return target.close(); });
            _this.$fs.futureFromEvent(reader, "close").wait();
        }).future()();
    };
    AfcClient.prototype.ensureDevicePathExist = function (deviceDirPath) {
        var _this = this;
        var filePathParts = deviceDirPath.split(path.sep);
        var currentDevicePath = "";
        filePathParts.forEach(function (filePathPart) {
            if (filePathPart !== "") {
                currentDevicePath = helpers.fromWindowsRelativePathToUnix(path.join(currentDevicePath, filePathPart));
                _this.mkdir(currentDevicePath);
            }
        });
    };
    return AfcClient;
})();
exports.AfcClient = AfcClient;
var InstallationProxyClient = (function () {
    function InstallationProxyClient(device, $logger, $injector) {
        this.device = device;
        this.$logger = $logger;
        this.$injector = $injector;
        this.plistService = null;
    }
    InstallationProxyClient.prototype.deployApplication = function (packageFile) {
        var _this = this;
        return (function () {
            var service = _this.device.startService(MobileServices.APPLE_FILE_CONNECTION);
            var afcClient = _this.$injector.resolve(AfcClient, { service: service });
            var devicePath = path.join("PublicStaging", path.basename(packageFile));
            afcClient.transferPackage(packageFile, devicePath).wait();
            _this.plistService = _this.$injector.resolve(iOSCore.PlistService, { service: _this.device.startService(MobileServices.INSTALLATION_PROXY), format: iOSCore.CoreTypes.kCFPropertyListBinaryFormat_v1_0 });
            _this.plistService.sendMessage({
                Command: "Install",
                PackagePath: helpers.fromWindowsRelativePathToUnix(devicePath)
            });
            _this.plistService.receiveMessage().wait();
            _this.$logger.info("Successfully deployed on device %s", _this.device.deviceInfo.identifier);
        }).future()();
    };
    InstallationProxyClient.prototype.closeSocket = function () {
        return this.plistService.close();
    };
    return InstallationProxyClient;
})();
exports.InstallationProxyClient = InstallationProxyClient;
$injector.register("installationProxyClient", InstallationProxyClient);
var NotificationProxyClient = (function () {
    function NotificationProxyClient(device, $injector) {
        this.device = device;
        this.$injector = $injector;
        this.plistService = null;
        this.observers = {};
        this.buffer = "";
    }
    NotificationProxyClient.prototype.postNotification = function (notificationName) {
        this.plistService = this.$injector.resolve(iOSCore.PlistService, { service: this.device.startService(MobileServices.NOTIFICATION_PROXY), format: iOSCore.CoreTypes.kCFPropertyListBinaryFormat_v1_0 });
        this.postNotificationCore(notificationName);
    };
    NotificationProxyClient.prototype.postNotificationAndAttachForData = function (notificationName) {
        this.openSocket();
        this.postNotificationCore(notificationName);
    };
    NotificationProxyClient.prototype.addObserver = function (name, callback) {
        this.openSocket();
        var result = this.plistService.sendMessage({
            "Command": "ObserveNotification",
            "Name": name
        });
        var array = this.observers[name];
        if (!array) {
            array = new Array();
            this.observers[name] = array;
        }
        array.push(callback);
        return result;
    };
    NotificationProxyClient.prototype.removeObserver = function (name, callback) {
        var array = this.observers[name];
        if (array) {
            var index = array.indexOf(callback);
            if (index !== -1) {
                array.splice(index, 1);
            }
        }
    };
    NotificationProxyClient.prototype.openSocket = function () {
        if (!this.plistService) {
            this.plistService = this.$injector.resolve(iOSCore.PlistService, { service: this.device.startService(MobileServices.NOTIFICATION_PROXY), format: iOSCore.CoreTypes.kCFPropertyListBinaryFormat_v1_0 });
            if (this.plistService.receiveAll) {
                this.plistService.receiveAll(this.handleData.bind(this));
            }
        }
    };
    NotificationProxyClient.prototype.handleData = function (data) {
        var _this = this;
        this.buffer += data.toString();
        var PLIST_HEAD = "<plist";
        var PLIST_TAIL = "</plist>";
        var start = this.buffer.indexOf(PLIST_HEAD);
        var end = this.buffer.indexOf(PLIST_TAIL);
        while (start >= 0 && end >= 0) {
            var plist = this.buffer.substr(start, end + PLIST_TAIL.length);
            this.buffer = this.buffer.substr(end + PLIST_TAIL.length);
            plistlib.loadString(plist, function (err, plist) {
                if (!err && plist) {
                    _this.handlePlistNotification(plist);
                }
            });
            start = this.buffer.indexOf("<plist");
            end = this.buffer.indexOf("</plist>");
        }
    };
    NotificationProxyClient.prototype.postNotificationCore = function (notificationName) {
        this.plistService.sendMessage({
            "Command": "PostNotification",
            "Name": notificationName,
            "ClientOptions": ""
        });
    };
    NotificationProxyClient.prototype.closeSocket = function () {
        this.plistService.close();
    };
    NotificationProxyClient.prototype.handlePlistNotification = function (plist) {
        if (plist.type !== "dict") {
            return;
        }
        var value = plist.value;
        if (!value) {
            return;
        }
        var command = value["Command"];
        var name = value["Name"];
        if (command.type !== "string" || command.value !== "RelayNotification" || name.type !== "string") {
            return;
        }
        var notification = name.value;
        var observers = this.observers[notification];
        if (!observers) {
            return;
        }
        observers.forEach(function (observer) { return observer(notification); });
    };
    return NotificationProxyClient;
})();
exports.NotificationProxyClient = NotificationProxyClient;
var HouseArrestClient = (function () {
    function HouseArrestClient(device, $injector, $errors) {
        this.device = device;
        this.$injector = $injector;
        this.$errors = $errors;
        this.plistService = null;
    }
    HouseArrestClient.prototype.getAfcClientCore = function (command, applicationIdentifier) {
        var service = this.device.startService(MobileServices.HOUSE_ARREST);
        this.plistService = this.$injector.resolve(iOSCore.PlistService, { service: service, format: iOSCore.CoreTypes.kCFPropertyListXMLFormat_v1_0 });
        this.plistService.sendMessage({
            "Command": command,
            "Identifier": applicationIdentifier
        });
        var response = this.plistService.receiveMessage().wait();
        if (response.Error) {
            this.$errors.failWithoutHelp(HouseArrestClient.PREDEFINED_ERRORS[response.Error] || response.Error);
        }
        return this.$injector.resolve(AfcClient, { service: service });
    };
    HouseArrestClient.prototype.getAfcClientForAppContainer = function (applicationIdentifier) {
        return this.getAfcClientCore("VendContainer", applicationIdentifier);
    };
    HouseArrestClient.prototype.closeSocket = function () {
        this.plistService.close();
    };
    HouseArrestClient.PREDEFINED_ERRORS = {
        ApplicationLookupFailed: "Unable to find the application on a connected device. Ensure that the application is installed and try again."
    };
    return HouseArrestClient;
})();
exports.HouseArrestClient = HouseArrestClient;
var IOSSyslog = (function () {
    function IOSSyslog(device, $logger, $injector, $deviceLogProvider, $devicePlatformsConstants) {
        this.device = device;
        this.$logger = $logger;
        this.$injector = $injector;
        this.$deviceLogProvider = $deviceLogProvider;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.plistService = this.$injector.resolve(iOSCore.PlistService, { service: this.device.startService(MobileServices.SYSLOG), format: undefined });
    }
    IOSSyslog.prototype.read = function () {
        var _this = this;
        var printData = function (data) {
            _this.$deviceLogProvider.logData(data, _this.$devicePlatformsConstants.iOS, _this.device.deviceInfo.identifier);
        };
        this.plistService.readSystemLog(printData);
    };
    return IOSSyslog;
})();
exports.IOSSyslog = IOSSyslog;
