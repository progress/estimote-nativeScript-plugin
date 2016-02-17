///<reference path="../../.d.ts"/>
"use strict";
var AddPluginCommand = (function () {
    function AddPluginCommand($pluginsService, $errors) {
        this.$pluginsService = $pluginsService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    AddPluginCommand.prototype.execute = function (args) {
        return this.$pluginsService.add(args[0]);
    };
    AddPluginCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (!args[0]) {
                _this.$errors.fail("You must specify plugin name.");
            }
            var installedPlugins = _this.$pluginsService.getAllInstalledPlugins().wait();
            var pluginName = args[0].toLowerCase();
            if (_.any(installedPlugins, function (plugin) { return plugin.name.toLowerCase() === pluginName; })) {
                _this.$errors.failWithoutHelp("Plugin \"" + pluginName + "\" is already installed.");
            }
            return true;
        }).future()();
    };
    return AddPluginCommand;
})();
exports.AddPluginCommand = AddPluginCommand;
$injector.registerCommand("plugin|add", AddPluginCommand);
