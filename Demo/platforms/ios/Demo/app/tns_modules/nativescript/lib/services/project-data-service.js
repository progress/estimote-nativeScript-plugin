///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var assert = require("assert");
var ProjectDataService = (function () {
    function ProjectDataService($fs, $staticConfig, $errors, $logger) {
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.$errors = $errors;
        this.$logger = $logger;
    }
    ProjectDataService.prototype.initialize = function (projectDir) {
        if (!this.projectFilePath) {
            this.projectFilePath = path.join(projectDir, this.$staticConfig.PROJECT_FILE_NAME);
        }
    };
    ProjectDataService.prototype.getValue = function (propertyName) {
        var _this = this;
        return (function () {
            _this.loadProjectFile().wait();
            return _this.projectData ? _this.projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE][propertyName] : null;
        }).future()();
    };
    ProjectDataService.prototype.setValue = function (key, value) {
        var _this = this;
        return (function () {
            _this.loadProjectFile().wait();
            if (!_this.projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE]) {
                _this.projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE] = Object.create(null);
            }
            _this.projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE][key] = value;
            _this.$fs.writeJson(_this.projectFilePath, _this.projectData, "\t").wait();
        }).future()();
    };
    ProjectDataService.prototype.removeProperty = function (propertyName) {
        var _this = this;
        return (function () {
            _this.loadProjectFile().wait();
            delete _this.projectData[_this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE][propertyName];
            _this.$fs.writeJson(_this.projectFilePath, _this.projectData, "\t").wait();
        }).future()();
    };
    ProjectDataService.prototype.removeDependency = function (dependencyName) {
        var _this = this;
        return (function () {
            _this.loadProjectFile().wait();
            delete _this.projectData[ProjectDataService.DEPENDENCIES_KEY_NAME][dependencyName];
            _this.$fs.writeJson(_this.projectFilePath, _this.projectData, "\t").wait();
        }).future()();
    };
    ProjectDataService.prototype.loadProjectFile = function () {
        var _this = this;
        return (function () {
            assert.ok(_this.projectFilePath, "Initialize method of projectDataService is not called.");
            if (!_this.projectData) {
                if (!_this.$fs.exists(_this.projectFilePath).wait()) {
                    _this.$fs.writeFile(_this.projectFilePath, null).wait();
                }
                _this.projectData = _this.$fs.readJson(_this.projectFilePath).wait() || Object.create(null);
            }
        }).future()();
    };
    ProjectDataService.DEPENDENCIES_KEY_NAME = "dependencies";
    return ProjectDataService;
})();
exports.ProjectDataService = ProjectDataService;
$injector.register("projectDataService", ProjectDataService);
