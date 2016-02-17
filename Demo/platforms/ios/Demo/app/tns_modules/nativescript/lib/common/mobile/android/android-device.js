///<reference path="../../.d.ts"/>
"use strict";
var androidDebugBridgePath = require("./android-debug-bridge");
var applicationManagerPath = require("./android-application-manager");
var fileSystemPath = require("./android-device-file-system");
var AndroidDevice = (function () {
    function AndroidDevice(identifier, $logger, $fs, $childProcess, $errors, $staticConfig, $devicePlatformsConstants, $options, $logcatHelper, $hostInfo, $mobileHelper, $injector) {
        this.identifier = identifier;
        this.$logger = $logger;
        this.$fs = $fs;
        this.$childProcess = $childProcess;
        this.$errors = $errors;
        this.$staticConfig = $staticConfig;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$options = $options;
        this.$logcatHelper = $logcatHelper;
        this.$hostInfo = $hostInfo;
        this.$mobileHelper = $mobileHelper;
        this.$injector = $injector;
        this.adb = this.$injector.resolve(androidDebugBridgePath.AndroidDebugBridge, { identifier: this.identifier });
        this.applicationManager = this.$injector.resolve(applicationManagerPath.AndroidApplicationManager, { adb: this.adb, identifier: this.identifier });
        this.fileSystem = this.$injector.resolve(fileSystemPath.AndroidDeviceFileSystem, { adb: this.adb, identifier: this.identifier });
        var details;
        try {
            details = this.getDeviceDetails(["getprop"]).wait();
        }
        catch (err) {
            this.$logger.trace("Error while calling getprop: " + err.message);
        }
        if (!details || !details.name) {
            details = this.getDeviceDetails(["cat", "/system/build.prop"]).wait();
        }
        this.deviceInfo = {
            identifier: this.identifier,
            displayName: details.name,
            model: details.model,
            version: details.release,
            vendor: details.brand,
            platform: this.$devicePlatformsConstants.Android
        };
    }
    AndroidDevice.prototype.deploy = function (packageFile, packageName) {
        var _this = this;
        return (function () {
            _this.applicationManager.reinstallApplication(packageName, packageFile).wait();
            _this.$logger.info("Successfully deployed on device with identifier '" + _this.identifier + "'.");
        }).future()();
    };
    AndroidDevice.prototype.openDeviceLogStream = function () {
        this.$logcatHelper.start(this.identifier);
    };
    AndroidDevice.prototype.getDeviceDetails = function (shellCommandArgs) {
        var _this = this;
        return (function () {
            var details = _this.adb.executeShellCommand(shellCommandArgs).wait();
            var parsedDetails = {};
            details.split(/\r?\n|\r/).forEach(function (value) {
                var match = /(?:\[?ro\.build\.version|ro\.product)\.(.+?)]?(?:\:|=)(?:\s*?\[)?(.*?)]?$/.exec(value);
                if (match) {
                    parsedDetails[match[1]] = match[2];
                }
            });
            _this.$logger.trace(parsedDetails);
            return parsedDetails;
        }).future()();
    };
    return AndroidDevice;
})();
exports.AndroidDevice = AndroidDevice;
