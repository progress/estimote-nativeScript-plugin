///<reference path="../../.d.ts"/>
"use strict";
var iOSProxyServices = require("./ios-proxy-services");
var path = require("path");
var ref = require("ref");
var util = require("util");
var IOSDeviceFileSystem = (function () {
    function IOSDeviceFileSystem(device, devicePointer, $coreFoundation, $errors, $fs, $injector, $logger, $mobileDevice, $options) {
        this.device = device;
        this.devicePointer = devicePointer;
        this.$coreFoundation = $coreFoundation;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$injector = $injector;
        this.$logger = $logger;
        this.$mobileDevice = $mobileDevice;
        this.$options = $options;
    }
    IOSDeviceFileSystem.prototype.listFiles = function (devicePath) {
        var _this = this;
        return (function () {
            if (!devicePath) {
                devicePath = ".";
            }
            _this.$logger.info("Listing %s", devicePath);
            var afcClient = _this.resolveAfc();
            var walk = function (root, indent) {
                _this.$logger.info(util.format("%s %s", Array(indent).join(" "), root));
                var children = [];
                try {
                    children = afcClient.listDir(root);
                }
                catch (e) {
                    children = [];
                }
                _.each(children, function (child) {
                    walk(root + "/" + child, indent + 1);
                });
            };
            walk(devicePath, 0);
        }).future()();
    };
    IOSDeviceFileSystem.prototype.getFile = function (deviceFilePath) {
        var _this = this;
        return (function () {
            var afcClient = _this.resolveAfc();
            var fileToRead = afcClient.open(deviceFilePath, "r");
            var fileToWrite = _this.$options.file ? _this.$fs.createWriteStream(_this.$options.file) : process.stdout;
            var dataSizeToRead = 8192;
            var size = 0;
            while (true) {
                var data = fileToRead.read(dataSizeToRead);
                if (!data || data.length === 0) {
                    break;
                }
                fileToWrite.write(data);
                size += data.length;
            }
            fileToRead.close();
            _this.$logger.trace("%s bytes read from %s", size.toString(), deviceFilePath);
        }).future()();
    };
    IOSDeviceFileSystem.prototype.putFile = function (localFilePath, deviceFilePath) {
        var afcClient = this.resolveAfc();
        return afcClient.transfer(path.resolve(localFilePath), deviceFilePath);
    };
    IOSDeviceFileSystem.prototype.deleteFile = function (deviceFilePath, appIdentifier) {
        var houseArrestClient = this.$injector.resolve(iOSProxyServices.HouseArrestClient, { device: this.device });
        var afcClientForContainer = houseArrestClient.getAfcClientForAppContainer(appIdentifier);
        afcClientForContainer.deleteFile(deviceFilePath);
        houseArrestClient.closeSocket();
    };
    IOSDeviceFileSystem.prototype.transferFiles = function (appIdentifier, localToDevicePaths) {
        var _this = this;
        return (function () {
            var houseArrestClient = _this.$injector.resolve(iOSProxyServices.HouseArrestClient, { device: _this.device });
            var afcClientForAppContainer = houseArrestClient.getAfcClientForAppContainer(appIdentifier);
            _.each(localToDevicePaths, function (localToDevicePathData) {
                var stats = _this.$fs.getFsStats(localToDevicePathData.getLocalPath()).wait();
                if (stats.isFile()) {
                    afcClientForAppContainer.transfer(localToDevicePathData.getLocalPath(), localToDevicePathData.getDevicePath()).wait();
                }
            });
            houseArrestClient.closeSocket();
        }).future()();
    };
    IOSDeviceFileSystem.prototype.transferDirectory = function (deviceAppData, localToDevicePaths, projectFilesPath) {
        return this.transferFiles(deviceAppData.appIdentifier, localToDevicePaths);
    };
    IOSDeviceFileSystem.prototype.resolveAfc = function () {
        var service = this.$options.app ? this.startHouseArrestService(this.$options.app) : this.device.startService(iOSProxyServices.MobileServices.APPLE_FILE_CONNECTION);
        var afcClient = this.$injector.resolve(iOSProxyServices.AfcClient, { service: service });
        return afcClient;
    };
    IOSDeviceFileSystem.prototype.startHouseArrestService = function (bundleId) {
        var _this = this;
        var func = function () {
            var fdRef = ref.alloc("int");
            var result = _this.$mobileDevice.deviceStartHouseArrestService(_this.devicePointer, _this.$coreFoundation.createCFString(bundleId), null, fdRef);
            var fd = fdRef.deref();
            if (result !== 0) {
                _this.$errors.fail("AMDeviceStartHouseArrestService returned %s", result);
            }
            return fd;
        };
        return this.device.tryExecuteFunction(func);
    };
    return IOSDeviceFileSystem;
})();
exports.IOSDeviceFileSystem = IOSDeviceFileSystem;
