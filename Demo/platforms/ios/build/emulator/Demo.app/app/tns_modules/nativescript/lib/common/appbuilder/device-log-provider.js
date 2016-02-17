///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var DeviceLogProvider = (function (_super) {
    __extends(DeviceLogProvider, _super);
    function DeviceLogProvider() {
        _super.apply(this, arguments);
    }
    DeviceLogProvider.prototype.logData = function (line, platform, deviceIdentifier) {
        this.emit('data', deviceIdentifier, line);
    };
    return DeviceLogProvider;
})(events_1.EventEmitter);
exports.DeviceLogProvider = DeviceLogProvider;
$injector.register("deviceLogProvider", DeviceLogProvider);
