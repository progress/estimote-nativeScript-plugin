///<reference path="../.d.ts"/>
"use strict";
var Future = require("fibers/future");
var CommandsServiceProvider = (function () {
    function CommandsServiceProvider() {
        this.dynamicCommandsPrefix = "";
    }
    CommandsServiceProvider.prototype.getDynamicCommands = function () {
        return Future.fromResult([]);
    };
    CommandsServiceProvider.prototype.generateDynamicCommands = function () {
        return Future.fromResult();
    };
    CommandsServiceProvider.prototype.registerDynamicSubCommands = function () {
    };
    return CommandsServiceProvider;
})();
exports.CommandsServiceProvider = CommandsServiceProvider;
$injector.register("commandsServiceProvider", CommandsServiceProvider);
