///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var fiberBootstrap = require("../fiber-bootstrap");
var DeviceEmitter = (function (_super) {
    __extends(DeviceEmitter, _super);
    function DeviceEmitter($androidDeviceDiscovery, $iOSDeviceDiscovery, $devicesService, $deviceLogProvider) {
        _super.call(this);
        this.$androidDeviceDiscovery = $androidDeviceDiscovery;
        this.$iOSDeviceDiscovery = $iOSDeviceDiscovery;
        this.$devicesService = $devicesService;
        this.$deviceLogProvider = $deviceLogProvider;
    }
    DeviceEmitter.prototype.initialize = function () {
        var _this = this;
        return (function () {
            _this.$androidDeviceDiscovery.ensureAdbServerStarted().wait();
            _this.$androidDeviceDiscovery.on("deviceFound", function (data) {
                _this.emit("deviceFound", data.deviceInfo);
                data.openDeviceLogStream();
            });
            _this.$androidDeviceDiscovery.on("deviceLost", function (data) {
                _this.emit("deviceLost", data.deviceInfo);
            });
            _this.$iOSDeviceDiscovery.on("deviceFound", function (data) {
                _this.emit("deviceFound", data.deviceInfo);
                data.openDeviceLogStream();
            });
            _this.$iOSDeviceDiscovery.on("deviceLost", function (data) {
                _this.emit("deviceLost", data.deviceInfo);
            });
            fiberBootstrap.run(function () {
                _this.$devicesService.initialize({ skipInferPlatform: true }).wait();
            });
            _this.$deviceLogProvider.on("data", function (identifier, data) {
                _this.emit('deviceLogData', identifier, data.toString());
            });
        }).future()();
    };
    return DeviceEmitter;
})(events_1.EventEmitter);
$injector.register("deviceEmitter", DeviceEmitter);
