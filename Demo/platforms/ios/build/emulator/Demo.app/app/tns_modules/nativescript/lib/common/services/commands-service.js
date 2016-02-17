///<reference path="../.d.ts"/>
"use strict";
var jaroWinklerDistance = require("../vendor/jaro-winkler_distance");
var helpers = require("../helpers");
var os_1 = require("os");
var CommandArgumentsValidationHelper = (function () {
    function CommandArgumentsValidationHelper(isValid, _remainingArguments) {
        this.isValid = isValid;
        this.remainingArguments = _remainingArguments.slice();
    }
    return CommandArgumentsValidationHelper;
})();
var CommandsService = (function () {
    function CommandsService($commandsServiceProvider, $errors, $fs, $hooksService, $injector, $logger, $options, $resources, $staticConfig) {
        this.$commandsServiceProvider = $commandsServiceProvider;
        this.$errors = $errors;
        this.$fs = $fs;
        this.$hooksService = $hooksService;
        this.$injector = $injector;
        this.$logger = $logger;
        this.$options = $options;
        this.$resources = $resources;
        this.$staticConfig = $staticConfig;
        this.areDynamicSubcommandsRegistered = false;
        this.cachedCommandHelp = null;
    }
    CommandsService.prototype.allCommands = function (opts) {
        var commands = this.$injector.getRegisteredCommandsNames(opts.includeDevCommands);
        return _.reject(commands, function (command) { return _.contains(command, '|'); });
    };
    CommandsService.prototype.executeCommandUnchecked = function (commandName, commandArguments) {
        var _this = this;
        return (function () {
            var command = _this.$injector.resolveCommand(commandName);
            if (command) {
                if (!_this.$staticConfig.disableAnalytics && !command.disableAnalytics) {
                    var analyticsService = _this.$injector.resolve("analyticsService");
                    if (!command.disableAnalyticsConsentCheck) {
                        analyticsService.checkConsent().wait();
                    }
                    analyticsService.trackFeature(commandName).wait();
                }
                if (!_this.$staticConfig.disableHooks && (command.enableHooks === undefined || command.enableHooks === true)) {
                    var hierarchicalCommandName = _this.$injector.buildHierarchicalCommand(commandName, commandArguments);
                    if (hierarchicalCommandName) {
                        commandName = helpers.stringReplaceAll(hierarchicalCommandName.commandName, CommandsService.HIERARCHICAL_COMMANDS_DEFAULT_COMMAND_DELIMITER, CommandsService.HOOKS_COMMANDS_DELIMITER);
                        commandName = helpers.stringReplaceAll(commandName, CommandsService.HIERARCHICAL_COMMANDS_DELIMITER, CommandsService.HOOKS_COMMANDS_DELIMITER);
                    }
                    _this.$hooksService.executeBeforeHooks(commandName).wait();
                    command.execute(commandArguments).wait();
                    _this.$hooksService.executeAfterHooks(commandName).wait();
                }
                else {
                    command.execute(commandArguments).wait();
                }
                var commandHelp = _this.getCommandHelp().wait();
                if (!command.disableCommandHelpSuggestion && commandHelp && commandHelp[commandName]) {
                    var suggestionText = commandHelp[commandName];
                    _this.$logger.printMarkdown(~suggestionText.indexOf('%s') ? require('util').format(suggestionText, commandArguments) : suggestionText);
                }
                return true;
            }
            return false;
        }).future()();
    };
    CommandsService.prototype.printHelp = function (commandName) {
        this.$options.help = true;
        return this.executeCommandUnchecked("help", [this.beautifyCommandName(commandName)]);
    };
    CommandsService.prototype.executeCommandAction = function (commandName, commandArguments, action) {
        var _this = this;
        return this.$errors.beginCommand(function () { return action.apply(_this, [commandName, commandArguments]); }, function () { return _this.printHelp(commandName); });
    };
    CommandsService.prototype.tryExecuteCommandAction = function (commandName, commandArguments) {
        var command = this.$injector.resolveCommand(commandName);
        this.$options.validateOptions(command ? command.dashedOptions : null);
        if (!this.areDynamicSubcommandsRegistered) {
            this.$commandsServiceProvider.registerDynamicSubCommands();
            this.areDynamicSubcommandsRegistered = true;
        }
        return this.canExecuteCommand(commandName, commandArguments);
    };
    CommandsService.prototype.tryExecuteCommand = function (commandName, commandArguments) {
        var _this = this;
        return (function () {
            if (_this.executeCommandAction(commandName, commandArguments, _this.tryExecuteCommandAction).wait()) {
                _this.executeCommandAction(commandName, commandArguments, _this.executeCommandUnchecked).wait();
            }
            else {
                var command = _this.$injector.resolveCommand(commandName);
                if (command) {
                    _this.printHelp(commandName).wait();
                }
            }
        }).future()();
    };
    CommandsService.prototype.canExecuteCommand = function (commandName, commandArguments, isDynamicCommand) {
        var _this = this;
        return (function () {
            var command = _this.$injector.resolveCommand(commandName);
            var beautifiedName = helpers.stringReplaceAll(commandName, "|", " ");
            if (command) {
                if (command.isDisabled) {
                    _this.$errors.failWithoutHelp("This command is not applicable to your environment.");
                }
                if (command.canExecute) {
                    return command.canExecute(commandArguments).wait();
                }
                if (_this.$injector.isValidHierarchicalCommand(commandName, commandArguments)) {
                    return true;
                }
                if (_this.validateCommandArguments(command, commandArguments).wait()) {
                    return true;
                }
                _this.$errors.fail("Unable to execute command '%s'. Use '$ %s %s --help' for help.", beautifiedName, _this.$staticConfig.CLIENT_NAME.toLowerCase(), beautifiedName);
                return false;
            }
            else if (!isDynamicCommand && _.startsWith(commandName, _this.$commandsServiceProvider.dynamicCommandsPrefix)) {
                if (_.any(_this.$commandsServiceProvider.getDynamicCommands().wait())) {
                    _this.$commandsServiceProvider.generateDynamicCommands().wait();
                    return _this.canExecuteCommand(commandName, commandArguments, true).wait();
                }
            }
            _this.$logger.fatal("Unknown command '%s'. Use '%s help' for help.", beautifiedName, _this.$staticConfig.CLIENT_NAME.toLowerCase());
            _this.tryMatchCommand(commandName);
            return false;
        }).future()();
    };
    CommandsService.prototype.validateMandatoryParams = function (commandArguments, mandatoryParams) {
        var _this = this;
        return (function () {
            var commandArgsHelper = new CommandArgumentsValidationHelper(true, commandArguments);
            if (mandatoryParams.length > 0) {
                if (mandatoryParams.length > commandArguments.length) {
                    var customErrorMessages = _.map(mandatoryParams, function (mp) { return mp.errorMessage; });
                    customErrorMessages.splice(0, 0, "You need to provide all the required parameters.");
                    _this.$errors.fail(customErrorMessages.join(os_1.EOL));
                }
                _.each(mandatoryParams, function (mandatoryParam) {
                    var argument = _.find(commandArgsHelper.remainingArguments, function (c) { return mandatoryParam.validate(c).wait(); });
                    if (argument) {
                        helpers.remove(commandArgsHelper.remainingArguments, function (arg) { return arg === argument; });
                    }
                    else {
                        _this.$errors.fail("Missing mandatory parameter.");
                    }
                });
            }
            return commandArgsHelper;
        }).future()();
    };
    CommandsService.prototype.validateCommandArguments = function (command, commandArguments) {
        var _this = this;
        return (function () {
            var mandatoryParams = _.filter(command.allowedParameters, function (param) { return param.mandatory; });
            var commandArgsHelper = _this.validateMandatoryParams(commandArguments, mandatoryParams).wait();
            if (!commandArgsHelper.isValid) {
                return false;
            }
            if (!command.allowedParameters || command.allowedParameters.length === 0) {
                if (commandArguments.length > 0) {
                    _this.$errors.fail("This command doesn't accept parameters.");
                }
            }
            else {
                var unverifiedAllowedParams = command.allowedParameters.filter(function (param) { return !param.mandatory; });
                _.each(commandArgsHelper.remainingArguments, function (argument) {
                    var parameter = _.find(unverifiedAllowedParams, function (c) { return c.validate(argument).wait(); });
                    if (parameter) {
                        var index = unverifiedAllowedParams.indexOf(parameter);
                        unverifiedAllowedParams.splice(index, 1);
                    }
                    else {
                        _this.$errors.fail("The parameter %s is not valid for this command.", argument);
                    }
                });
            }
            return true;
        }).future()();
    };
    CommandsService.prototype.tryMatchCommand = function (commandName) {
        var _this = this;
        var allCommands = this.allCommands({ includeDevCommands: false });
        var similarCommands = [];
        _.each(allCommands, function (command) {
            if (!_this.$injector.isDefaultCommand(command)) {
                command = helpers.stringReplaceAll(command, "|", " ");
                var distance = jaroWinklerDistance(commandName, command);
                if (commandName.length > 3 && command.indexOf(commandName) !== -1) {
                    similarCommands.push({ rating: 1, name: command });
                }
                else if (distance >= 0.65) {
                    similarCommands.push({ rating: distance, name: command });
                }
            }
        });
        similarCommands = _.sortBy(similarCommands, function (command) {
            return -command.rating;
        }).slice(0, 5);
        if (similarCommands.length > 0) {
            var message = ["Did you mean?"];
            _.each(similarCommands, function (command) {
                message.push("\t" + command.name);
            });
            this.$logger.fatal(message.join("\n"));
        }
    };
    CommandsService.prototype.completeCommand = function () {
        var _this = this;
        return (function () {
            var tabtab = require("tabtab");
            var completeCallback = function (err, data) {
                if (err || !data) {
                    return;
                }
                var splittedLine = data.line.split(/[ ]+/);
                var line = _.filter(splittedLine, function (w) { return w !== ""; });
                var commandName = (line[line.length - 2]);
                var childrenCommands = _this.$injector.getChildrenCommandsNames(commandName);
                if (data.last && _.startsWith(data.last, "--")) {
                    return tabtab.log(_.keys(_this.$options.options), data, "--");
                }
                if (data.last && _.startsWith(data.last, "-")) {
                    return tabtab.log(_this.$options.shorthands, data, "-");
                }
                if (data.words === 1) {
                    var allCommands = _this.allCommands({ includeDevCommands: false });
                    if (_.startsWith(data.last, _this.$commandsServiceProvider.dynamicCommandsPrefix)) {
                        allCommands = allCommands.concat(_this.$commandsServiceProvider.getDynamicCommands().wait());
                    }
                    return tabtab.log(allCommands, data);
                }
                if (data.words >= 3) {
                    commandName = line[1] + "|" + line[2];
                }
                var command = _this.$injector.resolveCommand(commandName);
                if (command) {
                    var completionData = command.completionData;
                    if (completionData) {
                        return tabtab.log(completionData, data);
                    }
                }
                if (data.words === 2 && childrenCommands) {
                    return tabtab.log(_.reject(childrenCommands, function (children) { return children[0] === '*'; }), data);
                }
                return false;
            };
            tabtab.complete(_this.$staticConfig.CLIENT_NAME.toLowerCase(), completeCallback);
            if (_this.$staticConfig.CLIENT_NAME_ALIAS) {
                tabtab.complete(_this.$staticConfig.CLIENT_NAME_ALIAS.toLowerCase(), completeCallback);
            }
            return true;
        }).future()();
    };
    CommandsService.prototype.getCommandHelp = function () {
        var _this = this;
        return (function () {
            if (!_this.cachedCommandHelp && _this.$fs.exists(_this.$resources.resolvePath(_this.$staticConfig.COMMAND_HELP_FILE_NAME)).wait()) {
                _this.cachedCommandHelp = _this.$resources.readJson(_this.$staticConfig.COMMAND_HELP_FILE_NAME).wait();
            }
            return _this.cachedCommandHelp;
        }).future()();
    };
    CommandsService.prototype.beautifyCommandName = function (commandName) {
        if (commandName.indexOf("*") > 0) {
            return commandName.substr(0, commandName.indexOf("|"));
        }
        return commandName;
    };
    CommandsService.HIERARCHICAL_COMMANDS_DELIMITER = "|";
    CommandsService.HIERARCHICAL_COMMANDS_DEFAULT_COMMAND_DELIMITER = "|*";
    CommandsService.HOOKS_COMMANDS_DELIMITER = "-";
    return CommandsService;
})();
exports.CommandsService = CommandsService;
$injector.register("commandsService", CommandsService);
