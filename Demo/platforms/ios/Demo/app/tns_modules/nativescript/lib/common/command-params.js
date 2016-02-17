///<reference path=".d.ts"/>
"use strict";
var StringCommandParameter = (function () {
    function StringCommandParameter($injector) {
        this.$injector = $injector;
        this.mandatory = false;
    }
    StringCommandParameter.prototype.validate = function (validationValue) {
        var _this = this;
        return (function () {
            if (!validationValue) {
                if (_this.errorMessage) {
                    _this.$injector.resolve("errors").fail(_this.errorMessage);
                }
                return false;
            }
            return true;
        }).future()();
    };
    return StringCommandParameter;
})();
exports.StringCommandParameter = StringCommandParameter;
$injector.register("stringParameter", StringCommandParameter);
var StringParameterBuilder = (function () {
    function StringParameterBuilder($injector) {
        this.$injector = $injector;
    }
    StringParameterBuilder.prototype.createMandatoryParameter = function (errorMsg) {
        var commandParameter = new StringCommandParameter(this.$injector);
        commandParameter.mandatory = true;
        commandParameter.errorMessage = errorMsg;
        return commandParameter;
    };
    return StringParameterBuilder;
})();
exports.StringParameterBuilder = StringParameterBuilder;
$injector.register("stringParameterBuilder", StringParameterBuilder);
