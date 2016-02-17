///<reference path="../../.d.ts"/>
"use strict";
var OpenDeviceLogStreamCommand = (function () {
    function OpenDeviceLogStreamCommand($devicesService, $errors, $commandsService, $options) {
        this.$devicesService = $devicesService;
        this.$errors = $errors;
        this.$commandsService = $commandsService;
        this.$options = $options;
        this.allowedParameters = [];
    }
    OpenDeviceLogStreamCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            if (_this.$devicesService.deviceCount > 1) {
                _this.$commandsService.tryExecuteCommand("device", []).wait();
                _this.$errors.fail(OpenDeviceLogStreamCommand.NOT_SPECIFIED_DEVICE_ERROR_MESSAGE);
            }
            var action = function (device) { return (function () { return device.openDeviceLogStream(); }).future()(); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    OpenDeviceLogStreamCommand.NOT_SPECIFIED_DEVICE_ERROR_MESSAGE = "More than one device found. Specify device explicitly.";
    return OpenDeviceLogStreamCommand;
})();
exports.OpenDeviceLogStreamCommand = OpenDeviceLogStreamCommand;
$injector.registerCommand("device|log", OpenDeviceLogStreamCommand);
