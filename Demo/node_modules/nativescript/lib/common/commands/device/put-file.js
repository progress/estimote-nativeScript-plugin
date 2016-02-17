///<reference path="../../.d.ts"/>
"use strict";
var PutFileCommand = (function () {
    function PutFileCommand($devicesService, $stringParameter, $options) {
        this.$devicesService = $devicesService;
        this.$stringParameter = $stringParameter;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter, this.$stringParameter];
    }
    PutFileCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            var action = function (device) { return (function () { return device.fileSystem.putFile(args[0], args[1]).wait(); }).future()(); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return PutFileCommand;
})();
exports.PutFileCommand = PutFileCommand;
$injector.registerCommand("device|put-file", PutFileCommand);
