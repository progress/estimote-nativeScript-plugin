///<reference path="../.d.ts"/>
"use strict";
var constants = require("../constants");
var osenv = require("osenv");
var path = require("path");
var shell = require("shelljs");
var ProjectService = (function () {
    function ProjectService($npm, $errors, $fs, $logger, $projectDataService, $projectHelper, $projectNameValidator, $projectTemplatesService, $options) {
        this.$npm = $npm;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$projectDataService = $projectDataService;
        this.$projectHelper = $projectHelper;
        this.$projectNameValidator = $projectNameValidator;
        this.$projectTemplatesService = $projectTemplatesService;
        this.$options = $options;
    }
    ProjectService.prototype.createProject = function (projectName) {
        var _this = this;
        return (function () {
            if (!projectName) {
                _this.$errors.fail("You must specify <App name> when creating a new project.");
            }
            _this.$projectNameValidator.validate(projectName);
            var projectId = _this.$options.appid || _this.$projectHelper.generateDefaultAppId(projectName, constants.DEFAULT_APP_IDENTIFIER_PREFIX);
            var projectDir = path.join(path.resolve(_this.$options.path || "."), projectName);
            _this.$fs.createDirectory(projectDir).wait();
            var customAppPath = _this.getCustomAppPath();
            if (customAppPath) {
                customAppPath = path.resolve(customAppPath);
                if (!_this.$fs.exists(customAppPath).wait()) {
                    _this.$errors.failWithoutHelp("The specified path \"" + customAppPath + "\" doesn't exist. Check that you specified the path correctly and try again.");
                }
                var customAppContents = _this.$fs.enumerateFilesInDirectorySync(customAppPath);
                if (customAppContents.length === 0) {
                    _this.$errors.failWithoutHelp("The specified path \"" + customAppPath + "\" is empty directory.");
                }
            }
            if (_this.$fs.exists(projectDir).wait() && !_this.$fs.isEmptyDir(projectDir).wait()) {
                _this.$errors.fail("Path already exists and is not empty %s", projectDir);
            }
            _this.$logger.trace("Creating a new NativeScript project with name %s and id %s at location %s", projectName, projectId, projectDir);
            var appDirectory = path.join(projectDir, constants.APP_FOLDER_NAME);
            var appPath = null;
            if (customAppPath) {
                _this.$logger.trace("Using custom app from %s", customAppPath);
                var relativePathFromSourceToTarget = path.relative(customAppPath, appDirectory);
                if (relativePathFromSourceToTarget !== appDirectory) {
                    var doesRelativePathGoUpAtLeastOneDir = relativePathFromSourceToTarget.split(path.sep)[0] === "..";
                    if (!doesRelativePathGoUpAtLeastOneDir) {
                        _this.$errors.fail("Project dir %s must not be created at/inside the template used to create the project %s.", projectDir, customAppPath);
                    }
                }
                _this.$logger.trace("Copying custom app into %s", appDirectory);
                appPath = customAppPath;
            }
            else {
                _this.$logger.trace("Using NativeScript hello world application");
                var defaultTemplatePath = _this.$projectTemplatesService.defaultTemplatePath.wait();
                _this.$logger.trace("Copying NativeScript hello world application into %s", appDirectory);
                appPath = defaultTemplatePath;
            }
            try {
                _this.createProjectCore(projectDir, appPath, projectId).wait();
            }
            catch (err) {
                _this.$fs.deleteDirectory(projectDir).wait();
                throw err;
            }
            _this.$logger.out("Project %s was successfully created", projectName);
        }).future()();
    };
    ProjectService.prototype.createProjectCore = function (projectDir, appSourcePath, projectId) {
        var _this = this;
        return (function () {
            _this.$fs.ensureDirectoryExists(projectDir).wait();
            var appDestinationPath = path.join(projectDir, constants.APP_FOLDER_NAME);
            _this.$fs.createDirectory(appDestinationPath).wait();
            if (_this.$options.symlink) {
                _this.$fs.symlink(appSourcePath, appDestinationPath).wait();
            }
            else {
                shell.cp('-R', path.join(appSourcePath, "*"), appDestinationPath);
            }
            _this.createBasicProjectStructure(projectDir, projectId).wait();
        }).future()();
    };
    ProjectService.prototype.createBasicProjectStructure = function (projectDir, projectId) {
        var _this = this;
        return (function () {
            _this.$fs.createDirectory(path.join(projectDir, "platforms")).wait();
            _this.$projectDataService.initialize(projectDir);
            _this.$projectDataService.setValue("id", projectId).wait();
            var tnsModulesVersion = _this.$options.tnsModulesVersion;
            var packageName = constants.TNS_CORE_MODULES_NAME;
            if (tnsModulesVersion) {
                packageName = packageName + "@" + tnsModulesVersion;
            }
            _this.$npm.executeNpmCommand("npm install " + packageName + " --save --save-exact", projectDir).wait();
        }).future()();
    };
    ProjectService.prototype.getCustomAppPath = function () {
        var customAppPath = this.$options.copyFrom || this.$options.linkTo;
        if (customAppPath) {
            if (customAppPath.indexOf("http://") === 0) {
                this.$errors.fail("Only local paths for custom app are supported.");
            }
            if (customAppPath.substr(0, 1) === '~') {
                customAppPath = path.join(osenv.home(), customAppPath.substr(1));
            }
        }
        return customAppPath;
    };
    return ProjectService;
})();
exports.ProjectService = ProjectService;
$injector.register("projectService", ProjectService);
