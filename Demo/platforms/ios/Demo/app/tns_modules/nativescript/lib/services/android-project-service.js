///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var shell = require("shelljs");
var Future = require("fibers/future");
var constants = require("../constants");
var semver = require("semver");
var projectServiceBaseLib = require("./platform-project-service-base");
var androidDebugBridgePath = require("../common/mobile/android/android-debug-bridge");
var AndroidProjectService = (function (_super) {
    __extends(AndroidProjectService, _super);
    function AndroidProjectService($androidEmulatorServices, $androidToolsInfo, $childProcess, $errors, $fs, $hostInfo, $logger, $options, $projectData, $projectDataService, $sysInfo, $mobileHelper, $injector) {
        _super.call(this, $fs, $projectData, $projectDataService);
        this.$androidEmulatorServices = $androidEmulatorServices;
        this.$androidToolsInfo = $androidToolsInfo;
        this.$childProcess = $childProcess;
        this.$errors = $errors;
        this.$hostInfo = $hostInfo;
        this.$logger = $logger;
        this.$options = $options;
        this.$sysInfo = $sysInfo;
        this.$mobileHelper = $mobileHelper;
        this.$injector = $injector;
        this._platformData = null;
        this._androidProjectPropertiesManagers = Object.create(null);
    }
    Object.defineProperty(AndroidProjectService.prototype, "platformData", {
        get: function () {
            if (!this._platformData) {
                var projectRoot = path.join(this.$projectData.platformsDir, "android");
                var packageName = this.getProjectNameFromId();
                this._platformData = {
                    frameworkPackageName: "tns-android",
                    normalizedPlatformName: "Android",
                    appDestinationDirectoryPath: path.join(projectRoot, "src", "main", "assets"),
                    platformProjectService: this,
                    emulatorServices: this.$androidEmulatorServices,
                    projectRoot: projectRoot,
                    deviceBuildOutputPath: path.join(projectRoot, "build", "outputs", "apk"),
                    validPackageNamesForDevice: [
                        (packageName + "-debug.apk"),
                        (packageName + "-release.apk"),
                        (this.$projectData.projectName + "-debug.apk"),
                        (this.$projectData.projectName + "-release.apk")
                    ],
                    frameworkFilesExtensions: [".jar", ".dat", ".so"],
                    configurationFileName: "AndroidManifest.xml",
                    configurationFilePath: path.join(projectRoot, "src", "main", "AndroidManifest.xml"),
                    relativeToFrameworkConfigurationFilePath: path.join("src", "main", "AndroidManifest.xml"),
                    mergeXmlConfig: [{ "nodename": "manifest", "attrname": "*" }, { "nodename": "application", "attrname": "*" }]
                };
            }
            return this._platformData;
        },
        enumerable: true,
        configurable: true
    });
    AndroidProjectService.prototype.getAppResourcesDestinationDirectoryPath = function (frameworkVersion) {
        var _this = this;
        return (function () {
            if (_this.canUseGradle(frameworkVersion).wait()) {
                return path.join(_this.platformData.projectRoot, "src", "main", "res");
            }
            return path.join(_this.platformData.projectRoot, "res");
        }).future()();
    };
    AndroidProjectService.prototype.validate = function () {
        var _this = this;
        return (function () {
            _this.validatePackageName(_this.$projectData.projectId);
            _this.validateProjectName(_this.$projectData.projectName);
            _this.$androidToolsInfo.getPathToAndroidExecutable({ showWarningsAsErrors: true }).wait();
            _this.$androidToolsInfo.validateJavacVersion(_this.$sysInfo.getSysInfo(path.join(__dirname, "..", "..", "package.json")).wait().javacVersion, { showWarningsAsErrors: true }).wait();
        }).future()();
    };
    AndroidProjectService.prototype.createProject = function (frameworkDir, frameworkVersion) {
        var _this = this;
        return (function () {
            if (semver.lt(frameworkVersion, AndroidProjectService.MIN_RUNTIME_VERSION_WITH_GRADLE)) {
                _this.$errors.failWithoutHelp("The NativeScript CLI requires Android runtime " + AndroidProjectService.MIN_RUNTIME_VERSION_WITH_GRADLE + " or later to work properly.");
            }
            _this.$fs.ensureDirectoryExists(_this.platformData.projectRoot).wait();
            _this.$androidToolsInfo.validateInfo({ showWarningsAsErrors: true, validateTargetSdk: true }).wait();
            var androidToolsInfo = _this.$androidToolsInfo.getToolsInfo().wait();
            var targetSdkVersion = androidToolsInfo.targetSdkVersion;
            _this.$logger.trace("Using Android SDK '" + targetSdkVersion + "'.");
            if (_this.$options.symlink) {
                _this.symlinkDirectory("build-tools", _this.platformData.projectRoot, frameworkDir).wait();
                _this.symlinkDirectory("libs", _this.platformData.projectRoot, frameworkDir).wait();
            }
            else {
                _this.copy(_this.platformData.projectRoot, frameworkDir, "build-tools libs", "-R");
            }
            _this.copy(_this.platformData.projectRoot, frameworkDir, "src", "-R");
            _this.copy(_this.platformData.projectRoot, frameworkDir, "build.gradle settings.gradle gradle.properties", "-f");
            if (_this.useGradleWrapper(frameworkDir)) {
                _this.copy(_this.platformData.projectRoot, frameworkDir, "gradle", "-R");
                _this.copy(_this.platformData.projectRoot, frameworkDir, "gradlew gradlew.bat", "-f");
            }
            _this.cleanResValues(targetSdkVersion, frameworkVersion).wait();
        }).future()();
    };
    AndroidProjectService.prototype.useGradleWrapper = function (frameworkDir) {
        var gradlew = path.join(frameworkDir, "gradlew");
        return this.$fs.exists(gradlew).wait();
    };
    AndroidProjectService.prototype.cleanResValues = function (targetSdkVersion, frameworkVersion) {
        var _this = this;
        return (function () {
            var resDestinationDir = _this.getAppResourcesDestinationDirectoryPath(frameworkVersion).wait();
            var directoriesInResFolder = _this.$fs.readDirectory(resDestinationDir).wait();
            var directoriesToClean = directoriesInResFolder
                .map(function (dir) {
                return {
                    dirName: dir,
                    sdkNum: parseInt(dir.substr(AndroidProjectService.VALUES_VERSION_DIRNAME_PREFIX.length))
                };
            })
                .filter(function (dir) { return dir.dirName.match(AndroidProjectService.VALUES_VERSION_DIRNAME_PREFIX)
                && dir.sdkNum
                && (!targetSdkVersion || (targetSdkVersion < dir.sdkNum)); })
                .map(function (dir) { return path.join(resDestinationDir, dir.dirName); });
            _this.$logger.trace("Directories to clean:");
            _this.$logger.trace(directoriesToClean);
            Future.wait(_.map(directoriesToClean, function (dir) { return _this.$fs.deleteDirectory(dir); }));
        }).future()();
    };
    AndroidProjectService.prototype.interpolateData = function () {
        var _this = this;
        return (function () {
            _this.interpolateConfigurationFile().wait();
            var stringsFilePath = path.join(_this.getAppResourcesDestinationDirectoryPath().wait(), 'values', 'strings.xml');
            shell.sed('-i', /__NAME__/, _this.$projectData.projectName, stringsFilePath);
            shell.sed('-i', /__TITLE_ACTIVITY__/, _this.$projectData.projectName, stringsFilePath);
            var gradleSettingsFilePath = path.join(_this.platformData.projectRoot, "settings.gradle");
            shell.sed('-i', /__PROJECT_NAME__/, _this.getProjectNameFromId(), gradleSettingsFilePath);
        }).future()();
    };
    AndroidProjectService.prototype.interpolateConfigurationFile = function () {
        var _this = this;
        return (function () {
            var manifestPath = _this.platformData.configurationFilePath;
            shell.sed('-i', /__PACKAGE__/, _this.$projectData.projectId, manifestPath);
            shell.sed('-i', /__APILEVEL__/, _this.$options.sdk || _this.$androidToolsInfo.getToolsInfo().wait().compileSdkVersion.toString(), manifestPath);
        }).future()();
    };
    AndroidProjectService.prototype.getProjectNameFromId = function () {
        var id;
        if (this.$projectData && this.$projectData.projectId) {
            id = this.$projectData.projectId.split(".")[2];
        }
        return id;
    };
    AndroidProjectService.prototype.afterCreateProject = function (projectRoot) {
        return Future.fromResult();
    };
    AndroidProjectService.prototype.canUpdatePlatform = function (currentVersion, newVersion) {
        return Future.fromResult(true);
    };
    AndroidProjectService.prototype.updatePlatform = function (currentVersion, newVersion, canUpdate, addPlatform, removePlatforms) {
        var _this = this;
        return (function () {
            if (semver.eq(newVersion, AndroidProjectService.MIN_RUNTIME_VERSION_WITH_GRADLE)) {
                var platformLowercase = _this.platformData.normalizedPlatformName.toLowerCase();
                removePlatforms([platformLowercase.split("@")[0]]).wait();
                addPlatform(platformLowercase).wait();
                return false;
            }
            return true;
        }).future()();
    };
    AndroidProjectService.prototype.buildProject = function (projectRoot, buildConfig) {
        var _this = this;
        return (function () {
            if (_this.canUseGradle().wait()) {
                _this.$androidToolsInfo.validateInfo({ showWarningsAsErrors: true, validateTargetSdk: true }).wait();
                var androidToolsInfo = _this.$androidToolsInfo.getToolsInfo().wait();
                var compileSdk = androidToolsInfo.compileSdkVersion;
                var targetSdk = _this.getTargetFromAndroidManifest().wait() || compileSdk;
                var buildToolsVersion = androidToolsInfo.buildToolsVersion;
                var appCompatVersion = androidToolsInfo.supportRepositoryVersion;
                var buildOptions = ["buildapk",
                    ("-PcompileSdk=android-" + compileSdk),
                    ("-PtargetSdk=" + targetSdk),
                    ("-PbuildToolsVersion=" + buildToolsVersion),
                    ("-PsupportVersion=" + appCompatVersion),
                ];
                if (_this.$options.release) {
                    buildOptions.push("-Prelease");
                    buildOptions.push("-PksPath=" + path.resolve(_this.$options.keyStorePath));
                    buildOptions.push("-Palias=" + _this.$options.keyStoreAlias);
                    buildOptions.push("-Ppassword=" + _this.$options.keyStoreAliasPassword);
                    buildOptions.push("-PksPassword=" + _this.$options.keyStorePassword);
                }
                if (buildConfig && buildConfig.runSbGenerator) {
                    buildOptions.push("-PrunSBGenerator");
                }
                var gradleBin = _this.useGradleWrapper(projectRoot) ? path.join(projectRoot, "gradlew") : "gradle";
                if (_this.$hostInfo.isWindows) {
                    gradleBin += ".bat";
                }
                _this.spawn(gradleBin, buildOptions, { stdio: "inherit", cwd: _this.platformData.projectRoot }).wait();
            }
            else {
                _this.checkAnt().wait();
                var args = _this.getAntArgs(_this.$options.release ? "release" : "debug", projectRoot);
                _this.spawn('ant', args).wait();
                _this.platformData.deviceBuildOutputPath = path.join(_this.platformData.projectRoot, "bin");
            }
        }).future()();
    };
    AndroidProjectService.prototype.isPlatformPrepared = function (projectRoot) {
        return this.$fs.exists(path.join(this.platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME));
    };
    AndroidProjectService.prototype.addLibrary = function (libraryPath) {
        var _this = this;
        return (function () {
            if (_this.$fs.exists(path.join(libraryPath, "project.properties")).wait()) {
                _this.$errors.failWithoutHelp("Unable to add android library. You can use `library add` command only with path to folder containing one or more .jar files.");
            }
            var name = path.basename(libraryPath);
            var targetLibPath = _this.getLibraryPath(name);
            var targetPath = path.dirname(targetLibPath);
            _this.$fs.ensureDirectoryExists(targetPath).wait();
            shell.cp("-f", path.join(libraryPath, "*.jar"), targetPath);
        }).future()();
    };
    AndroidProjectService.prototype.getFrameworkFilesExtensions = function () {
        return [".jar", ".dat"];
    };
    AndroidProjectService.prototype.prepareProject = function () {
        return Future.fromResult();
    };
    AndroidProjectService.prototype.prepareAppResources = function (appResourcesDirectoryPath) {
        var _this = this;
        return (function () {
            var resourcesDirPath = path.join(appResourcesDirectoryPath, _this.platformData.normalizedPlatformName);
            var valuesDirRegExp = /^values/;
            var resourcesDirs = _this.$fs.readDirectory(resourcesDirPath).wait().filter(function (resDir) { return !resDir.match(valuesDirRegExp); });
            _.each(resourcesDirs, function (resourceDir) {
                _this.$fs.deleteDirectory(path.join(_this.getAppResourcesDestinationDirectoryPath().wait(), resourceDir)).wait();
            });
        }).future()();
    };
    AndroidProjectService.prototype.preparePluginNativeCode = function (pluginData) {
        var _this = this;
        return (function () {
            var pluginPlatformsFolderPath = _this.getPluginPlatformsFolderPath(pluginData, AndroidProjectService.ANDROID_PLATFORM_NAME);
            _this.processResourcesFromPlugin(pluginData.name, pluginPlatformsFolderPath).wait();
        }).future()();
    };
    AndroidProjectService.prototype.processConfigurationFilesFromAppResources = function () {
        var _this = this;
        return (function () {
            var manifestFilePath = path.join(_this.$projectData.appResourcesDirectoryPath, _this.platformData.normalizedPlatformName, _this.platformData.configurationFileName);
            if (_this.$fs.exists(manifestFilePath).wait()) {
                _this.processResourcesFromPlugin("NativescriptAppResources", path.dirname(manifestFilePath)).wait();
            }
        }).future()();
    };
    AndroidProjectService.prototype.processResourcesFromPlugin = function (pluginName, pluginPlatformsFolderPath) {
        var _this = this;
        return (function () {
            var configurationsDirectoryPath = path.join(_this.platformData.projectRoot, "configurations");
            _this.$fs.ensureDirectoryExists(configurationsDirectoryPath).wait();
            var pluginConfigurationDirectoryPath = path.join(configurationsDirectoryPath, pluginName);
            if (_this.$fs.exists(pluginPlatformsFolderPath).wait()) {
                _this.$fs.ensureDirectoryExists(pluginConfigurationDirectoryPath).wait();
                var resourcesDestinationDirectoryPath = path.join(_this.platformData.projectRoot, "src", pluginName);
                _this.$fs.ensureDirectoryExists(resourcesDestinationDirectoryPath).wait();
                shell.cp("-Rf", path.join(pluginPlatformsFolderPath, "*"), resourcesDestinationDirectoryPath);
            }
            var includeGradleFilePath = path.join(pluginPlatformsFolderPath, "include.gradle");
            if (_this.$fs.exists(includeGradleFilePath).wait()) {
                shell.cp("-f", includeGradleFilePath, pluginConfigurationDirectoryPath);
            }
        }).future()();
    };
    AndroidProjectService.prototype.removePluginNativeCode = function (pluginData) {
        var _this = this;
        return (function () {
            try {
                _this.$fs.deleteDirectory(path.join(_this.platformData.projectRoot, "configurations", pluginData.name)).wait();
                _this.$fs.deleteDirectory(path.join(_this.platformData.projectRoot, "src", pluginData.name)).wait();
            }
            catch (e) {
                if (e.code === "ENOENT") {
                    _this.$logger.debug("No native code jars found: " + e.message);
                }
                else {
                    throw e;
                }
            }
        }).future()();
    };
    AndroidProjectService.prototype.afterPrepareAllPlugins = function () {
        return Future.fromResult();
    };
    AndroidProjectService.prototype.deploy = function (deviceIdentifier) {
        var _this = this;
        return (function () {
            var adb = _this.$injector.resolve(androidDebugBridgePath.AndroidDebugBridge, { identifier: deviceIdentifier });
            var deviceRootPath = "/data/local/tmp/" + _this.$projectData.projectId;
            adb.executeShellCommand(["rm", "-rf", _this.$mobileHelper.buildDevicePath(deviceRootPath, "fullsync"),
                _this.$mobileHelper.buildDevicePath(deviceRootPath, "sync"),
                _this.$mobileHelper.buildDevicePath(deviceRootPath, "removedsync")]).wait();
        }).future()();
    };
    AndroidProjectService.prototype.canUseGradle = function (frameworkVersion) {
        var _this = this;
        return (function () {
            if (!_this._canUseGradle) {
                if (!frameworkVersion) {
                    _this.$projectDataService.initialize(_this.$projectData.projectDir);
                    frameworkVersion = _this.$projectDataService.getValue(_this.platformData.frameworkPackageName).wait().version;
                }
                _this._canUseGradle = semver.gte(frameworkVersion, AndroidProjectService.MIN_RUNTIME_VERSION_WITH_GRADLE);
            }
            return _this._canUseGradle;
        }).future()();
    };
    AndroidProjectService.prototype.getLibraryPath = function (libraryName) {
        return path.join(this.$projectData.projectDir, "lib", this.platformData.normalizedPlatformName, libraryName);
    };
    AndroidProjectService.prototype.copy = function (projectRoot, frameworkDir, files, cpArg) {
        var paths = files.split(' ').map(function (p) { return path.join(frameworkDir, p); });
        shell.cp(cpArg, paths, projectRoot);
    };
    AndroidProjectService.prototype.spawn = function (command, args, opts) {
        return this.$childProcess.spawnFromEvent(command, args, "close", opts || { stdio: "inherit" });
    };
    AndroidProjectService.prototype.getAntArgs = function (configuration, projectRoot) {
        var args = [configuration, "-f", path.join(projectRoot, "build.xml")];
        if (configuration === "release") {
            if (this.$options.keyStorePath) {
                args = args.concat(["-Dkey.store", path.resolve(this.$options.keyStorePath)]);
            }
            if (this.$options.keyStorePassword) {
                args = args.concat(["-Dkey.store.password", this.$options.keyStorePassword]);
            }
            if (this.$options.keyStoreAlias) {
                args = args.concat(["-Dkey.alias", this.$options.keyStoreAlias]);
            }
            if (this.$options.keyStoreAliasPassword) {
                args = args.concat(["-Dkey.alias.password", this.$options.keyStoreAliasPassword]);
            }
        }
        args = args.concat(["-Dns.resources", path.join(__dirname, "../../resources/tools")]);
        return args;
    };
    AndroidProjectService.prototype.validatePackageName = function (packageName) {
        if (!/^[a-zA-Z]+(\.[a-zA-Z0-9][a-zA-Z0-9_]*)+$/.test(packageName)) {
            this.$errors.fail("Package name must look like: com.company.Name");
        }
        if (/\b[Cc]lass\b/.test(packageName)) {
            this.$errors.fail("class is a reserved word");
        }
    };
    AndroidProjectService.prototype.validateProjectName = function (projectName) {
        if (projectName === '') {
            this.$errors.fail("Project name cannot be empty");
        }
        if (/^[0-9]/.test(projectName)) {
            this.$errors.fail("Project name must not begin with a number");
        }
    };
    AndroidProjectService.prototype.getTargetFromAndroidManifest = function () {
        var _this = this;
        return (function () {
            var versionInManifest;
            if (_this.$fs.exists(_this.platformData.configurationFilePath).wait()) {
                var targetFromAndroidManifest = _this.$fs.readText(_this.platformData.configurationFilePath).wait();
                if (targetFromAndroidManifest) {
                    var match = targetFromAndroidManifest.match(/.*?android:targetSdkVersion=\"(.*?)\"/);
                    if (match && match[1]) {
                        versionInManifest = match[1];
                    }
                }
            }
            return versionInManifest;
        }).future()();
    };
    AndroidProjectService.prototype.checkAnt = function () {
        var _this = this;
        return (function () {
            try {
                _this.$childProcess.exec("ant -version").wait();
            }
            catch (error) {
                _this.$errors.fail("Error executing commands 'ant', make sure you have ant installed and added to your PATH.");
            }
        }).future()();
    };
    AndroidProjectService.prototype.symlinkDirectory = function (directoryName, projectRoot, frameworkDir) {
        var _this = this;
        return (function () {
            _this.$fs.createDirectory(path.join(projectRoot, directoryName)).wait();
            var directoryContent = _this.$fs.readDirectory(path.join(frameworkDir, directoryName)).wait();
            _.each(directoryContent, function (file) {
                var sourceFilePath = path.join(frameworkDir, directoryName, file);
                var destinationFilePath = path.join(projectRoot, directoryName, file);
                if (_this.$fs.getFsStats(sourceFilePath).wait().isFile()) {
                    _this.$fs.symlink(sourceFilePath, destinationFilePath).wait();
                }
                else {
                    _this.$fs.symlink(sourceFilePath, destinationFilePath, "dir").wait();
                }
            });
        }).future()();
    };
    AndroidProjectService.VALUES_DIRNAME = "values";
    AndroidProjectService.VALUES_VERSION_DIRNAME_PREFIX = AndroidProjectService.VALUES_DIRNAME + "-v";
    AndroidProjectService.ANDROID_PLATFORM_NAME = "android";
    AndroidProjectService.MIN_RUNTIME_VERSION_WITH_GRADLE = "1.3.0";
    return AndroidProjectService;
})(projectServiceBaseLib.PlatformProjectServiceBase);
exports.AndroidProjectService = AndroidProjectService;
$injector.register("androidProjectService", AndroidProjectService);
