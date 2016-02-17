///<reference path="../.d.ts"/>
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var path = require("path");
var shell = require("shelljs");
var constants = require("../constants");
var helpers = require("../common/helpers");
var semver = require("semver");
var minimatch = require("minimatch");
var Future = require("fibers/future");
var os_1 = require("os");
var PlatformService = (function () {
    function PlatformService($devicesService, $errors, $fs, $logger, $npmInstallationManager, $platformsData, $projectData, $projectDataService, $prompter, $hooksService, $commandsService, $options, $broccoliBuilder, $pluginsService, $projectFilesManager) {
        this.$devicesService = $devicesService;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$npmInstallationManager = $npmInstallationManager;
        this.$platformsData = $platformsData;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
        this.$prompter = $prompter;
        this.$hooksService = $hooksService;
        this.$commandsService = $commandsService;
        this.$options = $options;
        this.$broccoliBuilder = $broccoliBuilder;
        this.$pluginsService = $pluginsService;
        this.$projectFilesManager = $projectFilesManager;
    }
    PlatformService.prototype.addPlatforms = function (platforms) {
        var _this = this;
        return (function () {
            var platformsDir = _this.$projectData.platformsDir;
            _this.$fs.ensureDirectoryExists(platformsDir).wait();
            _.each(platforms, function (platform) {
                _this.addPlatform(platform.toLowerCase()).wait();
            });
        }).future()();
    };
    PlatformService.prototype.addPlatform = function (platformParam) {
        var _this = this;
        return (function () {
            var _a = platformParam.split("@"), platform = _a[0], version = _a[1];
            _this.validatePlatform(platform);
            var platformPath = path.join(_this.$projectData.platformsDir, platform);
            if (_this.$fs.exists(platformPath).wait()) {
                _this.$errors.fail("Platform %s already added", platform);
            }
            var platformData = _this.$platformsData.getPlatformData(platform);
            var platformProjectService = platformData.platformProjectService;
            platformProjectService.validate().wait();
            _this.$logger.trace("Creating NativeScript project for the %s platform", platform);
            _this.$logger.trace("Path: %s", platformData.projectRoot);
            _this.$logger.trace("Package: %s", _this.$projectData.projectId);
            _this.$logger.trace("Name: %s", _this.$projectData.projectName);
            _this.$logger.out("Copying template files...");
            var packageToInstall = "";
            var npmOptions = {
                pathToSave: path.join(_this.$projectData.platformsDir, platform)
            };
            if (_this.$options.frameworkPath) {
                packageToInstall = _this.$options.frameworkPath;
            }
            else {
                packageToInstall = platformData.frameworkPackageName;
                npmOptions["version"] = version;
            }
            try {
                var downloadedPackagePath = _this.$npmInstallationManager.install(packageToInstall, npmOptions).wait();
                var frameworkDir = path.join(downloadedPackagePath, constants.PROJECT_FRAMEWORK_FOLDER_NAME);
                frameworkDir = path.resolve(frameworkDir);
                _this.addPlatformCore(platformData, frameworkDir).wait();
            }
            catch (err) {
                _this.$fs.deleteDirectory(platformPath).wait();
                throw err;
            }
            _this.$logger.out("Project successfully created.");
        }).future()();
    };
    PlatformService.prototype.addPlatformCore = function (platformData, frameworkDir) {
        var _this = this;
        return (function () {
            var installedVersion = _this.$fs.readJson(path.join(frameworkDir, "../", "package.json")).wait().version;
            var isFrameworkPathDirectory = false, isFrameworkPathNotSymlinkedFile = false;
            if (_this.$options.frameworkPath) {
                var frameworkPathStats = _this.$fs.getFsStats(_this.$options.frameworkPath).wait();
                isFrameworkPathDirectory = frameworkPathStats.isDirectory();
                isFrameworkPathNotSymlinkedFile = !_this.$options.symlink && frameworkPathStats.isFile();
            }
            var sourceFrameworkDir = isFrameworkPathDirectory && _this.$options.symlink ? path.join(_this.$options.frameworkPath, "framework") : frameworkDir;
            platformData.platformProjectService.createProject(path.resolve(sourceFrameworkDir), installedVersion).wait();
            if (_this.$options.baseConfig) {
                var newConfigFile = path.resolve(_this.$options.baseConfig);
                _this.$logger.trace("Replacing '" + platformData.configurationFilePath + "' with '" + newConfigFile + "'.");
                _this.$fs.copyFile(newConfigFile, platformData.configurationFilePath).wait();
            }
            if (isFrameworkPathDirectory || isFrameworkPathNotSymlinkedFile) {
                _this.$fs.deleteDirectory(path.join(frameworkDir, "../../")).wait();
            }
            platformData.platformProjectService.interpolateData().wait();
            platformData.platformProjectService.afterCreateProject(platformData.projectRoot).wait();
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            _this.$projectDataService.setValue(platformData.frameworkPackageName, { version: installedVersion }).wait();
        }).future()();
    };
    PlatformService.prototype.getInstalledPlatforms = function () {
        var _this = this;
        return (function () {
            if (!_this.$fs.exists(_this.$projectData.platformsDir).wait()) {
                return [];
            }
            var subDirs = _this.$fs.readDirectory(_this.$projectData.platformsDir).wait();
            return _.filter(subDirs, function (p) { return _this.$platformsData.platformsNames.indexOf(p) > -1; });
        }).future()();
    };
    PlatformService.prototype.getAvailablePlatforms = function () {
        var _this = this;
        return (function () {
            var installedPlatforms = _this.getInstalledPlatforms().wait();
            return _.filter(_this.$platformsData.platformsNames, function (p) {
                return installedPlatforms.indexOf(p) < 0 && _this.isPlatformSupportedForOS(p);
            });
        }).future()();
    };
    PlatformService.prototype.getPreparedPlatforms = function () {
        var _this = this;
        return (function () {
            return _.filter(_this.$platformsData.platformsNames, function (p) { return _this.isPlatformPrepared(p).wait(); });
        }).future()();
    };
    PlatformService.prototype.preparePlatform = function (platform) {
        var _this = this;
        return (function () {
            _this.validatePlatform(platform);
            try {
                _this.$pluginsService.ensureAllDependenciesAreInstalled().wait();
            }
            catch (err) {
                _this.$logger.trace(err);
                _this.$errors.failWithoutHelp("Unable to install dependencies. Make sure your package.json is valid and all dependencies are correct. Error is: " + err.message);
            }
            return _this.preparePlatformCore(platform).wait();
        }).future()();
    };
    PlatformService.prototype.checkXmlFiles = function (sourceFiles) {
        var _this = this;
        return (function () {
            var xmlHasErrors = false;
            var DomParser = require("xmldom").DOMParser;
            sourceFiles
                .filter(function (file) { return _.endsWith(file, ".xml"); })
                .forEach(function (file) {
                var fileContents = _this.$fs.readText(file).wait();
                var hasErrors = false;
                var errorOutput = "";
                var domErrorHandler = function (level, msg) {
                    errorOutput += level + os_1.EOL + msg + os_1.EOL;
                    hasErrors = true;
                };
                var parser = new DomParser({
                    locator: {},
                    errorHandler: domErrorHandler
                });
                parser.parseFromString(fileContents, "text/xml");
                xmlHasErrors = xmlHasErrors || hasErrors;
                if (hasErrors) {
                    _this.$logger.warn(file + " has syntax errors.");
                    _this.$logger.out(errorOutput);
                }
            });
            return !xmlHasErrors;
        }).future()();
    };
    PlatformService.prototype.preparePlatformCore = function (platform) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            _this.ensurePlatformInstalled(platform).wait();
            var platformData = _this.$platformsData.getPlatformData(platform);
            var appDestinationDirectoryPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME);
            var lastModifiedTime = _this.$fs.exists(appDestinationDirectoryPath).wait() ?
                _this.$fs.getFsStats(appDestinationDirectoryPath).wait().mtime : null;
            _this.$fs.ensureDirectoryExists(appDestinationDirectoryPath).wait();
            var appSourceDirectoryPath = path.join(_this.$projectData.projectDir, constants.APP_FOLDER_NAME);
            var contents = _this.$fs.readDirectory(appDestinationDirectoryPath).wait();
            _(contents)
                .filter(function (directoryName) { return directoryName !== constants.TNS_MODULES_FOLDER_NAME; })
                .each(function (directoryName) { return _this.$fs.deleteDirectory(path.join(appDestinationDirectoryPath, directoryName)).wait(); })
                .value();
            var sourceFiles = _this.$fs.enumerateFilesInDirectorySync(appSourceDirectoryPath, null, { includeEmptyDirectories: true });
            if (_this.$options.release) {
                sourceFiles = sourceFiles.filter(function (source) { return source !== 'tests'; });
            }
            var hasTnsModulesInAppFolder = _this.$fs.exists(path.join(appSourceDirectoryPath, constants.TNS_MODULES_FOLDER_NAME)).wait();
            if (hasTnsModulesInAppFolder && _this.$projectData.dependencies && _this.$projectData.dependencies[constants.TNS_CORE_MODULES_NAME]) {
                _this.$logger.warn("You have tns_modules dir in your app folder and tns-core-modules in your package.json file. Tns_modules dir in your app folder will not be used and you can safely remove it.");
                sourceFiles = sourceFiles.filter(function (source) { return !minimatch(source, "**/" + constants.TNS_MODULES_FOLDER_NAME + "/**", { nocase: true }); });
            }
            _this.checkXmlFiles(sourceFiles).wait();
            PlatformService.EXCLUDE_FILES_PATTERN.forEach(function (pattern) { return sourceFiles = sourceFiles.filter(function (file) { return !minimatch(file, pattern, { nocase: true }); }); });
            var copyFileFutures = sourceFiles.map(function (source) {
                var destinationPath = path.join(appDestinationDirectoryPath, path.relative(appSourceDirectoryPath, source));
                if (_this.$fs.getFsStats(source).wait().isDirectory()) {
                    return _this.$fs.createDirectory(destinationPath);
                }
                return _this.$fs.copyFile(source, destinationPath);
            });
            Future.wait(copyFileFutures);
            _this.$fs.ensureDirectoryExists(platformData.platformProjectService.getAppResourcesDestinationDirectoryPath().wait()).wait();
            var appResourcesDirectoryPath = path.join(appDestinationDirectoryPath, constants.APP_RESOURCES_FOLDER_NAME);
            if (_this.$fs.exists(appResourcesDirectoryPath).wait()) {
                platformData.platformProjectService.prepareAppResources(appResourcesDirectoryPath).wait();
                shell.cp("-Rf", path.join(appResourcesDirectoryPath, platformData.normalizedPlatformName, "*"), platformData.platformProjectService.getAppResourcesDestinationDirectoryPath().wait());
                _this.$fs.deleteDirectory(appResourcesDirectoryPath).wait();
            }
            platformData.platformProjectService.prepareProject().wait();
            var appDir = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME);
            try {
                var tnsModulesDestinationPath = path.join(appDir, PlatformService.TNS_MODULES_FOLDER_NAME);
                _this.$broccoliBuilder.prepareNodeModules(tnsModulesDestinationPath, platform, lastModifiedTime).wait();
            }
            catch (error) {
                _this.$logger.debug(error);
                shell.rm("-rf", appDir);
                _this.$errors.failWithoutHelp("Processing node_modules failed. " + error);
            }
            var directoryPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME);
            var excludedDirs = [constants.APP_RESOURCES_FOLDER_NAME];
            _this.$projectFilesManager.processPlatformSpecificFiles(directoryPath, platform, excludedDirs).wait();
            platformData.platformProjectService.processConfigurationFilesFromAppResources().wait();
            _this.$logger.out("Project successfully prepared");
            return true;
        }).future()();
    };
    PlatformService.prototype.buildPlatform = function (platform, buildConfig) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            if (!_this.preparePlatform(platform).wait()) {
                _this.$errors.failWithoutHelp("Verify that listed files are well-formed and try again the operation.");
            }
            var platformData = _this.$platformsData.getPlatformData(platform);
            platformData.platformProjectService.buildProject(platformData.projectRoot, buildConfig).wait();
            _this.$logger.out("Project successfully built");
        }).future()();
    };
    PlatformService.prototype.copyLastOutput = function (platform, targetPath, settings) {
        var _this = this;
        return (function () {
            var packageFile;
            platform = platform.toLowerCase();
            targetPath = path.resolve(targetPath);
            var platformData = _this.$platformsData.getPlatformData(platform);
            if (settings.isForDevice) {
                packageFile = _this.getLatestApplicationPackageForDevice(platformData).wait().packageName;
            }
            else {
                packageFile = _this.getLatestApplicationPackageForEmulator(platformData).wait().packageName;
            }
            if (!packageFile || !_this.$fs.exists(packageFile).wait()) {
                _this.$errors.failWithoutHelp("Unable to find built application. Try 'tns build %s'.", platform);
            }
            _this.$fs.ensureDirectoryExists(path.dirname(targetPath)).wait();
            if (_this.$fs.exists(targetPath).wait() && _this.$fs.getFsStats(targetPath).wait().isDirectory()) {
                var sourceFileName = path.basename(packageFile);
                _this.$logger.trace("Specified target path: '" + targetPath + "' is directory. Same filename will be used: '" + sourceFileName + "'.");
                targetPath = path.join(targetPath, sourceFileName);
            }
            _this.$fs.copyFile(packageFile, targetPath).wait();
            _this.$logger.info("Copied file '" + packageFile + "' to '" + targetPath + "'.");
        }).future()();
    };
    PlatformService.prototype.runPlatform = function (platform, buildConfig) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            if (_this.$options.emulator) {
                _this.deployOnEmulator(platform, buildConfig).wait();
            }
            else {
                _this.deployOnDevice(platform, buildConfig).wait();
            }
        }).future()();
    };
    PlatformService.prototype.removePlatforms = function (platforms) {
        var _this = this;
        return (function () {
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            _.each(platforms, function (platform) {
                _this.validatePlatformInstalled(platform);
                var platformData = _this.$platformsData.getPlatformData(platform);
                var platformDir = path.join(_this.$projectData.platformsDir, platform);
                _this.$fs.deleteDirectory(platformDir).wait();
                _this.$projectDataService.removeProperty(platformData.frameworkPackageName).wait();
                _this.$logger.out("Platform " + platform + " successfully removed.");
            });
        }).future()();
    };
    PlatformService.prototype.updatePlatforms = function (platforms) {
        var _this = this;
        return (function () {
            _.each(platforms, function (platformParam) {
                var _a = platformParam.split("@"), platform = _a[0], version = _a[1];
                if (_this.isPlatformInstalled(platform).wait()) {
                    _this.updatePlatform(platform, version).wait();
                }
                else {
                    _this.addPlatform(platformParam).wait();
                }
            });
        }).future()();
    };
    PlatformService.prototype.installOnDevice = function (platform, buildConfig) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            _this.ensurePlatformInstalled(platform).wait();
            var platformData = _this.$platformsData.getPlatformData(platform);
            _this.$devicesService.initialize({ platform: platform, deviceId: _this.$options.device }).wait();
            if (_this.$devicesService.deviceCount < 1) {
                _this.$errors.failWithoutHelp("Cannot find connected devices. Reconnect any connected devices, verify that your system recognizes them, and run this command again.");
            }
            var cachedDeviceOption = _this.$options.forDevice;
            _this.$options.forDevice = true;
            _this.buildPlatform(platform, buildConfig).wait();
            _this.$options.forDevice = !!cachedDeviceOption;
            var packageFile = _this.getLatestApplicationPackageForDevice(platformData).wait().packageName;
            _this.$logger.out("Using ", packageFile);
            var action = function (device) {
                return (function () {
                    platformData.platformProjectService.deploy(device.deviceInfo.identifier).wait();
                    device.deploy(packageFile, _this.$projectData.projectId).wait();
                }).future()();
            };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    PlatformService.prototype.deployOnDevice = function (platform, buildConfig) {
        var _this = this;
        return (function () {
            _this.installOnDevice(platform, buildConfig).wait();
            var action = function (device) { return device.applicationManager.startApplication(_this.$projectData.projectId); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    PlatformService.prototype.deployOnEmulator = function (platform, buildConfig) {
        var _this = this;
        return (function () {
            var packageFile, logFilePath;
            _this.ensurePlatformInstalled(platform).wait();
            platform = platform.toLowerCase();
            var platformData = _this.$platformsData.getPlatformData(platform);
            var emulatorServices = platformData.emulatorServices;
            emulatorServices.checkAvailability().wait();
            emulatorServices.checkDependencies().wait();
            var emulatorId = emulatorServices.getEmulatorId().wait();
            platformData.platformProjectService.deploy(emulatorId).wait();
            if (!_this.$options.availableDevices) {
                _this.buildPlatform(platform, buildConfig).wait();
                packageFile = _this.getLatestApplicationPackageForEmulator(platformData).wait().packageName;
                _this.$logger.out("Using ", packageFile);
                logFilePath = path.join(platformData.projectRoot, _this.$projectData.projectName, "emulator.log");
            }
            emulatorServices.startEmulator(packageFile, { stderrFilePath: logFilePath, stdoutFilePath: logFilePath, appId: _this.$projectData.projectId }).wait();
        }).future()();
    };
    PlatformService.prototype.validatePlatform = function (platform) {
        if (!platform) {
            this.$errors.fail("No platform specified.");
        }
        platform = platform.split("@")[0].toLowerCase();
        if (!this.isValidPlatform(platform)) {
            this.$errors.fail("Invalid platform %s. Valid platforms are %s.", platform, helpers.formatListOfNames(this.$platformsData.platformsNames));
        }
        if (!this.isPlatformSupportedForOS(platform)) {
            this.$errors.fail("Applications for platform %s can not be built on this OS - %s", platform, process.platform);
        }
    };
    PlatformService.prototype.validatePlatformInstalled = function (platform) {
        this.validatePlatform(platform);
        if (!this.isPlatformInstalled(platform).wait()) {
            this.$errors.fail("The platform %s is not added to this project. Please use 'tns platform add <platform>'", platform);
        }
    };
    PlatformService.prototype.addLibrary = function (platform, libraryPath) {
        var _this = this;
        return (function () {
            if (!_this.$fs.exists(libraryPath).wait()) {
                _this.$errors.failWithoutHelp("The path %s does not exist", libraryPath);
            }
            else {
                var platformData = _this.$platformsData.getPlatformData(platform);
                platformData.platformProjectService.addLibrary(libraryPath).wait();
            }
        }).future()();
    };
    PlatformService.prototype.ensurePlatformInstalled = function (platform) {
        var _this = this;
        return (function () {
            if (!_this.isPlatformInstalled(platform).wait()) {
                _this.addPlatform(platform).wait();
            }
        }).future()();
    };
    PlatformService.prototype.isPlatformInstalled = function (platform) {
        return this.$fs.exists(path.join(this.$projectData.platformsDir, platform.toLowerCase()));
    };
    PlatformService.prototype.isValidPlatform = function (platform) {
        return this.$platformsData.getPlatformData(platform);
    };
    PlatformService.prototype.isPlatformSupportedForOS = function (platform) {
        var targetedOS = this.$platformsData.getPlatformData(platform).targetedOS;
        var res = !targetedOS || targetedOS.indexOf("*") >= 0 || targetedOS.indexOf(process.platform) >= 0;
        return res;
    };
    PlatformService.prototype.isPlatformPrepared = function (platform) {
        var platformData = this.$platformsData.getPlatformData(platform);
        return platformData.platformProjectService.isPlatformPrepared(platformData.projectRoot);
    };
    PlatformService.prototype.getApplicationPackages = function (buildOutputPath, validPackageNames) {
        var _this = this;
        return (function () {
            var candidates = _this.$fs.readDirectory(buildOutputPath).wait();
            var packages = _.filter(candidates, function (candidate) {
                return _.contains(validPackageNames, candidate);
            }).map(function (currentPackage) {
                currentPackage = path.join(buildOutputPath, currentPackage);
                return {
                    packageName: currentPackage,
                    time: _this.$fs.getFsStats(currentPackage).wait().mtime
                };
            });
            return packages;
        }).future()();
    };
    PlatformService.prototype.getLatestApplicationPackage = function (buildOutputPath, validPackageNames) {
        var _this = this;
        return (function () {
            var packages = _this.getApplicationPackages(buildOutputPath, validPackageNames).wait();
            if (packages.length === 0) {
                var packageExtName = path.extname(validPackageNames[0]);
                _this.$errors.fail("No %s found in %s directory", packageExtName, buildOutputPath);
            }
            packages = _.sortBy(packages, function (pkg) { return pkg.time; }).reverse();
            return packages[0];
        }).future()();
    };
    PlatformService.prototype.getLatestApplicationPackageForDevice = function (platformData) {
        return this.getLatestApplicationPackage(platformData.deviceBuildOutputPath, platformData.validPackageNamesForDevice);
    };
    PlatformService.prototype.getLatestApplicationPackageForEmulator = function (platformData) {
        return this.getLatestApplicationPackage(platformData.emulatorBuildOutputPath || platformData.deviceBuildOutputPath, platformData.validPackageNamesForEmulator || platformData.validPackageNamesForDevice);
    };
    PlatformService.prototype.updatePlatform = function (platform, version) {
        var _this = this;
        return (function () {
            var platformData = _this.$platformsData.getPlatformData(platform);
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var data = _this.$projectDataService.getValue(platformData.frameworkPackageName).wait();
            var currentVersion = data && data.version ? data.version : "0.2.0";
            var newVersion = version || _this.$npmInstallationManager.getLatestVersion(platformData.frameworkPackageName).wait();
            _this.ensurePackageIsCached(platformData.frameworkPackageName, newVersion).wait();
            var canUpdate = platformData.platformProjectService.canUpdatePlatform(currentVersion, newVersion).wait();
            if (canUpdate) {
                if (!semver.valid(newVersion)) {
                    _this.$errors.fail("The version %s is not valid. The version should consists from 3 parts separated by dot.", newVersion);
                }
                if (semver.gt(currentVersion, newVersion)) {
                    var isUpdateConfirmed = _this.$prompter.confirm("You are going to downgrade to runtime v." + newVersion + ". Are you sure?", function () { return false; }).wait();
                    if (isUpdateConfirmed) {
                        _this.updatePlatformCore(platformData, currentVersion, newVersion, canUpdate).wait();
                    }
                }
                else if (semver.eq(currentVersion, newVersion)) {
                    _this.$errors.fail("Current and new version are the same.");
                }
                else {
                    _this.updatePlatformCore(platformData, currentVersion, newVersion, canUpdate).wait();
                }
            }
            else {
                _this.updatePlatformCore(platformData, currentVersion, newVersion, canUpdate).wait();
            }
        }).future()();
    };
    PlatformService.prototype.updatePlatformCore = function (platformData, currentVersion, newVersion, canUpdate) {
        var _this = this;
        return (function () {
            var update = platformData.platformProjectService.updatePlatform(currentVersion, newVersion, canUpdate, _this.addPlatform.bind(_this), _this.removePlatforms.bind(_this)).wait();
            if (update) {
                var oldFrameworkData = _this.getFrameworkFiles(platformData, currentVersion).wait();
                _.each(oldFrameworkData.frameworkFiles, function (file) {
                    var fileToDelete = path.join(platformData.projectRoot, file);
                    _this.$logger.trace("Deleting %s", fileToDelete);
                    _this.$fs.deleteFile(fileToDelete).wait();
                });
                _.each(oldFrameworkData.frameworkDirectories, function (dir) {
                    var dirToDelete = path.join(platformData.projectRoot, dir);
                    _this.$logger.trace("Deleting %s", dirToDelete);
                    _this.$fs.deleteDirectory(dirToDelete).wait();
                });
                var newFrameworkData = _this.getFrameworkFiles(platformData, newVersion).wait();
                var cacheDirectoryPath = _this.$npmInstallationManager.getCachedPackagePath(platformData.frameworkPackageName, newVersion);
                _.each(newFrameworkData.frameworkFiles, function (file) {
                    var sourceFile = path.join(cacheDirectoryPath, constants.PROJECT_FRAMEWORK_FOLDER_NAME, file);
                    var destinationFile = path.join(platformData.projectRoot, file);
                    _this.$logger.trace("Replacing %s with %s", sourceFile, destinationFile);
                    shell.cp("-f", sourceFile, destinationFile);
                });
                _.each(newFrameworkData.frameworkDirectories, function (dir) {
                    var sourceDirectory = path.join(cacheDirectoryPath, constants.PROJECT_FRAMEWORK_FOLDER_NAME, dir);
                    var destinationDirectory = path.join(platformData.projectRoot, dir);
                    _this.$logger.trace("Copying %s to %s", sourceDirectory, destinationDirectory);
                    shell.cp("-fR", path.join(sourceDirectory, "*"), destinationDirectory);
                });
                _this.$projectDataService.initialize(_this.$projectData.projectDir);
                _this.$projectDataService.setValue(platformData.frameworkPackageName, { version: newVersion }).wait();
                _this.$logger.out("Successfully updated to version ", newVersion);
            }
        }).future()();
    };
    PlatformService.prototype.getFrameworkFiles = function (platformData, version) {
        var _this = this;
        return (function () {
            var cachedPackagePath = _this.$npmInstallationManager.getCachedPackagePath(platformData.frameworkPackageName, version);
            var allFiles = _this.$fs.enumerateFilesInDirectorySync(cachedPackagePath);
            var filteredFiles = _.filter(allFiles, function (file) { return _.contains(platformData.frameworkFilesExtensions, path.extname(file)); });
            var allFrameworkDirectories = _.map(_this.$fs.readDirectory(path.join(cachedPackagePath, constants.PROJECT_FRAMEWORK_FOLDER_NAME)).wait(), function (dir) { return path.join(cachedPackagePath, constants.PROJECT_FRAMEWORK_FOLDER_NAME, dir); });
            var filteredFrameworkDirectories = _.filter(allFrameworkDirectories, function (dir) { return _this.$fs.getFsStats(dir).wait().isDirectory() && (_.contains(platformData.frameworkFilesExtensions, path.extname(dir)) || _.contains(platformData.frameworkDirectoriesNames, path.basename(dir))); });
            return {
                frameworkFiles: _this.mapFrameworkFiles(cachedPackagePath, filteredFiles),
                frameworkDirectories: _this.mapFrameworkFiles(cachedPackagePath, filteredFrameworkDirectories)
            };
        }).future()();
    };
    PlatformService.prototype.ensurePackageIsCached = function (packageName, version) {
        var _this = this;
        return (function () {
            _this.$npmInstallationManager.addToCache(packageName, version).wait();
            var cachedPackagePath = _this.$npmInstallationManager.getCachedPackagePath(packageName, version);
            if (!_this.$fs.exists(path.join(cachedPackagePath, constants.PROJECT_FRAMEWORK_FOLDER_NAME)).wait()) {
                _this.$npmInstallationManager.addCleanCopyToCache(packageName, version).wait();
            }
        }).future()();
    };
    PlatformService.prototype.mapFrameworkFiles = function (npmCacheDirectoryPath, files) {
        return _.map(files, function (file) { return file.substr(npmCacheDirectoryPath.length + constants.PROJECT_FRAMEWORK_FOLDER_NAME.length + 1); });
    };
    PlatformService.TNS_MODULES_FOLDER_NAME = "tns_modules";
    PlatformService.EXCLUDE_FILES_PATTERN = [
        "**/*.js.map",
        "**/*.ts"
    ];
    Object.defineProperty(PlatformService.prototype, "preparePlatformCore",
        __decorate([
            helpers.hook('prepare')
        ], PlatformService.prototype, "preparePlatformCore", Object.getOwnPropertyDescriptor(PlatformService.prototype, "preparePlatformCore")));
    return PlatformService;
})();
exports.PlatformService = PlatformService;
$injector.register("platformService", PlatformService);
