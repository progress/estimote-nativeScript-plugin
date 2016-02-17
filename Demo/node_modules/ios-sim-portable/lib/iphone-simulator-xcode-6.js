///<reference path="./.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var errors = require("./errors");
var options = require("./options");
var fs = require("fs");
var Future = require("fibers/future");
var path = require("path");
var util = require("util");
var $ = require("nodobjc");
var bplistParser = require("bplist-parser");
var osenv = require("osenv");
var iPhoneSimulatorBaseLib = require("./iphone-interop-simulator-base");
var XCode6Simulator = (function (_super) {
    __extends(XCode6Simulator, _super);
    function XCode6Simulator() {
        _super.call(this, this);
        this.cachedDevices = null;
    }
    XCode6Simulator.prototype.setSimulatedDevice = function (config) {
        var device = this.getDeviceByName().rawDevice;
        config("setDevice", device);
    };
    XCode6Simulator.prototype.getSimulatedDevice = function () {
        return this.getDeviceByName().rawDevice;
    };
    XCode6Simulator.prototype.getDevices = function () {
        var _this = this;
        return this.execute(function () { return _this.devices; }, { canRunMainLoop: false });
    };
    XCode6Simulator.prototype.getSdks = function () {
        var _this = this;
        return this.execute(function () { return _this.sdks; }, { canRunMainLoop: false });
    };
    XCode6Simulator.prototype.getApplicationPath = function (deviceId, applicationIdentifier) {
        var _this = this;
        return (function () {
            var rootApplicationsPath = path.join(osenv.home(), "/Library/Developer/CoreSimulator/Devices/" + deviceId + "/data/Containers/Bundle/Application");
            if (!fs.existsSync(rootApplicationsPath)) {
                rootApplicationsPath = path.join(osenv.home(), "/Library/Developer/CoreSimulator/Devices/" + deviceId + "/data/Applications");
            }
            var applicationGuids = fs.readdirSync(rootApplicationsPath);
            var result = null;
            _.each(applicationGuids, function (applicationGuid) {
                var fullApplicationPath = path.join(rootApplicationsPath, applicationGuid);
                var applicationDirContents = fs.readdirSync(fullApplicationPath);
                var applicationName = _.find(applicationDirContents, function (fileName) { return path.extname(fileName) === ".app"; });
                var plistFilePath = path.join(fullApplicationPath, applicationName, "Info.plist");
                var applicationData = _this.parseFile(plistFilePath).wait();
                if (applicationData[0].CFBundleIdentifier === applicationIdentifier) {
                    result = path.join(fullApplicationPath, applicationName);
                    return false;
                }
            });
            return result;
        }).future()();
    };
    XCode6Simulator.prototype.parseFile = function (plistFilePath) {
        var future = new Future();
        bplistParser.parseFile(plistFilePath, function (err, obj) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(obj);
            }
        });
        return future;
    };
    Object.defineProperty(XCode6Simulator.prototype, "devices", {
        get: function () {
            if (!this.cachedDevices) {
                this.cachedDevices = [];
                var deviceSet = $.classDefinition.getClassByName("SimDeviceSet")("defaultSet");
                var devices = deviceSet("availableDevices");
                var count = devices("count");
                if (count > 0) {
                    for (var index = 0; index < count; index++) {
                        var device = devices("objectAtIndex", index);
                        var deviceIdentifier = device("deviceType")("identifier").toString();
                        var deviceIdentifierPrefixIndex = deviceIdentifier.indexOf(XCode6Simulator.DEVICE_IDENTIFIER_PREFIX);
                        var deviceIdentifierWithoutPrefix = deviceIdentifier.substring(deviceIdentifierPrefixIndex + XCode6Simulator.DEVICE_IDENTIFIER_PREFIX.length + 1);
                        var runtimeVersion = device("runtime")("versionString").toString();
                        this.cachedDevices.push({
                            name: deviceIdentifierWithoutPrefix,
                            id: deviceIdentifierWithoutPrefix,
                            fullId: this.buildFullDeviceIdentifier(deviceIdentifier),
                            runtimeVersion: runtimeVersion,
                            rawDevice: device
                        });
                    }
                }
            }
            return this.cachedDevices;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(XCode6Simulator.prototype, "sdks", {
        get: function () {
            var systemRootClass = $.classDefinition.getClassByName("DTiPhoneSimulatorSystemRoot");
            var roots = systemRootClass("knownRoots");
            var count = roots("count");
            var sdks = [];
            for (var index = 0; index < count; index++) {
                var root = roots("objectAtIndex", index);
                var displayName = root("sdkDisplayName").toString();
                var version = root("sdkVersion").toString();
                var rootPath = root("sdkRootPath").toString();
                sdks.push({ displayName: displayName, version: version, rootPath: rootPath });
            }
            return sdks;
        },
        enumerable: true,
        configurable: true
    });
    XCode6Simulator.prototype.sendNotification = function (notification) {
        var _this = this;
        var action = function () {
            var device = _this.getSimulatedDevice();
            if (!device) {
                errors.fail("Could not find device.");
            }
            var result = device("postDarwinNotification", $(notification), "error", null);
            if (!result) {
                errors.fail("Could not send notification: " + notification);
            }
        };
        return this.execute(action, { canRunMainLoop: false });
    };
    Object.defineProperty(XCode6Simulator.prototype, "deviceName", {
        get: function () {
            return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
        },
        enumerable: true,
        configurable: true
    });
    XCode6Simulator.prototype.getDeviceByName = function () {
        var _this = this;
        var devices = this.getDevices().wait();
        var device = _.find(devices, function (device) { return device.name === _this.deviceName; });
        if (!device) {
            errors.fail("Unable to find device with name ", this.deviceName);
        }
        return device;
    };
    XCode6Simulator.prototype.buildFullDeviceIdentifier = function (deviceIdentifier) {
        return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
    };
    XCode6Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";
    return XCode6Simulator;
})(iPhoneSimulatorBaseLib.IPhoneInteropSimulatorBase);
exports.XCode6Simulator = XCode6Simulator;
//# sourceMappingURL=iphone-simulator-xcode-6.js.map