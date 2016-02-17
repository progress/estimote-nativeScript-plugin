///<reference path="../.d.ts"/>
"use strict";
var ProjectCommandParameter = (function () {
    function ProjectCommandParameter($errors, $logger, $projectNameValidator) {
        this.$errors = $errors;
        this.$logger = $logger;
        this.$projectNameValidator = $projectNameValidator;
        this.mandatory = true;
    }
    ProjectCommandParameter.prototype.validate = function (value) {
        var _this = this;
        return (function () {
            if (!value) {
                _this.$errors.fail("You must specify <App name> when creating a new project.");
            }
            if (value.toUpperCase() === "APP") {
                _this.$logger.warn("You cannot build applications named 'app' in Xcode. Consider creating a project with different name.");
            }
            return _this.$projectNameValidator.validate(value);
        }).future()();
    };
    return ProjectCommandParameter;
})();
exports.ProjectCommandParameter = ProjectCommandParameter;
var CreateProjectCommand = (function () {
    function CreateProjectCommand($projectService, $errors, $logger, $projectNameValidator) {
        this.$projectService = $projectService;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$projectNameValidator = $projectNameValidator;
        this.enableHooks = false;
        this.allowedParameters = [new ProjectCommandParameter(this.$errors, this.$logger, this.$projectNameValidator)];
    }
    CreateProjectCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$projectService.createProject(args[0]).wait();
        }).future()();
    };
    return CreateProjectCommand;
})();
exports.CreateProjectCommand = CreateProjectCommand;
$injector.registerCommand("create", CreateProjectCommand);
