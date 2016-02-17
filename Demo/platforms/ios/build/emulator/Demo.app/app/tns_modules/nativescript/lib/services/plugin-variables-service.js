///<reference path="../.d.ts"/>
"use strict";
var helpers = require("./../common/helpers");
var PluginVariablesService = (function () {
    function PluginVariablesService($errors, $pluginVariablesHelper, $projectData, $projectDataService, $prompter) {
        this.$errors = $errors;
        this.$pluginVariablesHelper = $pluginVariablesHelper;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
        this.$prompter = $prompter;
    }
    PluginVariablesService.prototype.getPluginVariablePropertyName = function (pluginData) {
        return pluginData.name + "-" + PluginVariablesService.PLUGIN_VARIABLES_KEY;
    };
    PluginVariablesService.prototype.savePluginVariablesInProjectFile = function (pluginData) {
        var _this = this;
        return (function () {
            var values = Object.create(null);
            _this.executeForAllPluginVariables(pluginData, function (pluginVariableData) {
                return (function () {
                    var pluginVariableValue = _this.getPluginVariableValue(pluginVariableData).wait();
                    _this.ensurePluginVariableValue(pluginVariableValue, "Unable to find value for " + pluginVariableData.name + " plugin variable from " + pluginData.name + " plugin. Ensure the --var option is specified or the plugin variable has default value.");
                    values[pluginVariableData.name] = pluginVariableValue;
                }).future()();
            }).wait();
            if (!_.isEmpty(values)) {
                _this.$projectDataService.initialize(_this.$projectData.projectDir);
                _this.$projectDataService.setValue(_this.getPluginVariablePropertyName(pluginData), values).wait();
            }
        }).future()();
    };
    PluginVariablesService.prototype.removePluginVariablesFromProjectFile = function (pluginData) {
        this.$projectDataService.initialize(this.$projectData.projectDir);
        return this.$projectDataService.removeProperty(this.getPluginVariablePropertyName(pluginData));
    };
    PluginVariablesService.prototype.interpolatePluginVariables = function (pluginData, pluginConfigurationFileContent) {
        var _this = this;
        return (function () {
            _this.executeForAllPluginVariables(pluginData, function (pluginVariableData) {
                return (function () {
                    _this.ensurePluginVariableValue(pluginVariableData.value, "Unable to find the value for " + pluginVariableData.name + " plugin variable into project package.json file. Verify that your package.json file is correct and try again.");
                    pluginConfigurationFileContent = pluginConfigurationFileContent.replace(new RegExp("{" + pluginVariableData.name + "}", "gi"), pluginVariableData.value);
                }).future()();
            }).wait();
            return pluginConfigurationFileContent;
        }).future()();
    };
    PluginVariablesService.prototype.ensurePluginVariableValue = function (pluginVariableValue, errorMessage) {
        if (!pluginVariableValue) {
            this.$errors.failWithoutHelp(errorMessage);
        }
    };
    PluginVariablesService.prototype.getPluginVariableValue = function (pluginVariableData) {
        var _this = this;
        return (function () {
            var pluginVariableName = pluginVariableData.name;
            var value = _this.$pluginVariablesHelper.getPluginVariableFromVarOption(pluginVariableName);
            if (value) {
                value = value[pluginVariableName];
            }
            else {
                value = pluginVariableData.defaultValue;
                if (!value && helpers.isInteractive()) {
                    var promptSchema = {
                        name: pluginVariableName,
                        type: "input",
                        message: "Enter value for " + pluginVariableName + " variable:",
                        validate: function (val) { return !!val ? true : 'Please enter a value!'; }
                    };
                    var promptData = _this.$prompter.get([promptSchema]).wait();
                    value = promptData[pluginVariableName];
                }
            }
            return value;
        }).future()();
    };
    PluginVariablesService.prototype.executeForAllPluginVariables = function (pluginData, action) {
        var _this = this;
        return (function () {
            var pluginVariables = pluginData.pluginVariables;
            var pluginVariablesNames = _.keys(pluginVariables);
            _.each(pluginVariablesNames, function (pluginVariableName) { return action(_this.createPluginVariableData(pluginData, pluginVariableName).wait()).wait(); });
        }).future()();
    };
    PluginVariablesService.prototype.createPluginVariableData = function (pluginData, pluginVariableName) {
        var _this = this;
        return (function () {
            var variableData = pluginData.pluginVariables[pluginVariableName];
            variableData.name = pluginVariableName;
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var pluginVariableValues = _this.$projectDataService.getValue(_this.getPluginVariablePropertyName(pluginData)).wait();
            variableData.value = pluginVariableValues ? pluginVariableValues[pluginVariableName] : undefined;
            return variableData;
        }).future()();
    };
    PluginVariablesService.PLUGIN_VARIABLES_KEY = "variables";
    return PluginVariablesService;
})();
exports.PluginVariablesService = PluginVariablesService;
$injector.register("pluginVariablesService", PluginVariablesService);
