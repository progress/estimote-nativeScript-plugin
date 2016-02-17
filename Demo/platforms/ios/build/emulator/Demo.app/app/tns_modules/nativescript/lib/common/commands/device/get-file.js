///<reference path="../../.d.ts"/>
"use strict";
var GetFileCommand = (function () {
    function GetFileCommand($devicesService, $stringParameter, $options) {
        this.$devicesService = $devicesService;
        this.$stringParameter = $stringParameter;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter];
    }
    GetFileCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            var action = function (device) { return (function () { return device.fileSystem.getFile(args[0]).wait(); }).future()(); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return GetFileCommand;
})();
exports.GetFileCommand = GetFileCommand;
$injector.registerCommand("device|get-file", GetFileCommand);
