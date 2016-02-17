///<reference path="../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var Future = require("fibers/future");
var DeviceDiscovery = (function (_super) {
    __extends(DeviceDiscovery, _super);
    function DeviceDiscovery() {
        _super.apply(this, arguments);
        this.devices = {};
    }
    DeviceDiscovery.prototype.addDevice = function (device) {
        this.devices[device.deviceInfo.identifier] = device;
        this.raiseOnDeviceFound(device);
    };
    DeviceDiscovery.prototype.removeDevice = function (deviceIdentifier) {
        var device = this.devices[deviceIdentifier];
        if (!device) {
            return;
        }
        delete this.devices[deviceIdentifier];
        this.raiseOnDeviceLost(device);
    };
    DeviceDiscovery.prototype.startLookingForDevices = function () {
        return Future.fromResult();
    };
    DeviceDiscovery.prototype.checkForDevices = function () {
        return Future.fromResult();
    };
    DeviceDiscovery.prototype.raiseOnDeviceFound = function (device) {
        this.emit("deviceFound", device);
    };
    DeviceDiscovery.prototype.raiseOnDeviceLost = function (device) {
        this.emit("deviceLost", device);
    };
    return DeviceDiscovery;
})(events_1.EventEmitter);
exports.DeviceDiscovery = DeviceDiscovery;
$injector.register("deviceDiscovery", DeviceDiscovery);
