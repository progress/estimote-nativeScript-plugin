///<reference path="../../.d.ts"/>
"use strict";
var StopApplicationOnDeviceCommand = (function () {
    function StopApplicationOnDeviceCommand($devicesService, $errors, $stringParameter, $staticConfig, $options) {
        this.$devicesService = $devicesService;
        this.$errors = $errors;
        this.$stringParameter = $stringParameter;
        this.$staticConfig = $staticConfig;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter, this.$stringParameter];
    }
    StopApplicationOnDeviceCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true, platform: args[1] }).wait();
            var action = function (device) { return device.applicationManager.stopApplication(args[0]); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return StopApplicationOnDeviceCommand;
})();
exports.StopApplicationOnDeviceCommand = StopApplicationOnDeviceCommand;
$injector.registerCommand("device|stop", StopApplicationOnDeviceCommand);
