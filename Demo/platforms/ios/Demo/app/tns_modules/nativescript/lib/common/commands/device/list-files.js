///<reference path="../../.d.ts"/>
"use strict";
var ListFilesCommand = (function () {
    function ListFilesCommand($devicesService, $stringParameter, $options) {
        this.$devicesService = $devicesService;
        this.$stringParameter = $stringParameter;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter];
    }
    ListFilesCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            var action = function (device) { return (function () { return device.fileSystem.listFiles(args[0]).wait(); }).future()(); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return ListFilesCommand;
})();
exports.ListFilesCommand = ListFilesCommand;
$injector.registerCommand("device|list-files", ListFilesCommand);
