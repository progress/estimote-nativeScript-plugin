///<reference path="../../.d.ts"/>
"use strict";
var fs = require("fs");
var path = require("path");
var semver = require("semver");
var shelljs = require("shelljs");
var broccoli_plugin_wrapper_factory_1 = require('./broccoli-plugin-wrapper-factory');
var constants = require("../../constants");
var minimatch = require("minimatch");
var Future = require("fibers/future");
var DestCopy = (function () {
    function DestCopy(inputPath, cachePath, outputRoot, projectDir, platform, $fs, $projectFilesManager, $pluginsService) {
        this.inputPath = inputPath;
        this.cachePath = cachePath;
        this.outputRoot = outputRoot;
        this.projectDir = projectDir;
        this.platform = platform;
        this.$fs = $fs;
        this.$projectFilesManager = $projectFilesManager;
        this.$pluginsService = $pluginsService;
        this.dependencies = null;
        this.devDependencies = null;
        this.dependencies = Object.create(null);
        this.devDependencies = this.getDevDependencies(projectDir);
    }
    DestCopy.prototype.rebuildChangedDirectories = function (changedDirectories, platform) {
        var _this = this;
        _.each(changedDirectories, function (changedDirectoryAbsolutePath) {
            if (!_this.devDependencies[path.basename(changedDirectoryAbsolutePath)]) {
                var pathToPackageJson = path.join(changedDirectoryAbsolutePath, constants.PACKAGE_JSON_FILE_NAME);
                var packageJsonFiles = fs.existsSync(pathToPackageJson) ? [pathToPackageJson] : [];
                var nodeModulesFolderPath = path.join(changedDirectoryAbsolutePath, constants.NODE_MODULES_FOLDER_NAME);
                packageJsonFiles = packageJsonFiles.concat(_this.enumeratePackageJsonFilesSync(nodeModulesFolderPath));
                _.each(packageJsonFiles, function (packageJsonFilePath) {
                    var fileContent = require(packageJsonFilePath);
                    if (!_this.devDependencies[fileContent.name]) {
                        var currentDependency = {
                            name: fileContent.name,
                            version: fileContent.version,
                            directory: path.dirname(packageJsonFilePath),
                            nativescript: fileContent.nativescript
                        };
                        var addedDependency = _this.dependencies[currentDependency.name];
                        if (addedDependency) {
                            if (semver.gt(currentDependency.version, addedDependency.version)) {
                                var currentDependencyMajorVersion = semver.major(currentDependency.version);
                                var addedDependencyMajorVersion = semver.major(addedDependency.version);
                                var message = "The depedency located at " + addedDependency.directory + " with version  " + addedDependency.version + " will be replaced with dependency located at " + currentDependency.directory + " with version " + currentDependency.version;
                                var logger = $injector.resolve("$logger");
                                currentDependencyMajorVersion === addedDependencyMajorVersion ? logger.out(message) : logger.warn(message);
                                _this.dependencies[currentDependency.name] = currentDependency;
                            }
                        }
                        else {
                            _this.dependencies[currentDependency.name] = currentDependency;
                        }
                    }
                });
            }
        });
        _.each(this.dependencies, function (dependency) {
            _this.copyDependencyDir(dependency);
            var isPlugin = !!dependency.nativescript;
            if (isPlugin) {
                _this.$pluginsService.prepare(dependency, platform).wait();
            }
            if (dependency.name === constants.TNS_CORE_MODULES_NAME) {
                var tnsCoreModulesResourcePath = path.join(_this.outputRoot, constants.TNS_CORE_MODULES_NAME);
                var allFiles = _this.$fs.enumerateFilesInDirectorySync(tnsCoreModulesResourcePath);
                var deleteFilesFutures = allFiles.filter(function (file) { return minimatch(file, "**/*.ts", { nocase: true }); }).map(function (file) { return _this.$fs.deleteFile(file); });
                Future.wait(deleteFilesFutures);
                shelljs.cp("-Rf", path.join(tnsCoreModulesResourcePath, "*"), _this.outputRoot);
                _this.$fs.deleteDirectory(tnsCoreModulesResourcePath).wait();
            }
        });
        if (!_.isEmpty(this.dependencies)) {
            this.$pluginsService.afterPrepareAllPlugins().wait();
        }
    };
    DestCopy.prototype.copyDependencyDir = function (dependency) {
        var dependencyDir = path.dirname(dependency.name || "");
        var insideNpmScope = /^@/.test(dependencyDir);
        var targetDir = this.outputRoot;
        if (insideNpmScope) {
            targetDir = path.join(this.outputRoot, dependencyDir);
        }
        shelljs.mkdir("-p", targetDir);
        shelljs.cp("-Rf", dependency.directory, targetDir);
        shelljs.rm("-rf", path.join(targetDir, dependency.name, "node_modules"));
    };
    DestCopy.prototype.rebuild = function (treeDiff) {
        this.rebuildChangedDirectories(treeDiff.changedDirectories, "");
        var projectFilePath = path.join(this.projectDir, constants.PACKAGE_JSON_FILE_NAME);
        var projectFileContent = require(projectFilePath);
        projectFileContent[constants.NATIVESCRIPT_KEY_NAME][constants.NODE_MODULE_CACHE_PATH_KEY_NAME] = this.inputPath;
        fs.writeFileSync(projectFilePath, JSON.stringify(projectFileContent, null, "\t"), { encoding: "utf8" });
    };
    DestCopy.prototype.getDevDependencies = function (projectDir) {
        var projectFilePath = path.join(projectDir, constants.PACKAGE_JSON_FILE_NAME);
        var projectFileContent = require(projectFilePath);
        return projectFileContent.devDependencies || {};
    };
    DestCopy.prototype.enumeratePackageJsonFilesSync = function (nodeModulesDirectoryPath, foundFiles) {
        foundFiles = foundFiles || [];
        if (fs.existsSync(nodeModulesDirectoryPath)) {
            var contents = fs.readdirSync(nodeModulesDirectoryPath);
            for (var i = 0; i < contents.length; ++i) {
                var packageJsonFilePath = path.join(nodeModulesDirectoryPath, contents[i], constants.PACKAGE_JSON_FILE_NAME);
                if (fs.existsSync(packageJsonFilePath)) {
                    foundFiles.push(packageJsonFilePath);
                }
                var directoryPath = path.join(nodeModulesDirectoryPath, contents[i], constants.NODE_MODULES_FOLDER_NAME);
                if (fs.existsSync(directoryPath)) {
                    this.enumeratePackageJsonFilesSync(directoryPath, foundFiles);
                }
            }
        }
        return foundFiles;
    };
    return DestCopy;
})();
exports.DestCopy = DestCopy;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = broccoli_plugin_wrapper_factory_1.wrapBroccoliPlugin(DestCopy);
