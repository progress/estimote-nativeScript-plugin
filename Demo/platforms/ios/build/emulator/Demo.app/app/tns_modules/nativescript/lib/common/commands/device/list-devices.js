///<reference path="../../.d.ts"/>
"use strict";
var helpers_1 = require("../../helpers");
var ListDevicesCommand = (function () {
    function ListDevicesCommand($devicesService, $logger, $stringParameter, $options) {
        this.$devicesService = $devicesService;
        this.$logger = $logger;
        this.$stringParameter = $stringParameter;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter];
    }
    ListDevicesCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var index = 1;
            _this.$devicesService.initialize({ platform: args[0], deviceId: null, skipInferPlatform: true }).wait();
            var table = helpers_1.createTable(["#", "Device Name", "Platform", "Device Identifier"], []);
            var action;
            if (_this.$options.json) {
                _this.$logger.setLevel("ERROR");
                action = function (device) {
                    return (function () {
                        _this.$logger.out(JSON.stringify(device.deviceInfo));
                    }).future()();
                };
            }
            else {
                action = function (device) {
                    return (function () {
                        table.push([(index++).toString(), device.deviceInfo.displayName || '', device.deviceInfo.platform || '', device.deviceInfo.identifier || '']);
                    }).future()();
                };
            }
            _this.$devicesService.execute(action, undefined, { allowNoDevices: true }).wait();
            if (!_this.$options.json && table.length) {
                _this.$logger.out(table.toString());
            }
        }).future()();
    };
    return ListDevicesCommand;
})();
exports.ListDevicesCommand = ListDevicesCommand;
$injector.registerCommand("device|*list", ListDevicesCommand);
var ListAndroidDevicesCommand = (function () {
    function ListAndroidDevicesCommand($injector, $devicePlatformsConstants) {
        this.$injector = $injector;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.allowedParameters = [];
    }
    ListAndroidDevicesCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var listDevicesCommand = _this.$injector.resolve(ListDevicesCommand);
            var platform = _this.$devicePlatformsConstants.Android;
            listDevicesCommand.execute([platform]).wait();
        }).future()();
    };
    return ListAndroidDevicesCommand;
})();
$injector.registerCommand("device|android", ListAndroidDevicesCommand);
var ListiOSDevicesCommand = (function () {
    function ListiOSDevicesCommand($injector, $devicePlatformsConstants) {
        this.$injector = $injector;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.allowedParameters = [];
    }
    ListiOSDevicesCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var listDevicesCommand = _this.$injector.resolve(ListDevicesCommand);
            var platform = _this.$devicePlatformsConstants.iOS;
            listDevicesCommand.execute([platform]).wait();
        }).future()();
    };
    return ListiOSDevicesCommand;
})();
$injector.registerCommand("device|ios", ListiOSDevicesCommand);
