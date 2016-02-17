///<reference path=".d.ts"/>
"use strict";
var constants = require('./constants');
var Future = require("fibers/future");
var DynamicHelpProvider = (function () {
    function DynamicHelpProvider() {
    }
    DynamicHelpProvider.prototype.isProjectType = function (args) {
        return Future.fromResult(true);
    };
    DynamicHelpProvider.prototype.getLocalVariables = function (options) {
        var localVariables = {
            constants: constants
        };
        return Future.fromResult(localVariables);
    };
    return DynamicHelpProvider;
})();
exports.DynamicHelpProvider = DynamicHelpProvider;
$injector.register("dynamicHelpProvider", DynamicHelpProvider);
