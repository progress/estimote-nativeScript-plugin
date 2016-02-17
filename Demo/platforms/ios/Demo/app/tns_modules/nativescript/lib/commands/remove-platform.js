///<reference path="../.d.ts"/>
"use strict";
var RemovePlatformCommand = (function () {
    function RemovePlatformCommand($platformService, $errors) {
        this.$platformService = $platformService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    RemovePlatformCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$platformService.removePlatforms(args).wait();
        }).future()();
    };
    RemovePlatformCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (!args || args.length === 0) {
                _this.$errors.fail("No platform specified. Please specify a platform to remove");
            }
            _.each(args, function (arg) { return _this.$platformService.validatePlatformInstalled(arg); });
            return true;
        }).future()();
    };
    return RemovePlatformCommand;
})();
exports.RemovePlatformCommand = RemovePlatformCommand;
$injector.registerCommand("platform|remove", RemovePlatformCommand);
