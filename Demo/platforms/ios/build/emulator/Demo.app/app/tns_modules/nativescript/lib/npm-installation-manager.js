///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var semver = require("semver");
var npm = require("npm");
var constants = require("./constants");
var NpmInstallationManager = (function () {
    function NpmInstallationManager($npm, $logger, $lockfile, $errors, $options, $fs, $staticConfig) {
        this.$npm = $npm;
        this.$logger = $logger;
        this.$lockfile = $lockfile;
        this.$errors = $errors;
        this.$options = $options;
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.packageSpecificDirectories = {
            "tns-android": constants.PROJECT_FRAMEWORK_FOLDER_NAME,
            "tns-ios": constants.PROJECT_FRAMEWORK_FOLDER_NAME,
            "tns-template-hello-world": constants.APP_RESOURCES_FOLDER_NAME
        };
        this.versionsCache = {};
        this.$npm.load().wait();
    }
    NpmInstallationManager.prototype.getCacheRootPath = function () {
        return this.$npm.getCache();
    };
    NpmInstallationManager.prototype.getCachedPackagePath = function (packageName, version) {
        return path.join(this.getCacheRootPath(), packageName, version, "package");
    };
    NpmInstallationManager.prototype.addToCache = function (packageName, version) {
        var _this = this;
        return (function () {
            var cachedPackagePath = _this.getCachedPackagePath(packageName, version);
            if (!_this.$fs.exists(cachedPackagePath).wait() || !_this.$fs.exists(path.join(cachedPackagePath, "framework")).wait()) {
                _this.addToCacheCore(packageName, version).wait();
            }
            if (!_this.isShasumOfPackageCorrect(packageName, version).wait()) {
                _this.addCleanCopyToCache(packageName, version).wait();
            }
        }).future()();
    };
    NpmInstallationManager.prototype.cacheUnpack = function (packageName, version, unpackTarget) {
        unpackTarget = unpackTarget || path.join(npm.cache, packageName, version, "package");
        return this.$npm.cacheUnpack(packageName, version, unpackTarget);
    };
    NpmInstallationManager.prototype.getLatestVersion = function (packageName) {
        var _this = this;
        return (function () {
            var data = _this.$npm.view(packageName, "dist-tags").wait();
            var latestVersion = _.first(_.keys(data));
            _this.$logger.trace("Using version %s. ", latestVersion);
            return latestVersion;
        }).future()();
    };
    NpmInstallationManager.prototype.getLatestCompatibleVersion = function (packageName) {
        var _this = this;
        return (function () {
            var latestVersion = _this.getLatestVersion(packageName).wait();
            var data = _this.$npm.view(packageName, "versions").wait();
            var versions = data[latestVersion].versions;
            var versionData = _this.getVersionData(_this.$staticConfig.version);
            var compatibleVersions = _(versions)
                .map(function (ver) { return _this.getVersionData(ver); })
                .filter(function (verData) { return versionData.major === verData.major && versionData.minor === verData.minor; })
                .sortBy(function (verData) { return verData.patch; })
                .value();
            var result = _.last(compatibleVersions) || _this.getVersionData(latestVersion);
            var latestCompatibleVersion = result.major + "." + result.minor + "." + result.patch;
            return latestCompatibleVersion;
        }).future()();
    };
    NpmInstallationManager.prototype.install = function (packageName, opts) {
        var _this = this;
        return (function () {
            _this.$lockfile.lock().wait();
            try {
                var packageToInstall = packageName;
                var pathToSave = (opts && opts.pathToSave) || npm.cache;
                var version = (opts && opts.version) || null;
                return _this.installCore(packageToInstall, pathToSave, version).wait();
            }
            catch (error) {
                _this.$logger.debug(error);
                _this.$errors.fail("%s. Error: %s", NpmInstallationManager.NPM_LOAD_FAILED, error);
            }
            finally {
                _this.$lockfile.unlock().wait();
            }
        }).future()();
    };
    NpmInstallationManager.prototype.addCleanCopyToCache = function (packageName, version) {
        var _this = this;
        return (function () {
            var packagePath = path.join(_this.getCacheRootPath(), packageName, version);
            _this.$logger.trace("Deleting: " + packagePath + ".");
            _this.$fs.deleteDirectory(packagePath).wait();
            _this.addToCacheCore(packageName, version).wait();
            if (!_this.isShasumOfPackageCorrect(packageName, version).wait()) {
                _this.$errors.failWithoutHelp("Unable to add package " + packageName + " with version " + version + " to npm cache. Try cleaning your cache and execute the command again.");
            }
        }).future()();
    };
    NpmInstallationManager.prototype.addToCacheCore = function (packageName, version) {
        var _this = this;
        return (function () {
            _this.$npm.cache(packageName, version).wait();
            var packagePath = path.join(_this.getCacheRootPath(), packageName, version, "package");
            if (!_this.isPackageUnpacked(packagePath, packageName).wait()) {
                _this.cacheUnpack(packageName, version).wait();
            }
        }).future()();
    };
    NpmInstallationManager.prototype.isShasumOfPackageCorrect = function (packageName, version) {
        var _this = this;
        return (function () {
            var shasumProperty = "dist.shasum";
            var cachedPackagePath = _this.getCachedPackagePath(packageName, version);
            var packageInfo = _this.$npm.view(packageName + "@" + version, shasumProperty).wait();
            if (_.isEmpty(packageInfo)) {
                _this.$logger.trace("Checking shasum of package " + packageName + "@" + version + ": skipped because the package was not found in npmjs.org");
                return true;
            }
            var realShasum = packageInfo[version][shasumProperty];
            var packageTgz = cachedPackagePath + ".tgz";
            var currentShasum = "";
            if (_this.$fs.exists(packageTgz).wait()) {
                currentShasum = _this.$fs.getFileShasum(packageTgz).wait();
            }
            _this.$logger.trace("Checking shasum of package " + packageName + "@" + version + ": expected " + realShasum + ", actual " + currentShasum + ".");
            return realShasum === currentShasum;
        }).future()();
    };
    NpmInstallationManager.prototype.installCore = function (packageName, pathToSave, version) {
        var _this = this;
        return (function () {
            if (_this.$options.frameworkPath) {
                _this.npmInstall(packageName, pathToSave, version).wait();
                var pathToNodeModules = path.join(pathToSave, "node_modules");
                var folders = _this.$fs.readDirectory(pathToNodeModules).wait();
                var data = _this.$fs.readJson(path.join(pathToNodeModules, folders[0], "package.json")).wait();
                if (!_this.isPackageUnpacked(_this.getCachedPackagePath(data.name, data.version), data.name).wait()) {
                    _this.cacheUnpack(data.name, data.version).wait();
                }
                return path.join(pathToNodeModules, folders[0]);
            }
            else {
                version = version || _this.getLatestCompatibleVersion(packageName).wait();
                var packagePath = _this.getCachedPackagePath(packageName, version);
                _this.addToCache(packageName, version).wait();
                return packagePath;
            }
        }).future()();
    };
    NpmInstallationManager.prototype.npmInstall = function (packageName, pathToSave, version) {
        this.$logger.out("Installing ", packageName);
        var incrementedVersion = semver.inc(version, constants.ReleaseType.MINOR);
        if (!this.$options.frameworkPath && packageName.indexOf("@") < 0) {
            packageName = packageName + "@<" + incrementedVersion;
        }
        return this.$npm.install(packageName, pathToSave);
    };
    NpmInstallationManager.prototype.isPackageUnpacked = function (packagePath, packageName) {
        var _this = this;
        return (function () {
            var additionalDirectoryToCheck = _this.packageSpecificDirectories[packageName];
            return _this.$fs.getFsStats(packagePath).wait().isDirectory() &&
                (!additionalDirectoryToCheck || _this.hasFilesInDirectory(path.join(packagePath, additionalDirectoryToCheck)).wait());
        }).future()();
    };
    NpmInstallationManager.prototype.hasFilesInDirectory = function (directory) {
        var _this = this;
        return (function () {
            return _this.$fs.exists(directory).wait() && _this.$fs.enumerateFilesInDirectorySync(directory).length > 0;
        }).future()();
    };
    NpmInstallationManager.prototype.getVersionData = function (version) {
        var _a = version.split("."), major = _a[0], minor = _a[1], patch = _a[2];
        return { major: major, minor: minor, patch: patch };
    };
    NpmInstallationManager.NPM_LOAD_FAILED = "Failed to retrieve data from npm. Please try again a little bit later.";
    return NpmInstallationManager;
})();
exports.NpmInstallationManager = NpmInstallationManager;
$injector.register("npmInstallationManager", NpmInstallationManager);
