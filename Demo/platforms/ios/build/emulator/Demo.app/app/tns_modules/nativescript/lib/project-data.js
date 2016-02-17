///<reference path=".d.ts"/>
"use strict";
var constants = require("./constants");
var path = require("path");
var os_1 = require("os");
var ProjectData = (function () {
    function ProjectData($fs, $errors, $logger, $projectHelper, $staticConfig, $options) {
        this.$fs = $fs;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$projectHelper = $projectHelper;
        this.$staticConfig = $staticConfig;
        this.$options = $options;
        this.initializeProjectData().wait();
    }
    ProjectData.prototype.initializeProjectData = function () {
        var _this = this;
        return (function () {
            var projectDir = _this.$projectHelper.projectDir;
            if (projectDir) {
                _this.initializeProjectDataCore(projectDir);
                var data = null;
                if (_this.$fs.exists(_this.projectFilePath).wait()) {
                    var fileContent = null;
                    try {
                        fileContent = _this.$fs.readJson(_this.projectFilePath).wait();
                        data = fileContent[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE];
                    }
                    catch (err) {
                        _this.$errors.fail({ formatStr: "The project file %s is corrupted." + os_1.EOL +
                                "Consider restoring an earlier version from your source control or backup." + os_1.EOL +
                                "Additional technical info: %s",
                            suppressCommandHelp: true }, _this.projectFilePath, err.toString());
                    }
                    if (data) {
                        _this.projectId = data.id;
                        _this.dependencies = fileContent.dependencies;
                    }
                    else {
                        _this.tryToUpgradeProject().wait();
                    }
                }
            }
            else {
                _this.tryToUpgradeProject().wait();
            }
        }).future()();
    };
    ProjectData.prototype.throwNoProjectFoundError = function () {
        this.$errors.fail("No project found at or above '%s' and neither was a --path specified.", this.$options.path || path.resolve("."));
    };
    ProjectData.prototype.tryToUpgradeProject = function () {
        var _this = this;
        return (function () {
            var projectDir = _this.projectDir || path.resolve(_this.$options.path || ".");
            var oldProjectFilePath = path.join(projectDir, ProjectData.OLD_PROJECT_FILE_NAME);
            if (_this.$fs.exists(oldProjectFilePath).wait()) {
                _this.upgrade(projectDir, oldProjectFilePath).wait();
            }
            else {
                _this.throwNoProjectFoundError();
            }
        }).future()();
    };
    ProjectData.prototype.upgrade = function (projectDir, oldProjectFilePath) {
        var _this = this;
        return (function () {
            try {
                var oldProjectData = _this.$fs.readJson(oldProjectFilePath).wait();
                var newProjectFilePath = _this.projectFilePath || path.join(projectDir, _this.$staticConfig.PROJECT_FILE_NAME);
                var newProjectData = _this.$fs.exists(newProjectFilePath).wait() ? _this.$fs.readJson(newProjectFilePath).wait() : {};
                newProjectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE] = oldProjectData;
                _this.$fs.writeJson(newProjectFilePath, newProjectData).wait();
                _this.projectId = newProjectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE].id;
                _this.$fs.deleteFile(oldProjectFilePath).wait();
            }
            catch (err) {
                _this.$logger.out("An error occurred while upgrading your project.");
                throw err;
            }
            _this.initializeProjectDataCore(projectDir);
            _this.$logger.out("Successfully upgraded your project file.");
        }).future()();
    };
    ProjectData.prototype.initializeProjectDataCore = function (projectDir) {
        this.projectDir = projectDir;
        this.projectName = this.$projectHelper.sanitizeName(path.basename(projectDir));
        this.platformsDir = path.join(projectDir, "platforms");
        this.projectFilePath = path.join(projectDir, this.$staticConfig.PROJECT_FILE_NAME);
        this.appDirectoryPath = path.join(projectDir, constants.APP_FOLDER_NAME);
        this.appResourcesDirectoryPath = path.join(projectDir, constants.APP_FOLDER_NAME, constants.APP_RESOURCES_FOLDER_NAME);
    };
    ProjectData.OLD_PROJECT_FILE_NAME = ".tnsproject";
    return ProjectData;
})();
exports.ProjectData = ProjectData;
$injector.register("projectData", ProjectData);
