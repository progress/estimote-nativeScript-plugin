///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var ProjectHelper = (function () {
    function ProjectHelper($logger, $fs, $staticConfig, $errors, $options) {
        this.$logger = $logger;
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.$errors = $errors;
        this.$options = $options;
        this.cachedProjectDir = "";
    }
    Object.defineProperty(ProjectHelper.prototype, "projectDir", {
        get: function () {
            if (this.cachedProjectDir !== "") {
                return this.cachedProjectDir;
            }
            this.cachedProjectDir = null;
            var projectDir = path.resolve(this.$options.path || ".");
            while (true) {
                this.$logger.trace("Looking for project in '%s'", projectDir);
                var projectFilePath = path.join(projectDir, this.$staticConfig.PROJECT_FILE_NAME);
                if (this.$fs.exists(projectFilePath).wait() && this.isProjectFileCorrect(projectFilePath)) {
                    this.$logger.debug("Project directory is '%s'.", projectDir);
                    this.cachedProjectDir = projectDir;
                    break;
                }
                var dir = path.dirname(projectDir);
                if (dir === projectDir) {
                    this.$logger.debug("No project found at or above '%s'.", this.$options.path || path.resolve("."));
                    break;
                }
                projectDir = dir;
            }
            return this.cachedProjectDir;
        },
        enumerable: true,
        configurable: true
    });
    ProjectHelper.prototype.generateDefaultAppId = function (appName, baseAppId) {
        var sanitizedName = this.sanitizeName(appName);
        if (sanitizedName) {
            if (/^\d+$/.test(sanitizedName)) {
                sanitizedName = "the" + sanitizedName;
            }
        }
        else {
            sanitizedName = "the";
        }
        return baseAppId + "." + sanitizedName;
    };
    ProjectHelper.prototype.sanitizeName = function (appName) {
        var sanitizedName = _.filter(appName.split(""), function (c) { return /[a-zA-Z0-9]/.test(c); }).join("");
        return sanitizedName;
    };
    ProjectHelper.prototype.isProjectFileCorrect = function (projectFilePath) {
        if (this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE) {
            try {
                var fileContent = this.$fs.readJson(projectFilePath).wait();
                var clientSpecificData = fileContent[this.$staticConfig.CLIENT_NAME_KEY_IN_PROJECT_FILE];
                return !!clientSpecificData;
            }
            catch (err) {
                this.$errors.failWithoutHelp("The project file is corrupted. Additional technical information: %s", err);
            }
        }
        return true;
    };
    return ProjectHelper;
})();
exports.ProjectHelper = ProjectHelper;
$injector.register("projectHelper", ProjectHelper);
