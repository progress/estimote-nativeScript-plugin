///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var helpers = require("../helpers");
var ValidationResult = require("./validation-result");
var ProjectNameValidator = (function () {
    function ProjectNameValidator($errors) {
        this.$errors = $errors;
    }
    ProjectNameValidator.prototype.validateName = function (name) {
        var validNameRegex = /^[a-zA-Z0-9_.\- ]*$/g;
        var ext = path.extname(name);
        if (helpers.isNullOrWhitespace(name)) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.EMPTY_FILENAME_ERROR_MESSAGE);
        }
        if (!validNameRegex.test(name)) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.NOT_VALID_NAME_ERROR_MESSAGE);
        }
        if (_.contains(ProjectNameValidator.INVALID_FILENAMES, name.split(".")[0])) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.RESERVED_NAME_ERROR_MESSAGE);
        }
        if (ext !== "" && _.contains(ProjectNameValidator.INVALID_EXTENSIONS, ext)) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.INVALID_EXTENSION_ERROR_MESSAGE);
        }
        if (name.length > ProjectNameValidator.MAX_FILENAME_LENGTH) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.TOO_LONG_NAME_ERROR_MESSAGE);
        }
        if (_.startsWith(name, " ")) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.LEADING_SPACES_ERROR_MESSAGE);
        }
        if (_.endsWith(name, ".")) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.TRAILING_DOTS_ERROR_MESSAGE);
        }
        if (_.endsWith(name, " ")) {
            return new ValidationResult.ValidationResult(ProjectNameValidator.TRAILING_SPACES_ERROR_MESSAGE);
        }
        return ValidationResult.ValidationResult.Successful;
    };
    ProjectNameValidator.prototype.validate = function (name) {
        var validationResult = this.validateName(name);
        var isSuccessful = validationResult.isSuccessful;
        if (!isSuccessful) {
            this.$errors.fail(validationResult.error);
        }
        return isSuccessful;
    };
    ProjectNameValidator.MAX_FILENAME_LENGTH = 30;
    ProjectNameValidator.EMPTY_FILENAME_ERROR_MESSAGE = "Name cannot be empty.";
    ProjectNameValidator.NOT_VALID_NAME_ERROR_MESSAGE = "Name should contain only the following symbols: A-Z, a-z, 0-9, _, ., - and space";
    ProjectNameValidator.RESERVED_NAME_ERROR_MESSAGE = "Name is among the reserved names: ~, CON, PRN, AUX, NUL, COM1, COM2, COM3, COM4, COM5, COM6, COM7, COM8, COM9, LPT1, LPT2, LPT3, LPT4, LPT5, LPT6, LPT7, LPT8, and LPT9.";
    ProjectNameValidator.INVALID_EXTENSION_ERROR_MESSAGE = "Unsupported file type.";
    ProjectNameValidator.TOO_LONG_NAME_ERROR_MESSAGE = "Name is too long.";
    ProjectNameValidator.TRAILING_DOTS_ERROR_MESSAGE = "Name cannot contain trailing dots.";
    ProjectNameValidator.LEADING_SPACES_ERROR_MESSAGE = "Name cannot contain leading spaces.";
    ProjectNameValidator.TRAILING_SPACES_ERROR_MESSAGE = "Name cannot contain trailing spaces.";
    ProjectNameValidator.INVALID_FILENAMES = ["~", "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];
    ProjectNameValidator.INVALID_EXTENSIONS = [];
    return ProjectNameValidator;
})();
exports.ProjectNameValidator = ProjectNameValidator;
$injector.register("projectNameValidator", ProjectNameValidator);
