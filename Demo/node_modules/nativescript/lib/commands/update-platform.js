///<reference path="../.d.ts"/>
"use strict";
var UpdatePlatformCommand = (function () {
    function UpdatePlatformCommand($platformService, $errors) {
        this.$platformService = $platformService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    UpdatePlatformCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$platformService.updatePlatforms(args).wait();
        }).future()();
    };
    UpdatePlatformCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (!args || args.length === 0) {
                _this.$errors.fail("No platform specified. Please specify platforms to update.");
            }
            _.each(args, function (arg) { return _this.$platformService.validatePlatform(arg.split("@")[0]); });
            return true;
        }).future()();
    };
    return UpdatePlatformCommand;
})();
exports.UpdatePlatformCommand = UpdatePlatformCommand;
$injector.registerCommand("platform|update", UpdatePlatformCommand);
