///<reference path="../../.d.ts"/>
"use strict";
var RemovePluginCommand = (function () {
    function RemovePluginCommand($pluginsService, $errors) {
        this.$pluginsService = $pluginsService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    RemovePluginCommand.prototype.execute = function (args) {
        return this.$pluginsService.remove(args[0]);
    };
    RemovePluginCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (!args[0]) {
                _this.$errors.fail("You must specify plugin name.");
            }
            var installedPlugins = _this.$pluginsService.getAllInstalledPlugins().wait();
            var pluginName = args[0].toLowerCase();
            if (!_.any(installedPlugins, function (plugin) { return plugin.name.toLowerCase() === pluginName; })) {
                _this.$errors.failWithoutHelp("Plugin \"" + pluginName + "\" is not installed.");
            }
            return true;
        }).future()();
    };
    return RemovePluginCommand;
})();
exports.RemovePluginCommand = RemovePluginCommand;
$injector.registerCommand("plugin|remove", RemovePluginCommand);
