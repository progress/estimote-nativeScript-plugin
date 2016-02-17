///<reference path="../.d.ts"/>
"use strict";
var DeployOnDeviceCommand = (function () {
    function DeployOnDeviceCommand($platformService, $platformCommandParameter, $options, $errors) {
        this.$platformService = $platformService;
        this.$platformCommandParameter = $platformCommandParameter;
        this.$options = $options;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    DeployOnDeviceCommand.prototype.execute = function (args) {
        var config = this.$options.staticBindings ? { runSbGenerator: true } : undefined;
        return this.$platformService.deployOnDevice(args[0], config);
    };
    DeployOnDeviceCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$options.release && (!_this.$options.keyStorePath || !_this.$options.keyStorePassword || !_this.$options.keyStoreAlias || !_this.$options.keyStoreAliasPassword)) {
                _this.$errors.fail("When producing a release build, you need to specify all --key-store-* options.");
            }
            var res = (args.length === 1) && _this.$platformCommandParameter.validate(args[0]).wait();
            return res;
        }).future()();
    };
    return DeployOnDeviceCommand;
})();
exports.DeployOnDeviceCommand = DeployOnDeviceCommand;
$injector.registerCommand("deploy", DeployOnDeviceCommand);
