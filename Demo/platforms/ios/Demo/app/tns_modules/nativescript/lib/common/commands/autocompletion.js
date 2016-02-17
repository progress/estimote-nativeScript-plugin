///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../helpers");
var AutoCompleteCommand = (function () {
    function AutoCompleteCommand($autoCompletionService, $logger, $prompter) {
        this.$autoCompletionService = $autoCompletionService;
        this.$logger = $logger;
        this.$prompter = $prompter;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    AutoCompleteCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (helpers.isInteractive()) {
                if (_this.$autoCompletionService.isAutoCompletionEnabled().wait()) {
                    if (_this.$autoCompletionService.isObsoleteAutoCompletionEnabled().wait()) {
                        _this.$autoCompletionService.enableAutoCompletion().wait();
                    }
                    else {
                        _this.$logger.info("Autocompletion is already enabled");
                    }
                }
                else {
                    _this.$logger.out("If you are using bash or zsh, you can enable command-line completion.");
                    var message = "Do you want to enable it now?";
                    var autoCompetionStatus = _this.$prompter.confirm(message, function () { return true; }).wait();
                    if (autoCompetionStatus) {
                        _this.$autoCompletionService.enableAutoCompletion().wait();
                    }
                    else {
                        _this.$autoCompletionService.disableAutoCompletion().wait();
                    }
                }
            }
        }).future()();
    };
    return AutoCompleteCommand;
})();
exports.AutoCompleteCommand = AutoCompleteCommand;
$injector.registerCommand("autocomplete|*default", AutoCompleteCommand);
var DisableAutoCompleteCommand = (function () {
    function DisableAutoCompleteCommand($autoCompletionService, $logger) {
        this.$autoCompletionService = $autoCompletionService;
        this.$logger = $logger;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    DisableAutoCompleteCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$autoCompletionService.isAutoCompletionEnabled().wait()) {
                _this.$autoCompletionService.disableAutoCompletion().wait();
            }
            else {
                _this.$logger.info("Autocompletion is already disabled.");
            }
        }).future()();
    };
    return DisableAutoCompleteCommand;
})();
exports.DisableAutoCompleteCommand = DisableAutoCompleteCommand;
$injector.registerCommand("autocomplete|disable", DisableAutoCompleteCommand);
var EnableAutoCompleteCommand = (function () {
    function EnableAutoCompleteCommand($autoCompletionService, $logger) {
        this.$autoCompletionService = $autoCompletionService;
        this.$logger = $logger;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    EnableAutoCompleteCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$autoCompletionService.isAutoCompletionEnabled().wait()) {
                _this.$logger.info("Autocompletion is already enabled.");
            }
            else {
                _this.$autoCompletionService.enableAutoCompletion().wait();
            }
        }).future()();
    };
    return EnableAutoCompleteCommand;
})();
exports.EnableAutoCompleteCommand = EnableAutoCompleteCommand;
$injector.registerCommand("autocomplete|enable", EnableAutoCompleteCommand);
var AutoCompleteStatusCommand = (function () {
    function AutoCompleteStatusCommand($autoCompletionService, $logger) {
        this.$autoCompletionService = $autoCompletionService;
        this.$logger = $logger;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    AutoCompleteStatusCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$autoCompletionService.isAutoCompletionEnabled().wait()) {
                _this.$logger.info("Autocompletion is enabled.");
            }
            else {
                _this.$logger.info("Autocompletion is disabled.");
            }
        }).future()();
    };
    return AutoCompleteStatusCommand;
})();
exports.AutoCompleteStatusCommand = AutoCompleteStatusCommand;
$injector.registerCommand("autocomplete|status", AutoCompleteStatusCommand);
