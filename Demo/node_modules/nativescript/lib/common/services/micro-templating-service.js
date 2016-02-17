///<reference path="../.d.ts"/>
"use strict";
var util = require("util");
var MicroTemplateService = (function () {
    function MicroTemplateService($dynamicHelpService, $injector) {
        this.$dynamicHelpService = $dynamicHelpService;
        this.$injector = $injector;
        this.dynamicCallRegex = new RegExp(util.format("(%s)", this.$injector.dynamicCallRegex.source), "g");
    }
    MicroTemplateService.prototype.parseContent = function (data, options) {
        var localVariables = this.$dynamicHelpService.getLocalVariables(options).wait();
        var compiledTemplate = _.template(data.replace(this.dynamicCallRegex, "this.$injector.dynamicCall(\"$1\").wait()"));
        return compiledTemplate.apply(this, [localVariables]);
    };
    return MicroTemplateService;
})();
exports.MicroTemplateService = MicroTemplateService;
$injector.register("microTemplateService", MicroTemplateService);
