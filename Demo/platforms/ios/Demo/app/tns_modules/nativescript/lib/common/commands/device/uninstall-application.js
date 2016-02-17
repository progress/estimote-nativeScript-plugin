///<reference path="../../.d.ts"/>
"use strict";
var UninstallApplicationCommand = (function () {
    function UninstallApplicationCommand($devicesService, $stringParameter, $options) {
        this.$devicesService = $devicesService;
        this.$stringParameter = $stringParameter;
        this.$options = $options;
        this.allowedParameters = [this.$stringParameter];
    }
    UninstallApplicationCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            var action = function (device) { return device.applicationManager.uninstallApplication(args[0]); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    return UninstallApplicationCommand;
})();
exports.UninstallApplicationCommand = UninstallApplicationCommand;
$injector.registerCommand("device|uninstall", UninstallApplicationCommand);
