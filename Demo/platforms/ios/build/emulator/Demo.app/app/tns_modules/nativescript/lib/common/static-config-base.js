///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var shelljs = require("shelljs");
var os = require("os");
var StaticConfigBase = (function () {
    function StaticConfigBase($injector) {
        this.$injector = $injector;
        this.PROJECT_FILE_NAME = null;
        this.CLIENT_NAME = null;
        this.ANALYTICS_API_KEY = null;
        this.ANALYTICS_INSTALLATION_ID_SETTING_NAME = null;
        this.TRACK_FEATURE_USAGE_SETTING_NAME = null;
        this.ERROR_REPORT_SETTING_NAME = null;
        this.APP_RESOURCES_DIR_NAME = "App_Resources";
        this.COMMAND_HELP_FILE_NAME = 'command-help.json';
        this.RESOURCE_DIR_PATH = __dirname;
        this.version = null;
        this._adbFilePath = null;
    }
    Object.defineProperty(StaticConfigBase.prototype, "helpTextPath", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    StaticConfigBase.prototype.getAdbFilePath = function () {
        var _this = this;
        return (function () {
            if (!_this._adbFilePath) {
                _this._adbFilePath = _this.getAdbFilePathCore().wait();
            }
            return _this._adbFilePath;
        }).future()();
    };
    Object.defineProperty(StaticConfigBase.prototype, "MAN_PAGES_DIR", {
        get: function () {
            return path.join(__dirname, "../../", "docs", "man_pages");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfigBase.prototype, "HTML_PAGES_DIR", {
        get: function () {
            return path.join(__dirname, "../../", "docs", "html");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfigBase.prototype, "HTML_COMMON_HELPERS_DIR", {
        get: function () {
            return path.join(__dirname, "docs", "helpers");
        },
        enumerable: true,
        configurable: true
    });
    StaticConfigBase.prototype.getAdbFilePathCore = function () {
        var _this = this;
        return (function () {
            var $childProcess = _this.$injector.resolve("$childProcess");
            try {
                var proc = $childProcess.spawnFromEvent("adb", ["version"], "exit", undefined, { throwError: false }).wait();
                if (proc.stderr) {
                    return _this.spawnPrivateAdb().wait();
                }
            }
            catch (e) {
                if (e.code === "ENOENT") {
                    return _this.spawnPrivateAdb().wait();
                }
            }
            return "adb";
        }).future()();
    };
    StaticConfigBase.prototype.spawnPrivateAdb = function () {
        var _this = this;
        return (function () {
            var $fs = _this.$injector.resolve("$fs");
            var $childProcess = _this.$injector.resolve("$childProcess");
            var defaultAdbDirPath = path.join(__dirname, "resources/platform-tools/android/" + process.platform);
            var commonLibVersion = require(path.join(__dirname, "package.json")).version;
            var tmpDir = path.join(os.tmpdir(), "telerik-common-lib-" + commonLibVersion);
            $fs.createDirectory(tmpDir).wait();
            shelljs.cp(path.join(defaultAdbDirPath, "*"), tmpDir);
            var targetAdb = path.join(tmpDir, "adb");
            $childProcess.spawnFromEvent(targetAdb, ["start-server"], "exit", undefined, { throwError: false }).wait();
            return targetAdb;
        }).future()();
    };
    return StaticConfigBase;
})();
exports.StaticConfigBase = StaticConfigBase;
