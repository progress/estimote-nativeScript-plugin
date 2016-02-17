///<reference path="./../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var device_discovery_1 = require("./device-discovery");
var helpers = require("../../helpers");
var android_device_1 = require("../android/android-device");
var os_1 = require("os");
var Future = require("fibers/future");
var fiberBootstrap = require("../../fiber-bootstrap");
var AndroidDeviceDiscovery = (function (_super) {
    __extends(AndroidDeviceDiscovery, _super);
    function AndroidDeviceDiscovery($childProcess, $injector, $staticConfig) {
        _super.call(this);
        this.$childProcess = $childProcess;
        this.$injector = $injector;
        this.$staticConfig = $staticConfig;
        this._devices = [];
        this.ensureAdbServerStarted().wait();
    }
    Object.defineProperty(AndroidDeviceDiscovery.prototype, "pathToAdb", {
        get: function () {
            if (!this._pathToAdb) {
                this._pathToAdb = this.$staticConfig.getAdbFilePath().wait();
            }
            return this._pathToAdb;
        },
        enumerable: true,
        configurable: true
    });
    AndroidDeviceDiscovery.prototype.createAndAddDevice = function (deviceIdentifier) {
        this._devices.push(deviceIdentifier);
        var device = this.$injector.resolve(android_device_1.AndroidDevice, { identifier: deviceIdentifier });
        this.addDevice(device);
    };
    AndroidDeviceDiscovery.prototype.deleteAndRemoveDevice = function (deviceIdentifier) {
        _.remove(this._devices, function (d) { return d === deviceIdentifier; });
        this.removeDevice(deviceIdentifier);
    };
    AndroidDeviceDiscovery.prototype.startLookingForDevices = function () {
        var blockingFuture = new Future();
        return this.checkForDevices(blockingFuture);
    };
    AndroidDeviceDiscovery.prototype.checkForDevices = function (future) {
        var _this = this;
        var result = this.$childProcess.spawn(this.pathToAdb, ["devices"], { stdio: 'pipe' });
        result.stdout.on("data", function (data) {
            fiberBootstrap.run(function () {
                _this.checkCurrentData(data).wait();
                if (future) {
                    future.return();
                }
            });
        });
        result.stderr.on("data", function (data) {
            var error = new Error(data.toString());
            if (future) {
                return future.throw(error);
            }
            else {
                throw (error);
            }
        });
        result.on("error", function (err) {
            if (future) {
                return future.throw(err);
            }
            else {
                throw (err);
            }
        });
        return future || Future.fromResult();
    };
    AndroidDeviceDiscovery.prototype.checkCurrentData = function (result) {
        var _this = this;
        return (function () {
            var currentDevices = result.toString().split(os_1.EOL).slice(1)
                .filter(function (element) { return !helpers.isNullOrWhitespace(element); })
                .map(function (element) {
                var _a = element.split('\t'), identifier = _a[0], state = _a[1];
                if (state === "device") {
                    return identifier;
                }
            });
            var oldDevices = _.difference(_this._devices, currentDevices), newDevices = _.difference(currentDevices, _this._devices);
            _.each(newDevices, function (d) { return _this.createAndAddDevice(d); });
            _.each(oldDevices, function (d) { return _this.deleteAndRemoveDevice(d); });
        }).future()();
    };
    AndroidDeviceDiscovery.prototype.ensureAdbServerStarted = function () {
        return this.$childProcess.spawnFromEvent(this.$staticConfig.getAdbFilePath().wait(), ["start-server"], "close");
    };
    return AndroidDeviceDiscovery;
})(device_discovery_1.DeviceDiscovery);
exports.AndroidDeviceDiscovery = AndroidDeviceDiscovery;
$injector.register("androidDeviceDiscovery", AndroidDeviceDiscovery);
