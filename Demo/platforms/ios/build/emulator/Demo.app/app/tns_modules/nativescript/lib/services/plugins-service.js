///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var shelljs = require("shelljs");
var semver = require("semver");
var Future = require("fibers/future");
var constants = require("../constants");
var xmlmerge = require("xmlmerge-js");
var DOMParser = require('xmldom').DOMParser;
var PluginsService = (function () {
    function PluginsService($broccoliBuilder, $platformsData, $npm, $fs, $projectData, $projectDataService, $childProcess, $options, $logger, $errors, $pluginVariablesService, $projectFilesManager, $injector) {
        this.$broccoliBuilder = $broccoliBuilder;
        this.$platformsData = $platformsData;
        this.$npm = $npm;
        this.$fs = $fs;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
        this.$childProcess = $childProcess;
        this.$options = $options;
        this.$logger = $logger;
        this.$errors = $errors;
        this.$pluginVariablesService = $pluginVariablesService;
        this.$projectFilesManager = $projectFilesManager;
        this.$injector = $injector;
    }
    PluginsService.prototype.add = function (plugin) {
        var _this = this;
        return (function () {
            _this.ensure().wait();
            var dependencyData = _this.$npm.cache(plugin, undefined, PluginsService.NPM_CONFIG).wait();
            if (dependencyData.nativescript) {
                var pluginData = _this.convertToPluginData(dependencyData);
                var action = function (pluginDestinationPath, platform, platformData) {
                    return (function () {
                        _this.isPluginDataValidForPlatform(pluginData, platform).wait();
                    }).future()();
                };
                _this.executeForAllInstalledPlatforms(action).wait();
                try {
                    _this.$pluginVariablesService.savePluginVariablesInProjectFile(pluginData).wait();
                    _this.executeNpmCommand(PluginsService.INSTALL_COMMAND_NAME, plugin).wait();
                }
                catch (err) {
                    _this.$projectDataService.initialize(_this.$projectData.projectDir);
                    _this.$projectDataService.removeProperty(_this.$pluginVariablesService.getPluginVariablePropertyName(pluginData)).wait();
                    _this.$projectDataService.removeDependency(pluginData.name).wait();
                    throw err;
                }
                _this.$logger.out("Successfully installed plugin " + dependencyData.name + ".");
            }
            else {
                _this.$errors.failWithoutHelp(plugin + " is not a valid NativeScript plugin. Verify that the plugin package.json file contains a nativescript key and try again.");
            }
        }).future()();
    };
    PluginsService.prototype.remove = function (pluginName) {
        var _this = this;
        return (function () {
            var removePluginNativeCodeAction = function (modulesDestinationPath, platform, platformData) {
                return (function () {
                    var pluginData = _this.convertToPluginData(_this.getNodeModuleData(pluginName).wait());
                    platformData.platformProjectService.removePluginNativeCode(pluginData).wait();
                    var pluginConfigurationFilePath = _this.getPluginConfigurationFilePath(pluginData, platformData);
                    if (_this.$fs.exists(pluginConfigurationFilePath).wait()) {
                        _this.merge(pluginData, platformData, function (data) { return data.name !== pluginData.name; }).wait();
                    }
                    if (pluginData.pluginVariables) {
                        _this.$pluginVariablesService.removePluginVariablesFromProjectFile(pluginData).wait();
                    }
                }).future()();
            };
            _this.executeForAllInstalledPlatforms(removePluginNativeCodeAction).wait();
            _this.executeNpmCommand(PluginsService.UNINSTALL_COMMAND_NAME, pluginName).wait();
            var showMessage = true;
            var action = function (modulesDestinationPath, platform, platformData) {
                return (function () {
                    shelljs.rm("-rf", path.join(modulesDestinationPath, pluginName));
                    _this.$logger.out("Successfully removed plugin " + pluginName + " for " + platform + ".");
                    showMessage = false;
                }).future()();
            };
            _this.executeForAllInstalledPlatforms(action).wait();
            if (showMessage) {
                _this.$logger.out("Succsessfully removed plugin " + pluginName);
            }
        }).future()();
    };
    PluginsService.prototype.initializeConfigurationFileFromCache = function (platformData) {
        var _this = this;
        return (function () {
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var frameworkVersion = _this.$projectDataService.getValue(platformData.frameworkPackageName).wait().version;
            var npmInstallationManager = _this.$injector.resolve("npmInstallationManager");
            npmInstallationManager.addToCache(platformData.frameworkPackageName, frameworkVersion).wait();
            var cachedPackagePath = npmInstallationManager.getCachedPackagePath(platformData.frameworkPackageName, frameworkVersion);
            var cachedConfigurationFilePath = _this.$options.baseConfig ? path.resolve(_this.$options.baseConfig) : path.join(cachedPackagePath, constants.PROJECT_FRAMEWORK_FOLDER_NAME, platformData.relativeToFrameworkConfigurationFilePath);
            var cachedConfigurationFileContent = _this.$fs.readText(cachedConfigurationFilePath).wait();
            _this.$fs.writeFile(platformData.configurationFilePath, cachedConfigurationFileContent).wait();
            platformData.platformProjectService.interpolateConfigurationFile().wait();
        }).future()();
    };
    PluginsService.prototype.prepare = function (dependencyData, platform) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            var platformData = _this.$platformsData.getPlatformData(platform);
            var pluginDestinationPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME, "tns_modules");
            var pluginData = _this.convertToPluginData(dependencyData);
            if (!_this.isPluginDataValidForPlatform(pluginData, platform).wait()) {
                return;
            }
            if (_this.$fs.exists(path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME)).wait()) {
                _this.$fs.ensureDirectoryExists(pluginDestinationPath).wait();
                shelljs.cp("-Rf", pluginData.fullPath, pluginDestinationPath);
                var pluginConfigurationFilePath = _this.getPluginConfigurationFilePath(pluginData, platformData);
                if (_this.$fs.exists(pluginConfigurationFilePath).wait()) {
                    _this.merge(pluginData, platformData).wait();
                }
                _this.$projectFilesManager.processPlatformSpecificFiles(pluginDestinationPath, platform).wait();
                pluginData.pluginPlatformsFolderPath = function (_platform) { return path.join(pluginData.fullPath, "platforms", _platform); };
                platformData.platformProjectService.preparePluginNativeCode(pluginData).wait();
                shelljs.rm("-rf", path.join(pluginDestinationPath, pluginData.name, "platforms"));
                _this.$logger.out("Successfully prepared plugin " + pluginData.name + " for " + platform + ".");
            }
        }).future()();
    };
    PluginsService.prototype.ensureAllDependenciesAreInstalled = function () {
        var _this = this;
        return (function () {
            var installedDependencies = _this.$fs.exists(_this.nodeModulesPath).wait() ? _this.$fs.readDirectory(_this.nodeModulesPath).wait() : [];
            var packageJsonContent = _this.$fs.readJson(_this.getPackageJsonFilePath()).wait();
            var allDependencies = _.keys(packageJsonContent.dependencies).concat(_.keys(packageJsonContent.devDependencies));
            if (_this.$options.force || _.difference(allDependencies, installedDependencies).length) {
                _this.$npm.install(_this.$projectData.projectDir, _this.$projectData.projectDir, { "ignore-scripts": _this.$options.ignoreScripts }).wait();
            }
        }).future()();
    };
    PluginsService.prototype.getAllInstalledPlugins = function () {
        var _this = this;
        return (function () {
            var nodeModules = _this.getAllInstalledModules().wait().map(function (nodeModuleData) { return _this.convertToPluginData(nodeModuleData); });
            return _.filter(nodeModules, function (nodeModuleData) { return nodeModuleData && nodeModuleData.isPlugin; });
        }).future()();
    };
    PluginsService.prototype.afterPrepareAllPlugins = function () {
        var action = function (pluginDestinationPath, platform, platformData) {
            return platformData.platformProjectService.afterPrepareAllPlugins();
        };
        return this.executeForAllInstalledPlatforms(action);
    };
    Object.defineProperty(PluginsService.prototype, "nodeModulesPath", {
        get: function () {
            return path.join(this.$projectData.projectDir, "node_modules");
        },
        enumerable: true,
        configurable: true
    });
    PluginsService.prototype.getPackageJsonFilePath = function () {
        return path.join(this.$projectData.projectDir, "package.json");
    };
    PluginsService.prototype.getPackageJsonFilePathForModule = function (moduleName) {
        return path.join(this.nodeModulesPath, moduleName, "package.json");
    };
    PluginsService.prototype.getDependencies = function () {
        var packageJsonFilePath = this.getPackageJsonFilePath();
        return _.keys(require(packageJsonFilePath).dependencies);
    };
    PluginsService.prototype.getNodeModuleData = function (module) {
        var _this = this;
        return (function () {
            if (!_this.$fs.exists(module).wait() || path.basename(module) !== "package.json") {
                module = _this.getPackageJsonFilePathForModule(module);
            }
            var data = _this.$fs.readJson(module).wait();
            return {
                name: data.name,
                version: data.version,
                fullPath: path.dirname(module),
                isPlugin: data.nativescript !== undefined,
                moduleInfo: data.nativescript
            };
        }).future()();
    };
    PluginsService.prototype.convertToPluginData = function (cacheData) {
        var pluginData = {};
        pluginData.name = cacheData.name;
        pluginData.version = cacheData.version;
        pluginData.fullPath = cacheData.directory || path.dirname(this.getPackageJsonFilePathForModule(cacheData.name));
        pluginData.isPlugin = !!cacheData.nativescript || !!cacheData.moduleInfo;
        pluginData.pluginPlatformsFolderPath = function (platform) { return path.join(pluginData.fullPath, "platforms", platform); };
        var data = cacheData.nativescript || cacheData.moduleInfo;
        if (pluginData.isPlugin) {
            pluginData.platformsData = data.platforms;
            pluginData.pluginVariables = data.variables;
        }
        return pluginData;
    };
    PluginsService.prototype.ensure = function () {
        var _this = this;
        return (function () {
            _this.ensureAllDependenciesAreInstalled().wait();
            _this.$fs.ensureDirectoryExists(_this.nodeModulesPath).wait();
        }).future()();
    };
    PluginsService.prototype.getAllInstalledModules = function () {
        var _this = this;
        return (function () {
            _this.ensure().wait();
            var nodeModules = _this.getDependencies();
            return _.map(nodeModules, function (nodeModuleName) { return _this.getNodeModuleData(nodeModuleName).wait(); });
        }).future()();
    };
    PluginsService.prototype.executeNpmCommand = function (npmCommandName, npmCommandArguments) {
        var _this = this;
        return (function () {
            var result = "";
            if (npmCommandName === PluginsService.INSTALL_COMMAND_NAME) {
                result = _this.$npm.install(npmCommandArguments, _this.$projectData.projectDir, PluginsService.NPM_CONFIG).wait();
            }
            else if (npmCommandName === PluginsService.UNINSTALL_COMMAND_NAME) {
                result = _this.$npm.uninstall(npmCommandArguments, PluginsService.NPM_CONFIG, _this.$projectData.projectDir).wait();
            }
            return _this.parseNpmCommandResult(result);
        }).future()();
    };
    PluginsService.prototype.parseNpmCommandResult = function (npmCommandResult) {
        return npmCommandResult[0][0].split("@")[0];
    };
    PluginsService.prototype.executeForAllInstalledPlatforms = function (action) {
        var _this = this;
        return (function () {
            var availablePlatforms = _.keys(_this.$platformsData.availablePlatforms);
            _.each(availablePlatforms, function (platform) {
                var isPlatformInstalled = _this.$fs.exists(path.join(_this.$projectData.platformsDir, platform.toLowerCase())).wait();
                if (isPlatformInstalled) {
                    var platformData = _this.$platformsData.getPlatformData(platform.toLowerCase());
                    var pluginDestinationPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME, "tns_modules");
                    action(pluginDestinationPath, platform.toLowerCase(), platformData).wait();
                }
            });
        }).future()();
    };
    PluginsService.prototype.getInstalledFrameworkVersion = function (platform) {
        var _this = this;
        return (function () {
            var platformData = _this.$platformsData.getPlatformData(platform);
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var frameworkData = _this.$projectDataService.getValue(platformData.frameworkPackageName).wait();
            return frameworkData.version;
        }).future()();
    };
    PluginsService.prototype.mergeXml = function (xml1, xml2, config) {
        var future = new Future();
        try {
            xmlmerge.merge(xml1, xml2, config, function (mergedXml) {
                future.return(mergedXml);
            });
        }
        catch (err) {
            future.throw(err);
        }
        return future;
    };
    PluginsService.prototype.validateXml = function (xml, xmlFilePath) {
        var _this = this;
        var doc = new DOMParser({
            locator: {},
            errorHandler: function (level, msg) {
                var errorMessage = xmlFilePath ? "Invalid xml file " + xmlFilePath + "." : "Invalid xml " + xml + ".";
                _this.$errors.fail(errorMessage + (" Additional technical information: " + msg + "."));
            }
        });
        doc.parseFromString(xml, 'text/xml');
    };
    PluginsService.prototype.mergeCore = function (pluginData, platformData) {
        var _this = this;
        return (function () {
            var pluginConfigurationFilePath = _this.getPluginConfigurationFilePath(pluginData, platformData);
            var configurationFilePath = platformData.configurationFilePath;
            var pluginConfigurationFileContent = _this.$fs.readText(pluginConfigurationFilePath).wait();
            pluginConfigurationFileContent = _this.$pluginVariablesService.interpolatePluginVariables(pluginData, pluginConfigurationFileContent).wait();
            _this.validateXml(pluginConfigurationFileContent, pluginConfigurationFilePath);
            var configurationFileContent = _this.$fs.readText(configurationFilePath).wait();
            _this.validateXml(configurationFileContent, configurationFilePath);
            var resultXml = _this.mergeXml(configurationFileContent, pluginConfigurationFileContent, platformData.mergeXmlConfig || []).wait();
            _this.validateXml(resultXml);
            _this.$fs.writeFile(configurationFilePath, resultXml).wait();
        }).future()();
    };
    PluginsService.prototype.merge = function (pluginData, platformData, mergeCondition) {
        var _this = this;
        return (function () {
            var tnsModulesDestinationPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME, constants.TNS_MODULES_FOLDER_NAME);
            var nodeModules = _this.$broccoliBuilder.getChangedNodeModules(tnsModulesDestinationPath, platformData.normalizedPlatformName.toLowerCase()).wait();
            _(nodeModules)
                .keys()
                .filter(function (nodeModule) { return _this.$fs.exists(path.join(nodeModule, "package.json")).wait(); })
                .map(function (nodeModule) { return _this.getNodeModuleData(path.join(nodeModule, "package.json")).wait(); })
                .map(function (nodeModuleData) { return _this.convertToPluginData(nodeModuleData); })
                .filter(function (data) { return data.isPlugin && _this.$fs.exists(_this.getPluginConfigurationFilePath(data, platformData)).wait(); })
                .forEach(function (data, index) {
                if (index === 0) {
                    _this.initializeConfigurationFileFromCache(platformData).wait();
                }
                if (!mergeCondition || (mergeCondition && mergeCondition(data))) {
                    _this.mergeCore(data, platformData).wait();
                }
            })
                .value();
        }).future()();
    };
    PluginsService.prototype.getPluginConfigurationFilePath = function (pluginData, platformData) {
        var pluginPlatformsFolderPath = pluginData.pluginPlatformsFolderPath(platformData.normalizedPlatformName.toLowerCase());
        var pluginConfigurationFilePath = path.join(pluginPlatformsFolderPath, platformData.configurationFileName);
        return pluginConfigurationFilePath;
    };
    PluginsService.prototype.isPluginDataValidForPlatform = function (pluginData, platform) {
        var _this = this;
        return (function () {
            var isValid = true;
            var installedFrameworkVersion = _this.getInstalledFrameworkVersion(platform).wait();
            var pluginPlatformsData = pluginData.platformsData;
            if (pluginPlatformsData) {
                var pluginVersion = pluginPlatformsData[platform];
                if (!pluginVersion) {
                    _this.$logger.warn(pluginData.name + " is not supported for " + platform + ".");
                    isValid = false;
                }
                else if (semver.gt(pluginVersion, installedFrameworkVersion)) {
                    _this.$logger.warn(pluginData.name + " " + pluginVersion + " for " + platform + " is not compatible with the currently installed framework version " + installedFrameworkVersion + ".");
                    isValid = false;
                }
            }
            return isValid;
        }).future()();
    };
    PluginsService.INSTALL_COMMAND_NAME = "install";
    PluginsService.UNINSTALL_COMMAND_NAME = "uninstall";
    PluginsService.NPM_CONFIG = {
        save: true
    };
    return PluginsService;
})();
exports.PluginsService = PluginsService;
$injector.register("pluginsService", PluginsService);
