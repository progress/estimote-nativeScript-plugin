///<reference path="../.d.ts"/>
"use strict";
var InitCommand = (function () {
    function InitCommand($initService) {
        this.$initService = $initService;
        this.allowedParameters = [];
        this.enableHooks = false;
    }
    InitCommand.prototype.execute = function (args) {
        return this.$initService.initialize();
    };
    return InitCommand;
})();
exports.InitCommand = InitCommand;
$injector.registerCommand("init", InitCommand);
