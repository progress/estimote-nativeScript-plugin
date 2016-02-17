///<reference path="../.d.ts"/>
"use strict";
var os = require("os");
var helpers_1 = require('../helpers');
var DynamicHelpService = (function () {
    function DynamicHelpService($dynamicHelpProvider) {
        this.$dynamicHelpProvider = $dynamicHelpProvider;
    }
    DynamicHelpService.prototype.isProjectType = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return this.$dynamicHelpProvider.isProjectType(args);
    };
    DynamicHelpService.prototype.isPlatform = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var platform = os.platform().toLowerCase();
        return _.any(args, function (arg) { return arg.toLowerCase() === platform; });
    };
    DynamicHelpService.prototype.getLocalVariables = function (options) {
        var _this = this;
        return (function () {
            var isHtml = options.isHtml;
            var localVariables = _this.$dynamicHelpProvider.getLocalVariables(options).wait();
            localVariables["isLinux"] = isHtml || _this.isPlatform("linux");
            localVariables["isWindows"] = isHtml || _this.isPlatform("win32");
            localVariables["isMacOS"] = isHtml || _this.isPlatform("darwin");
            localVariables["isConsole"] = !isHtml;
            localVariables["isHtml"] = isHtml;
            localVariables["formatListOfNames"] = helpers_1.formatListOfNames;
            return localVariables;
        }).future()();
    };
    return DynamicHelpService;
})();
exports.DynamicHelpService = DynamicHelpService;
$injector.register("dynamicHelpService", DynamicHelpService);
