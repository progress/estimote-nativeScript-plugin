///<reference path="../.d.ts"/>
"use strict";
var AddPlatformCommand = (function () {
    function AddPlatformCommand($platformService, $errors) {
        this.$platformService = $platformService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    AddPlatformCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$platformService.addPlatforms(args).wait();
        }).future()();
    };
    AddPlatformCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (!args || args.length === 0) {
                _this.$errors.fail("No platform specified. Please specify a platform to add");
            }
            _.each(args, function (arg) { return _this.$platformService.validatePlatform(arg); });
            return true;
        }).future()();
    };
    return AddPlatformCommand;
})();
exports.AddPlatformCommand = AddPlatformCommand;
$injector.registerCommand("platform|add", AddPlatformCommand);
