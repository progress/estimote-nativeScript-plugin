///<reference path="../.d.ts"/>
"use strict";
var Future = require("fibers/future");
var HelpCommand = (function () {
    function HelpCommand($logger, $injector, $htmlHelpService, $options) {
        this.$logger = $logger;
        this.$injector = $injector;
        this.$htmlHelpService = $htmlHelpService;
        this.$options = $options;
        this.enableHooks = false;
        this.disableAnalyticsConsentCheck = true;
        this.allowedParameters = [];
    }
    HelpCommand.prototype.canExecute = function (args) {
        return Future.fromResult(true);
    };
    HelpCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var topic = (args[0] || "").toLowerCase();
            var hierarchicalCommand = _this.$injector.buildHierarchicalCommand(args[0], _.rest(args));
            if (hierarchicalCommand) {
                topic = hierarchicalCommand.commandName;
            }
            if (_this.$options.help) {
                var help = _this.$htmlHelpService.getCommandLineHelpForCommand(topic).wait();
                _this.$logger.printMarkdown(help);
            }
            else {
                _this.$htmlHelpService.openHelpForCommandInBrowser(topic).wait();
            }
        }).future()();
    };
    return HelpCommand;
})();
exports.HelpCommand = HelpCommand;
$injector.registerCommand(["help", "/?"], HelpCommand);
