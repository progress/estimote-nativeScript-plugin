///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var PreUninstallCommand = (function () {
    function PreUninstallCommand($fs, $childProcess, $logger, $options) {
        this.$fs = $fs;
        this.$childProcess = $childProcess;
        this.$logger = $logger;
        this.$options = $options;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    PreUninstallCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$fs.deleteFile(path.join(_this.$options.profileDir, "KillSwitches", "cli")).wait();
        }).future()();
    };
    return PreUninstallCommand;
})();
exports.PreUninstallCommand = PreUninstallCommand;
$injector.registerCommand("dev-preuninstall", PreUninstallCommand);
