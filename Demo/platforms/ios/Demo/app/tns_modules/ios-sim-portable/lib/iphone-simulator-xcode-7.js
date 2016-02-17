///<reference path="./.d.ts"/>
"use strict";
var childProcess = require("./child-process");
var errors = require("./errors");
var options = require("./options");
var path = require("path");
var simctl_1 = require("./simctl");
var utils = require("./utils");
var xcode = require("./xcode");
var $ = require("NodObjC");
var osenv = require("osenv");
var XCode7Simulator = (function () {
    function XCode7Simulator() {
        this.simctl = null;
        this.simctl = new simctl_1.Simctl();
    }
    XCode7Simulator.prototype.getDevices = function () {
        return this.simctl.getDevices();
    };
    XCode7Simulator.prototype.getSdks = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            return _.map(devices, function (device) {
                return {
                    displayName: "iOS " + device.runtimeVersion,
                    version: device.runtimeVersion
                };
            });
        }).future()();
    };
    XCode7Simulator.prototype.run = function (applicationPath, applicationIdentifier) {
        var _this = this;
        return (function () {
            var device = _this.getDeviceToRun().wait();
            var currentBootedDevice = _.find(_this.getDevices().wait(), function (device) { return _this.isDeviceBooted(device); });
            if (currentBootedDevice && (currentBootedDevice.name.toLowerCase() !== device.name.toLowerCase() || currentBootedDevice.runtimeVersion !== device.runtimeVersion)) {
                _this.killSimulator().wait();
            }
            if (!_this.isDeviceBooted(device)) {
                _this.startSimulator(device).wait();
                // startSimulaltor doesn't always finish immediately, and the subsequent
                // install fails since the simulator is not running.
                // Give it some time to start before we attempt installing.
                utils.sleep(1000);
            }
            _this.simctl.install(device.id, applicationPath).wait();
            var launchResult = _this.simctl.launch(device.id, applicationIdentifier).wait();
            if (options.logging) {
                var pid = launchResult.split(":")[1].trim();
                var logFilePath = path.join(osenv.home(), "Library", "Logs", "CoreSimulator", device.id, "system.log");
                var childProcess_1 = require("child_process").spawn("tail", ['-f', '-n', '1', logFilePath]);
                if (childProcess_1.stdout) {
                    childProcess_1.stdout.on("data", function (data) {
                        var dataAsString = data.toString();
                        if (dataAsString.indexOf("[" + pid + "]") > -1) {
                            console.log(dataAsString);
                        }
                    });
                }
                if (childProcess_1.stderr) {
                    childProcess_1.stderr.on("data", function (data) {
                        var dataAsString = data.toString();
                        if (dataAsString.indexOf("[" + pid + "]") > -1) {
                            console.error(dataAsString);
                        }
                    });
                }
            }
        }).future()();
    };
    XCode7Simulator.prototype.sendNotification = function (notification) {
        var _this = this;
        return (function () {
            var device = _this.getBootedDevice().wait();
            if (!device) {
                errors.fail("Could not find device.");
            }
            _this.simctl.notifyPost("booted", notification).wait();
        }).future()();
    };
    XCode7Simulator.prototype.getApplicationPath = function (deviceId, applicationIdentifier) {
        return this.simctl.getAppContainer(deviceId, applicationIdentifier);
    };
    XCode7Simulator.prototype.getDeviceToRun = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            var result = _.find(devices, function (device) {
                if (options.sdkVersion && !options.device) {
                    return device.runtimeVersion === options.sdkVersion;
                }
                if (options.device && !options.sdkVersion) {
                    return device.name === options.device;
                }
                if (options.device && options.sdkVersion) {
                    return device.runtimeVersion === options.sdkVersion && device.name === options.device;
                }
                if (!options.sdkVersion && !options.device) {
                    return _this.isDeviceBooted(device);
                }
            });
            if (!result) {
                result = _.find(devices, function (device) { return device.name === XCode7Simulator.DEFAULT_DEVICE_NAME; });
            }
            if (!result) {
                var sortedDevices = _.sortBy(devices, function (device) { return device.runtimeVersion; });
                result = _.last(sortedDevices);
            }
            return result;
        }).future()();
    };
    XCode7Simulator.prototype.isDeviceBooted = function (device) {
        return device.state === 'Booted';
    };
    XCode7Simulator.prototype.getBootedDevice = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            return _.find(devices, function (device) { return _this.isDeviceBooted(device); });
        }).future()();
    };
    XCode7Simulator.prototype.startSimulator = function (device) {
        return (function () {
            var simulatorPath = path.resolve(xcode.getPathFromXcodeSelect().wait(), "Applications", "Simulator.app");
            var args = [simulatorPath, '--args', '-CurrentDeviceUDID', device.id];
            childProcess.spawn("open", args).wait();
        }).future()();
    };
    XCode7Simulator.prototype.killSimulator = function () {
        return childProcess.spawn("pkill", ["-9", "-f", "Simulator"]);
    };
    XCode7Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    XCode7Simulator.DEFAULT_DEVICE_NAME = "iPhone 6";
    return XCode7Simulator;
})();
exports.XCode7Simulator = XCode7Simulator;
//# sourceMappingURL=iphone-simulator-xcode-7.js.map