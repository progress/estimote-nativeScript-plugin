///<reference path="../.d.ts"/>
"use strict";
var constants = require("../constants");
var helpers = require("../common/helpers");
var path = require("path");
var semver = require("semver");
var InitService = (function () {
    function InitService($fs, $logger, $options, $injector, $staticConfig, $projectHelper, $prompter, $npm, $npmInstallationManager) {
        this.$fs = $fs;
        this.$logger = $logger;
        this.$options = $options;
        this.$injector = $injector;
        this.$staticConfig = $staticConfig;
        this.$projectHelper = $projectHelper;
        this.$prompter = $prompter;
        this.$npm = $npm;
        this.$npmInstallationManager = $npmInstallationManager;
    }
    InitService.prototype.initialize = function () {
        var _this = this;
        return (function () {
            var projectData = {};
            if (_this.$fs.exists(_this.projectFilePath).wait()) {
                projectData = _this.$fs.readJson(_this.projectFilePath).wait();
            }
            var projectDataBackup = _.extend({}, projectData);
            if (!projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE]) {
                projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE] = {};
                _this.$fs.writeJson(_this.projectFilePath, projectData).wait();
            }
            try {
                projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE]["id"] = _this.getProjectId().wait();
                if (_this.$options.frameworkName && _this.$options.frameworkVersion) {
                    projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE][_this.$options.frameworkName] = _this.buildVersionData(_this.$options.frameworkVersion);
                }
                else {
                    var $platformsData = _this.$injector.resolve("platformsData");
                    _.each($platformsData.platformsNames, function (platform) {
                        var platformData = $platformsData.getPlatformData(platform);
                        if (!platformData.targetedOS || (platformData.targetedOS && _.contains(platformData.targetedOS, process.platform))) {
                            projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE][platformData.frameworkPackageName] = _this.getVersionData(platformData.frameworkPackageName).wait();
                        }
                    });
                }
                var dependencies = projectData.dependencies;
                if (!dependencies) {
                    projectData.dependencies = Object.create(null);
                }
                projectData.dependencies[constants.TNS_CORE_MODULES_NAME] = _this.getVersionData(constants.TNS_CORE_MODULES_NAME).wait()["version"];
                _this.$fs.writeJson(_this.projectFilePath, projectData).wait();
            }
            catch (err) {
                _this.$fs.writeJson(_this.projectFilePath, projectDataBackup).wait();
                throw err;
            }
            _this.$logger.out("Project successfully initialized.");
        }).future()();
    };
    Object.defineProperty(InitService.prototype, "projectFilePath", {
        get: function () {
            if (!this._projectFilePath) {
                var projectDir = path.resolve(this.$options.path || ".");
                this._projectFilePath = path.join(projectDir, constants.PACKAGE_JSON_FILE_NAME);
            }
            return this._projectFilePath;
        },
        enumerable: true,
        configurable: true
    });
    InitService.prototype.getProjectId = function () {
        var _this = this;
        return (function () {
            if (_this.$options.appid) {
                return _this.$options.appid;
            }
            var defaultAppId = _this.$projectHelper.generateDefaultAppId(path.basename(path.dirname(_this.projectFilePath)), constants.DEFAULT_APP_IDENTIFIER_PREFIX);
            if (_this.useDefaultValue) {
                return defaultAppId;
            }
            return _this.$prompter.getString("Id:", function () { return defaultAppId; }).wait();
        }).future()();
    };
    InitService.prototype.getVersionData = function (packageName) {
        var _this = this;
        return (function () {
            var latestVersion = _this.$npmInstallationManager.getLatestCompatibleVersion(packageName).wait();
            if (_this.useDefaultValue) {
                return _this.buildVersionData(latestVersion);
            }
            var data = _this.$npm.view(packageName, "versions").wait();
            var versions = _.filter(data[latestVersion].versions, function (version) { return semver.gte(version, InitService.MIN_SUPPORTED_FRAMEWORK_VERSIONS[packageName]); });
            if (versions.length === 1) {
                _this.$logger.info("Only " + versions[0] + " version is available for " + packageName + " framework.");
                return _this.buildVersionData(versions[0]);
            }
            var sortedVersions = versions.sort(helpers.versionCompare).reverse();
            var version = _this.$prompter.promptForChoice(packageName + " version:", sortedVersions).wait();
            return _this.buildVersionData(version);
        }).future()();
    };
    InitService.prototype.buildVersionData = function (version) {
        return { "version": version };
    };
    Object.defineProperty(InitService.prototype, "useDefaultValue", {
        get: function () {
            return !helpers.isInteractive() || this.$options.force;
        },
        enumerable: true,
        configurable: true
    });
    InitService.MIN_SUPPORTED_FRAMEWORK_VERSIONS = {
        "tns-ios": "1.1.0",
        "tns-android": "1.1.0",
        "tns-core-modules": "1.2.0"
    };
    return InitService;
})();
exports.InitService = InitService;
$injector.register("initService", InitService);
