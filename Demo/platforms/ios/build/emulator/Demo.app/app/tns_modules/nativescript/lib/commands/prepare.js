///<reference path="../.d.ts"/>
"use strict";
var PrepareCommand = (function () {
    function PrepareCommand($errors, $platformService, $platformCommandParameter) {
        this.$errors = $errors;
        this.$platformService = $platformService;
        this.$platformCommandParameter = $platformCommandParameter;
        this.allowedParameters = [this.$platformCommandParameter];
    }
    PrepareCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (!_this.$platformService.preparePlatform(args[0]).wait()) {
                _this.$errors.failWithoutHelp("Unable to prepare the project.");
            }
        }).future()();
    };
    return PrepareCommand;
})();
exports.PrepareCommand = PrepareCommand;
$injector.registerCommand("prepare", PrepareCommand);
