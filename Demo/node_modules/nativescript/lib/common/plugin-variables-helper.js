///<reference path=".d.ts"/>
"use strict";
var PluginVariablesHelper = (function () {
    function PluginVariablesHelper($options) {
        this.$options = $options;
    }
    PluginVariablesHelper.prototype.getPluginVariableFromVarOption = function (variableName, configuration) {
        var varOption = this.$options.var;
        configuration = configuration ? configuration.toLowerCase() : undefined;
        var lowerCasedVariableName = variableName.toLowerCase();
        if (varOption) {
            var configVariableValue;
            var generalVariableValue;
            if (variableName.indexOf(".") !== -1) {
                varOption = this.simplifyYargsObject(varOption, configuration);
            }
            _.each(varOption, function (propValue, propKey) {
                if (propKey.toLowerCase() === configuration) {
                    _.each(propValue, function (configPropValue, configPropKey) {
                        if (configPropKey.toLowerCase() === lowerCasedVariableName) {
                            configVariableValue = configPropValue;
                            return false;
                        }
                    });
                }
                else if (propKey.toLowerCase() === lowerCasedVariableName) {
                    generalVariableValue = propValue;
                }
            });
            var value = configVariableValue || generalVariableValue;
            if (value) {
                var obj = Object.create(null);
                obj[variableName] = value.toString();
                return obj;
            }
        }
        return undefined;
    };
    PluginVariablesHelper.prototype.simplifyYargsObject = function (obj, configuration) {
        var _this = this;
        if (obj && typeof (obj) === "object") {
            var convertedObject = Object.create({});
            _.each(obj, function (propValue, propKey) {
                if (typeof (propValue) !== "object") {
                    convertedObject[propKey] = propValue;
                    return false;
                }
                configuration = configuration ? configuration.toLowerCase() : undefined;
                var innerObj = _this.simplifyYargsObject(propValue, configuration);
                if (propKey.toLowerCase() === configuration) {
                    convertedObject[propKey] = innerObj;
                }
                else {
                    _.each(innerObj, function (innerPropValue, innerPropKey) {
                        convertedObject[(propKey + "." + innerPropKey)] = innerPropValue;
                    });
                }
            });
            return convertedObject;
        }
        return obj;
    };
    return PluginVariablesHelper;
})();
exports.PluginVariablesHelper = PluginVariablesHelper;
$injector.register("pluginVariablesHelper", PluginVariablesHelper);
