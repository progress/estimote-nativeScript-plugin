///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var semver = require("semver");
var os_1 = require("os");
var AndroidToolsInfo = (function () {
    function AndroidToolsInfo($childProcess, $errors, $fs, $hostInfo, $logger, $options) {
        this.$childProcess = $childProcess;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$hostInfo = $hostInfo;
        this.$logger = $logger;
        this.$options = $options;
        this.installedTargetsCache = null;
        this.androidHome = process.env["ANDROID_HOME"];
        this._cachedAndroidHomeValidationResult = null;
    }
    Object.defineProperty(AndroidToolsInfo.prototype, "androidExecutableName", {
        get: function () {
            if (!this._androidExecutableName) {
                this._androidExecutableName = "android";
                if (this.$hostInfo.isWindows) {
                    this._androidExecutableName += ".bat";
                }
            }
            return this._androidExecutableName;
        },
        enumerable: true,
        configurable: true
    });
    AndroidToolsInfo.prototype.getPathToAndroidExecutable = function (options) {
        var _this = this;
        return (function () {
            if (options) {
                _this.showWarningsAsErrors = options.showWarningsAsErrors;
            }
            if (!_this.pathToAndroidExecutable) {
                if (_this.validateAndroidHomeEnvVariable(_this.androidHome).wait()) {
                    var androidPath = path.join(_this.androidHome, "tools", _this.androidExecutableName);
                    if (!_this.trySetAndroidPath(androidPath).wait() && !_this.trySetAndroidPath(_this.androidExecutableName).wait()) {
                        _this.printMessage("Unable to find \"" + _this.androidExecutableName + "\" executable file. Make sure you have set ANDROID_HOME environment variable correctly.");
                    }
                }
                else {
                    _this.$logger.trace("ANDROID_HOME environment variable is not set correctly.");
                }
            }
            return _this.pathToAndroidExecutable;
        }).future()();
    };
    AndroidToolsInfo.prototype.trySetAndroidPath = function (androidPath) {
        var _this = this;
        return (function () {
            var isAndroidPathCorrect = true;
            try {
                var result = _this.$childProcess.spawnFromEvent(androidPath, ["--help"], "close", {}, { throwError: false }).wait();
                if (result && result.stdout) {
                    _this.$logger.trace(result.stdout);
                    _this.pathToAndroidExecutable = androidPath;
                }
                else {
                    _this.$logger.trace("Unable to find android executable from '" + androidPath + "'.");
                    isAndroidPathCorrect = false;
                }
            }
            catch (err) {
                _this.$logger.trace("Error occurred while checking androidExecutable from '" + androidPath + "'. " + err.message);
                isAndroidPathCorrect = false;
            }
            return isAndroidPathCorrect;
        }).future()();
    };
    AndroidToolsInfo.prototype.getToolsInfo = function () {
        var _this = this;
        return (function () {
            if (!_this.toolsInfo) {
                var infoData = Object.create(null);
                infoData.androidHomeEnvVar = _this.androidHome;
                infoData.compileSdkVersion = _this.getCompileSdk().wait();
                infoData.buildToolsVersion = _this.getBuildToolsVersion().wait();
                infoData.targetSdkVersion = _this.getTargetSdk().wait();
                infoData.supportRepositoryVersion = _this.getAndroidSupportRepositoryVersion().wait();
                _this.toolsInfo = infoData;
            }
            return _this.toolsInfo;
        }).future()();
    };
    AndroidToolsInfo.prototype.validateInfo = function (options) {
        var _this = this;
        return (function () {
            var detectedErrors = false;
            _this.showWarningsAsErrors = options && options.showWarningsAsErrors;
            var toolsInfoData = _this.getToolsInfo().wait();
            var isAndroidHomeValid = _this.validateAndroidHomeEnvVariable(toolsInfoData.androidHomeEnvVar).wait();
            if (!toolsInfoData.compileSdkVersion) {
                _this.printMessage("Cannot find a compatible Android SDK for compilation. To be able to build for Android, install Android SDK " + AndroidToolsInfo.MIN_REQUIRED_COMPILE_TARGET + " or later.", "Run `$ android` to manage your Android SDK versions.");
                detectedErrors = true;
            }
            if (!toolsInfoData.buildToolsVersion) {
                var buildToolsRange = _this.getBuildToolsRange();
                var versionRangeMatches = buildToolsRange.match(/^.*?([\d\.]+)\s+.*?([\d\.]+)$/);
                var message = "You can install any version in the following range: '" + buildToolsRange + "'.";
                if (versionRangeMatches && versionRangeMatches[1] && versionRangeMatches[2] && versionRangeMatches[1] === versionRangeMatches[2]) {
                    message = "You have to install version " + versionRangeMatches[1] + ".";
                }
                var invalidBuildToolsAdditionalMsg = 'Run `android` from your command-line to install required `Android Build Tools`.';
                if (!isAndroidHomeValid) {
                    invalidBuildToolsAdditionalMsg += ' In case you already have them installed, make sure `ANDROID_HOME` environment variable is set correctly.';
                }
                _this.printMessage("You need to have the Android SDK Build-tools installed on your system. " + message, invalidBuildToolsAdditionalMsg);
                detectedErrors = true;
            }
            if (!toolsInfoData.supportRepositoryVersion) {
                var invalidSupportLibAdditionalMsg = 'Run `$ android`  to manage the Android Support Repository.';
                if (!isAndroidHomeValid) {
                    invalidSupportLibAdditionalMsg += ' In case you already have it installed, make sure `ANDROID_HOME` environment variable is set correctly.';
                }
                _this.printMessage("You need to have Android SDK " + AndroidToolsInfo.MIN_REQUIRED_COMPILE_TARGET + " or later and the latest Android Support Repository installed on your system.", invalidSupportLibAdditionalMsg);
                detectedErrors = true;
            }
            if (options && options.validateTargetSdk) {
                var targetSdk = toolsInfoData.targetSdkVersion;
                var newTarget = AndroidToolsInfo.ANDROID_TARGET_PREFIX + "-" + targetSdk;
                if (!_.contains(AndroidToolsInfo.SUPPORTED_TARGETS, newTarget)) {
                    var supportedVersions = AndroidToolsInfo.SUPPORTED_TARGETS.sort();
                    var minSupportedVersion = _this.parseAndroidSdkString(_.first(supportedVersions));
                    if (targetSdk && (targetSdk < minSupportedVersion)) {
                        _this.printMessage("The selected Android target SDK " + newTarget + " is not supported. You must target " + minSupportedVersion + " or later.");
                        detectedErrors = true;
                    }
                    else if (!targetSdk || targetSdk > _this.getMaxSupportedVersion()) {
                        _this.$logger.warn("Support for the selected Android target SDK " + newTarget + " is not verified. Your Android app might not work as expected.");
                    }
                }
            }
            return detectedErrors || !isAndroidHomeValid;
        }).future()();
    };
    AndroidToolsInfo.prototype.validateJavacVersion = function (installedJavaVersion, options) {
        var _this = this;
        return (function () {
            var hasProblemWithJavaVersion = false;
            if (options) {
                _this.showWarningsAsErrors = options.showWarningsAsErrors;
            }
            var additionalMessage = "You will not be able to build your projects for Android." + os_1.EOL
                + "To be able to build for Android, verify that you have installed The Java Development Kit (JDK) and configured it according to system requirements as" + os_1.EOL +
                " described in https://github.com/NativeScript/nativescript-cli#system-requirements.";
            var matchingVersion = (installedJavaVersion || "").match(AndroidToolsInfo.VERSION_REGEX);
            if (matchingVersion && matchingVersion[1]) {
                if (semver.lt(matchingVersion[1], AndroidToolsInfo.MIN_JAVA_VERSION)) {
                    hasProblemWithJavaVersion = true;
                    _this.printMessage("Javac version " + installedJavaVersion + " is not supported. You have to install at least " + AndroidToolsInfo.MIN_JAVA_VERSION + ".", additionalMessage);
                }
            }
            else {
                hasProblemWithJavaVersion = true;
                _this.printMessage("Error executing command 'javac'. Make sure you have installed The Java Development Kit (JDK) and set JAVA_HOME environment variable.", additionalMessage);
            }
            return hasProblemWithJavaVersion;
        }).future()();
    };
    AndroidToolsInfo.prototype.getPathToAdbFromAndroidHome = function () {
        var _this = this;
        return (function () {
            if (_this.androidHome) {
                var pathToAdb = path.join(_this.androidHome, "platform-tools", "adb");
                try {
                    _this.$childProcess.execFile(pathToAdb, ["help"]).wait();
                    return pathToAdb;
                }
                catch (err) {
                    _this.$logger.trace("Error while executing '" + pathToAdb + " help'. Error is: " + err.message);
                }
            }
            return null;
        }).future()();
    };
    AndroidToolsInfo.prototype.printMessage = function (msg, additionalMsg) {
        if (this.showWarningsAsErrors) {
            this.$errors.failWithoutHelp(msg);
        }
        else {
            this.$logger.warn(msg);
        }
        if (additionalMsg) {
            this.$logger.printMarkdown(additionalMsg);
        }
    };
    AndroidToolsInfo.prototype.getCompileSdk = function () {
        var _this = this;
        return (function () {
            if (!_this.selectedCompileSdk) {
                var userSpecifiedCompileSdk = _this.$options.compileSdk;
                if (userSpecifiedCompileSdk) {
                    var installedTargets = _this.getInstalledTargets().wait();
                    var androidCompileSdk = AndroidToolsInfo.ANDROID_TARGET_PREFIX + "-" + userSpecifiedCompileSdk;
                    if (!_.contains(installedTargets, androidCompileSdk)) {
                        _this.$errors.failWithoutHelp("You have specified '" + userSpecifiedCompileSdk + "' for compile sdk, but it is not installed on your system.");
                    }
                    _this.selectedCompileSdk = userSpecifiedCompileSdk;
                }
                else {
                    var latestValidAndroidTarget = _this.getLatestValidAndroidTarget().wait();
                    if (latestValidAndroidTarget) {
                        var integerVersion = _this.parseAndroidSdkString(latestValidAndroidTarget);
                        if (integerVersion && integerVersion >= AndroidToolsInfo.MIN_REQUIRED_COMPILE_TARGET) {
                            _this.selectedCompileSdk = integerVersion;
                        }
                    }
                }
            }
            return _this.selectedCompileSdk;
        }).future()();
    };
    AndroidToolsInfo.prototype.getTargetSdk = function () {
        var _this = this;
        return (function () {
            var targetSdk = _this.$options.sdk ? parseInt(_this.$options.sdk) : _this.getCompileSdk().wait();
            _this.$logger.trace("Selected targetSdk is: " + targetSdk);
            return targetSdk;
        }).future()();
    };
    AndroidToolsInfo.prototype.getMatchingDir = function (pathToDir, versionRange) {
        var _this = this;
        return (function () {
            var selectedVersion;
            if (_this.$fs.exists(pathToDir).wait()) {
                var subDirs = _this.$fs.readDirectory(pathToDir).wait();
                _this.$logger.trace("Directories found in " + pathToDir + " are " + subDirs.join(", "));
                var subDirsVersions = subDirs
                    .map(function (dirName) {
                    var dirNameGroups = dirName.match(AndroidToolsInfo.VERSION_REGEX);
                    if (dirNameGroups) {
                        return dirNameGroups[1];
                    }
                    return null;
                })
                    .filter(function (dirName) { return !!dirName; });
                _this.$logger.trace("Versions found in " + pathToDir + " are " + subDirsVersions.join(", "));
                var version = semver.maxSatisfying(subDirsVersions, versionRange);
                if (version) {
                    selectedVersion = _.find(subDirs, function (dir) { return dir.indexOf(version) !== -1; });
                }
            }
            return selectedVersion;
        }).future()();
    };
    AndroidToolsInfo.prototype.getBuildToolsRange = function () {
        return AndroidToolsInfo.REQUIRED_BUILD_TOOLS_RANGE_PREFIX + " <=" + this.getMaxSupportedVersion();
    };
    AndroidToolsInfo.prototype.getBuildToolsVersion = function () {
        var _this = this;
        return (function () {
            var buildToolsVersion;
            if (_this.androidHome) {
                var pathToBuildTools = path.join(_this.androidHome, "build-tools");
                var buildToolsRange = _this.getBuildToolsRange();
                buildToolsVersion = _this.getMatchingDir(pathToBuildTools, buildToolsRange).wait();
            }
            return buildToolsVersion;
        }).future()();
    };
    AndroidToolsInfo.prototype.getAppCompatRange = function () {
        var _this = this;
        return (function () {
            var compileSdkVersion = _this.getCompileSdk().wait();
            var requiredAppCompatRange;
            if (compileSdkVersion) {
                requiredAppCompatRange = ">=" + compileSdkVersion + " <" + (compileSdkVersion + 1);
            }
            return requiredAppCompatRange;
        }).future()();
    };
    AndroidToolsInfo.prototype.getAndroidSupportRepositoryVersion = function () {
        var _this = this;
        return (function () {
            var selectedAppCompatVersion;
            var requiredAppCompatRange = _this.getAppCompatRange().wait();
            if (_this.androidHome && requiredAppCompatRange) {
                var pathToAppCompat = path.join(_this.androidHome, "extras", "android", "m2repository", "com", "android", "support", "appcompat-v7");
                selectedAppCompatVersion = _this.getMatchingDir(pathToAppCompat, requiredAppCompatRange).wait();
            }
            _this.$logger.trace("Selected AppCompat version is: " + selectedAppCompatVersion);
            return selectedAppCompatVersion;
        }).future()();
    };
    AndroidToolsInfo.prototype.getLatestValidAndroidTarget = function () {
        var _this = this;
        return (function () {
            var installedTargets = _this.getInstalledTargets().wait();
            return _.findLast(AndroidToolsInfo.SUPPORTED_TARGETS.sort(), function (supportedTarget) { return _.contains(installedTargets, supportedTarget); });
        }).future()();
    };
    AndroidToolsInfo.prototype.parseAndroidSdkString = function (androidSdkString) {
        return parseInt(androidSdkString.replace(AndroidToolsInfo.ANDROID_TARGET_PREFIX + "-", ""));
    };
    AndroidToolsInfo.prototype.getInstalledTargets = function () {
        var _this = this;
        return (function () {
            if (!_this.installedTargetsCache) {
                try {
                    var pathToAndroidExecutable = _this.getPathToAndroidExecutable().wait();
                    if (pathToAndroidExecutable) {
                        var result = _this.$childProcess.spawnFromEvent(pathToAndroidExecutable, ["list", "targets"], "close", {}, { throwError: false }).wait();
                        if (result && result.stdout) {
                            _this.$logger.trace(result.stdout);
                            _this.installedTargetsCache = [];
                            result.stdout.replace(/id: \d+ or "(.+)"/g, function (m, p1) { return (_this.installedTargetsCache.push(p1), m); });
                        }
                    }
                }
                catch (err) {
                    _this.$logger.trace("Unable to get Android targets. Error is: " + err);
                }
            }
            return _this.installedTargetsCache;
        }).future()();
    };
    AndroidToolsInfo.prototype.getMaxSupportedVersion = function () {
        return this.parseAndroidSdkString(_.last(AndroidToolsInfo.SUPPORTED_TARGETS.sort()));
    };
    AndroidToolsInfo.prototype.validateAndroidHomeEnvVariable = function (androidHomeEnvVar) {
        var _this = this;
        return (function () {
            if (_this._cachedAndroidHomeValidationResult === null) {
                _this._cachedAndroidHomeValidationResult = true;
                var expectedDirectoriesInAndroidHome = ["build-tools", "tools", "platform-tools", "extras"];
                if (!androidHomeEnvVar || !_this.$fs.exists(androidHomeEnvVar).wait()) {
                    _this.printMessage("The ANDROID_HOME environment variable is not set or it points to a non-existent directory. You will not be able to perform any build-related operations for Android.", "To be able to perform Android build-related operations, set the `ANDROID_HOME` variable to point to the root of your Android SDK installation directory.");
                    _this._cachedAndroidHomeValidationResult = false;
                }
                else if (!_.any(expectedDirectoriesInAndroidHome.map(function (dir) { return _this.$fs.exists(path.join(androidHomeEnvVar, dir)).wait(); }))) {
                    _this.printMessage("The ANDROID_HOME environment variable points to incorrect directory. You will not be able to perform any build-related operations for Android.", "To be able to perform Android build-related operations, set the `ANDROID_HOME` variable to point to the root of your Android SDK installation directory, " +
                        "where you will find `tools` and `platform-tools` directories.");
                    _this._cachedAndroidHomeValidationResult = false;
                }
            }
            return _this._cachedAndroidHomeValidationResult;
        }).future()();
    };
    AndroidToolsInfo.ANDROID_TARGET_PREFIX = "android";
    AndroidToolsInfo.SUPPORTED_TARGETS = ["android-17", "android-18", "android-19", "android-21", "android-22", "android-23"];
    AndroidToolsInfo.MIN_REQUIRED_COMPILE_TARGET = 22;
    AndroidToolsInfo.REQUIRED_BUILD_TOOLS_RANGE_PREFIX = ">=22";
    AndroidToolsInfo.VERSION_REGEX = /((\d+\.){2}\d+)/;
    AndroidToolsInfo.MIN_JAVA_VERSION = "1.7.0";
    return AndroidToolsInfo;
})();
exports.AndroidToolsInfo = AndroidToolsInfo;
$injector.register("androidToolsInfo", AndroidToolsInfo);
