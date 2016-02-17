///<reference path=".d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var staticConfigBaseLibPath = require("./common/static-config-base");
var configBaseLib = require("./common/config-base");
var Configuration = (function (_super) {
    __extends(Configuration, _super);
    function Configuration($fs) {
        _super.call(this, $fs);
        this.$fs = $fs;
        this.CI_LOGGER = false;
        this.DEBUG = false;
        this.TYPESCRIPT_COMPILER_OPTIONS = {};
        this.USE_PROXY = false;
        this.ANDROID_DEBUG_UI = null;
        this.USE_POD_SANDBOX = true;
        _.extend(this, this.loadConfig("config").wait());
    }
    return Configuration;
})(configBaseLib.ConfigBase);
exports.Configuration = Configuration;
$injector.register("config", Configuration);
var StaticConfig = (function (_super) {
    __extends(StaticConfig, _super);
    function StaticConfig($injector) {
        _super.call(this, $injector);
        this.PROJECT_FILE_NAME = "package.json";
        this.CLIENT_NAME_KEY_IN_PROJECT_FILE = "nativescript";
        this.CLIENT_NAME = "tns";
        this.CLIENT_NAME_ALIAS = "NativeScript";
        this.ANALYTICS_API_KEY = "5752dabccfc54c4ab82aea9626b7338e";
        this.TRACK_FEATURE_USAGE_SETTING_NAME = "TrackFeatureUsage";
        this.ERROR_REPORT_SETTING_NAME = "TrackExceptions";
        this.ANALYTICS_INSTALLATION_ID_SETTING_NAME = "AnalyticsInstallationID";
        this.START_PACKAGE_ACTIVITY_NAME = "com.tns.NativeScriptActivity";
        this.version = require("../package.json").version;
        this.RESOURCE_DIR_PATH = path.join(this.RESOURCE_DIR_PATH, "../../resources");
    }
    Object.defineProperty(StaticConfig.prototype, "disableHooks", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfig.prototype, "SYS_REQUIREMENTS_LINK", {
        get: function () {
            var linkToSysRequirements;
            switch (process.platform) {
                case "linux":
                    linkToSysRequirements = "http://docs.nativescript.org/setup/ns-cli-setup/ns-setup-linux.html#system-requirements";
                    break;
                case "win32":
                    linkToSysRequirements = "http://docs.nativescript.org/setup/ns-cli-setup/ns-setup-win.html#system-requirements";
                    break;
                case "darwin":
                    linkToSysRequirements = "http://docs.nativescript.org/setup/ns-cli-setup/ns-setup-os-x.html#system-requirements";
                    break;
                default:
                    linkToSysRequirements = "";
            }
            return linkToSysRequirements;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfig.prototype, "helpTextPath", {
        get: function () {
            return path.join(__dirname, "../resources/help.txt");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfig.prototype, "HTML_CLI_HELPERS_DIR", {
        get: function () {
            return path.join(__dirname, "../docs/helpers");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfig.prototype, "pathToPackageJson", {
        get: function () {
            return path.join(__dirname, "..", "package.json");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaticConfig.prototype, "PATH_TO_BOOTSTRAP", {
        get: function () {
            return path.join(__dirname, "bootstrap");
        },
        enumerable: true,
        configurable: true
    });
    StaticConfig.prototype.getAdbFilePath = function () {
        var _this = this;
        return (function () {
            if (!_this._adbFilePath) {
                var androidToolsInfo = _this.$injector.resolve("androidToolsInfo");
                _this._adbFilePath = androidToolsInfo.getPathToAdbFromAndroidHome().wait() || _super.prototype.getAdbFilePath.call(_this).wait();
            }
            return _this._adbFilePath;
        }).future()();
    };
    return StaticConfig;
})(staticConfigBaseLibPath.StaticConfigBase);
exports.StaticConfig = StaticConfig;
$injector.register("staticConfig", StaticConfig);
