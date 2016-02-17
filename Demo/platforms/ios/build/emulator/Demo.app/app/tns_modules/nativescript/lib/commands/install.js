///<reference path="../.d.ts"/>
"use strict";
var InstallCommand = (function () {
    function InstallCommand($platformsData, $platformService, $projectData, $projectDataService, $pluginsService, $logger, $fs, $stringParameter, $npm) {
        this.$platformsData = $platformsData;
        this.$platformService = $platformService;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
        this.$pluginsService = $pluginsService;
        this.$logger = $logger;
        this.$fs = $fs;
        this.$stringParameter = $stringParameter;
        this.$npm = $npm;
        this.enableHooks = false;
        this.allowedParameters = [this.$stringParameter];
    }
    InstallCommand.prototype.execute = function (args) {
        return args[0] ? this.installModule(args[0]) : this.installProjectDependencies();
    };
    InstallCommand.prototype.installProjectDependencies = function () {
        var _this = this;
        return (function () {
            var error = "";
            _this.$pluginsService.ensureAllDependenciesAreInstalled().wait();
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            _.each(_this.$platformsData.platformsNames, function (platform) {
                var platformData = _this.$platformsData.getPlatformData(platform);
                var frameworkPackageData = _this.$projectDataService.getValue(platformData.frameworkPackageName).wait();
                if (frameworkPackageData && frameworkPackageData.version) {
                    try {
                        _this.$platformService.addPlatforms([(platform + "@" + frameworkPackageData.version)]).wait();
                    }
                    catch (err) {
                        error += err;
                    }
                }
            });
            if (error) {
                _this.$logger.error(error);
            }
        }).future()();
    };
    InstallCommand.prototype.installModule = function (moduleName) {
        var _this = this;
        return (function () {
            var projectDir = _this.$projectData.projectDir;
            var devPrefix = 'nativescript-dev-';
            if (!_this.$fs.exists(moduleName).wait() && moduleName.indexOf(devPrefix) !== 0) {
                moduleName = devPrefix + moduleName;
            }
            _this.$npm.install(moduleName, projectDir, { 'save-dev': true }).wait();
        }).future()();
    };
    return InstallCommand;
})();
exports.InstallCommand = InstallCommand;
$injector.registerCommand("install", InstallCommand);
