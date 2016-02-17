///<reference path="../.d.ts"/>
"use strict";
var ProjectTemplatesService = (function () {
    function ProjectTemplatesService($npmInstallationManager) {
        this.$npmInstallationManager = $npmInstallationManager;
    }
    Object.defineProperty(ProjectTemplatesService.prototype, "defaultTemplatePath", {
        get: function () {
            return this.$npmInstallationManager.install(ProjectTemplatesService.NPM_DEFAULT_TEMPLATE_NAME);
        },
        enumerable: true,
        configurable: true
    });
    ProjectTemplatesService.NPM_DEFAULT_TEMPLATE_NAME = "tns-template-hello-world";
    return ProjectTemplatesService;
})();
exports.ProjectTemplatesService = ProjectTemplatesService;
$injector.register("projectTemplatesService", ProjectTemplatesService);
