///<reference path="../../.d.ts"/>
"use strict";
var os_1 = require("os");
var AndroidApplicationManager = (function () {
    function AndroidApplicationManager(adb, identifier, $staticConfig, $options, $logcatHelper) {
        this.adb = adb;
        this.identifier = identifier;
        this.$staticConfig = $staticConfig;
        this.$options = $options;
        this.$logcatHelper = $logcatHelper;
    }
    AndroidApplicationManager.prototype.getInstalledApplications = function () {
        var _this = this;
        return (function () {
            if (!_this._installedApplications) {
                var result = _this.adb.executeShellCommand(["pm", "list", "packages"]).wait();
                var regex = /package:(.+)/;
                _this._installedApplications = _.map(result.split(os_1.EOL), function (packageString) {
                    var match = packageString.match(regex);
                    return match ? match[1] : null;
                }).filter(function (parsedPackage) { return parsedPackage !== null; });
            }
            return _this._installedApplications;
        }).future()();
    };
    AndroidApplicationManager.prototype.installApplication = function (packageFilePath) {
        this._installedApplications = null;
        return this.adb.executeCommand(["install", "-r", ("" + packageFilePath)]);
    };
    AndroidApplicationManager.prototype.uninstallApplication = function (appIdentifier) {
        this._installedApplications = null;
        return this.adb.executeShellCommand(["pm", "uninstall", ("" + appIdentifier)]);
    };
    AndroidApplicationManager.prototype.reinstallApplication = function (applicationId, packageFilePath) {
        var _this = this;
        return (function () {
            _this.uninstallApplication(applicationId).wait();
            _this.installApplication(packageFilePath).wait();
        }).future()();
    };
    AndroidApplicationManager.prototype.startApplication = function (appIdentifier) {
        var _this = this;
        return (function () {
            _this.adb.executeShellCommand(["am", "start",
                "-a", "android.intent.action.MAIN",
                "-n", (appIdentifier + "/" + _this.$staticConfig.START_PACKAGE_ACTIVITY_NAME),
                "-c", "android.intent.category.LAUNCHER"]).wait();
            if (!_this.$options.justlaunch) {
                _this.$logcatHelper.start(_this.identifier);
            }
        }).future()();
    };
    AndroidApplicationManager.prototype.stopApplication = function (appIdentifier) {
        return this.adb.executeShellCommand(["am", "force-stop", ("" + appIdentifier)]);
    };
    AndroidApplicationManager.prototype.restartApplication = function (appIdentifier) {
        var _this = this;
        return (function () {
            _this.stopApplication(appIdentifier).wait();
            _this.startApplication(appIdentifier).wait();
        }).future()();
    };
    return AndroidApplicationManager;
})();
exports.AndroidApplicationManager = AndroidApplicationManager;
