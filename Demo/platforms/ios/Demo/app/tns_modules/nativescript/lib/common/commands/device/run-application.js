///<reference path="../../.d.ts"/>
"use strict";
var RunApplicationOnDeviceCommand = (function () {
    function RunApplicationOnDeviceCommand($devicesService, $errors, $stringParameter, $staticConfig, $options) {
        this.$devicesService = $devicesService;
        this.$errors = $errors;
        this.$stringParameter = $stringParameter;
        this.$staticConfig = $staticConfig;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter];
    }
    RunApplicationOnDeviceCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            if (_this.$devicesService.deviceCount > 1) {
                _this.$errors.failWithoutHelp("More than one device found. Specify device explicitly with --device option. To discover device ID, use $%s device command.", _this.$staticConfig.CLIENT_NAME.toLowerCase());
            }
            var action = function (device) { return device.applicationManager.startApplication(args[0]); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return RunApplicationOnDeviceCommand;
})();
exports.RunApplicationOnDeviceCommand = RunApplicationOnDeviceCommand;
$injector.registerCommand("device|run", RunApplicationOnDeviceCommand);
