///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var helpers_1 = require("./helpers");
var indent = "";
function trace(formatStr) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
}
function pushIndent() {
    indent += "  ";
}
function popIndent() {
    indent = indent.slice(0, -2);
}
function forEachName(names, action) {
    if (_.isString(names)) {
        action(names);
    }
    else {
        names.forEach(action);
    }
}
function register() {
    var rest = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        rest[_i - 0] = arguments[_i];
    }
    return function (target) {
        $injector.register(rest[0], target);
    };
}
exports.register = register;
var Yok = (function () {
    function Yok() {
        this.COMMANDS_NAMESPACE = "commands";
        this.modules = {};
        this.resolutionProgress = {};
        this.hierarchicalCommands = {};
        this.publicApi = {
            __modules__: {}
        };
        this.register("injector", this);
    }
    Yok.prototype.requireCommand = function (names, file) {
        var _this = this;
        forEachName(names, function (commandName) {
            var commands = commandName.split("|");
            if (commands.length > 1) {
                if (_.startsWith(commands[1], '*') && _this.modules[_this.createCommandName(commands[0])]) {
                    throw new Error("Default commands should be required before child commands");
                }
                var parentCommandName = commands[0];
                if (!_this.hierarchicalCommands[parentCommandName]) {
                    _this.hierarchicalCommands[parentCommandName] = [];
                }
                _this.hierarchicalCommands[parentCommandName].push(_.rest(commands).join("|"));
            }
            if (commands.length > 1 && !_this.modules[_this.createCommandName(commands[0])]) {
                _this.require(_this.createCommandName(commands[0]), file);
                if (commands[1] && !commandName.match(/\|\*/)) {
                    _this.require(_this.createCommandName(commandName), file);
                }
            }
            else {
                _this.require(_this.createCommandName(commandName), file);
            }
        });
    };
    Yok.prototype.require = function (names, file) {
        var _this = this;
        forEachName(names, function (name) { return _this.requireOne(name, file); });
    };
    Yok.prototype.requirePublic = function (names, file) {
        var _this = this;
        forEachName(names, function (name) {
            _this.requireOne(name, file);
            _this.resolvePublicApi(name, file);
        });
    };
    Yok.prototype.requirePublicClass = function (names, file) {
        var _this = this;
        forEachName(names, function (name) {
            _this.requireOne(name, file);
            _this.addClassToPublicApi(name, file);
        });
    };
    Yok.prototype.addClassToPublicApi = function (name, file) {
        var _this = this;
        Object.defineProperty(this.publicApi, name, {
            get: function () {
                return _this.tryCallInitializeMethod(name);
            }
        });
    };
    Yok.prototype.resolvePublicApi = function (name, file) {
        var _this = this;
        Object.defineProperty(this.publicApi, name, {
            get: function () {
                _this.tryCallInitializeMethod(name);
                return _this.publicApi.__modules__[name];
            }
        });
    };
    Yok.prototype.tryCallInitializeMethod = function (name) {
        var classInstance = this.modules[name].instance;
        if (!classInstance) {
            classInstance = this.resolve(name);
            if (classInstance.initialize) {
                var result = classInstance.initialize.apply(classInstance);
                if (helpers_1.isFuture(result)) {
                    var fiberBootstrap = require("./fiber-bootstrap");
                    fiberBootstrap.run(function () {
                        result.wait();
                    });
                }
            }
        }
        return classInstance;
    };
    Yok.prototype.requireOne = function (name, file) {
        var relativePath = path.join("../", file);
        var dependency = {
            require: require("fs").existsSync(path.join(__dirname, relativePath + ".js")) ? relativePath : file,
            shared: true
        };
        if (!this.modules[name]) {
            this.modules[name] = dependency;
        }
        else {
            throw new Error("module '" + name + "' require'd twice.");
        }
    };
    Yok.prototype.registerCommand = function (names, resolver) {
        var _this = this;
        forEachName(names, function (name) {
            var commands = name.split("|");
            _this.register(_this.createCommandName(name), resolver);
            if (commands.length > 1) {
                _this.createHierarchicalCommand(commands[0]);
            }
        });
    };
    Yok.prototype.getDefaultCommand = function (name) {
        var subCommands = this.hierarchicalCommands[name];
        var defaultCommand = _.find(subCommands, function (command) { return _.startsWith(command, "*"); });
        return defaultCommand;
    };
    Yok.prototype.buildHierarchicalCommand = function (parentCommandName, commandLineArguments) {
        var _this = this;
        var currentSubCommandName, finalSubCommandName, matchingSubCommandName;
        var subCommands = this.hierarchicalCommands[parentCommandName];
        var remainingArguments = commandLineArguments;
        var finalRemainingArguments = commandLineArguments;
        var foundSubCommand = false;
        _.each(commandLineArguments, function (arg) {
            arg = arg.toLowerCase();
            currentSubCommandName = currentSubCommandName ? _this.getHierarchicalCommandName(currentSubCommandName, arg) : arg;
            remainingArguments = _.rest(remainingArguments);
            if (matchingSubCommandName = _.find(subCommands, function (sc) { return sc === currentSubCommandName || sc === "*" + currentSubCommandName; })) {
                finalSubCommandName = matchingSubCommandName;
                finalRemainingArguments = remainingArguments;
                foundSubCommand = true;
            }
        });
        if (foundSubCommand) {
            return { commandName: this.getHierarchicalCommandName(parentCommandName, finalSubCommandName), remainingArguments: finalRemainingArguments };
        }
        return undefined;
    };
    Yok.prototype.createHierarchicalCommand = function (name) {
        var _this = this;
        var factory = function () {
            return {
                execute: function (args) {
                    return (function () {
                        var commandsService = $injector.resolve("commandsService");
                        var commandName = null;
                        var defaultCommand = _this.getDefaultCommand(name);
                        var commandArguments = [];
                        if (args.length > 0) {
                            var hierarchicalCommand = _this.buildHierarchicalCommand(name, args);
                            if (hierarchicalCommand) {
                                commandName = hierarchicalCommand.commandName;
                                commandArguments = hierarchicalCommand.remainingArguments;
                            }
                            else {
                                commandName = defaultCommand ? _this.getHierarchicalCommandName(name, defaultCommand) : "help";
                                if (_.contains(_this.hierarchicalCommands[name], "*" + args[0])) {
                                    commandArguments = _.rest(args);
                                }
                                else {
                                    commandArguments = args;
                                }
                            }
                        }
                        else {
                            if (defaultCommand) {
                                commandName = _this.getHierarchicalCommandName(name, defaultCommand);
                            }
                            else {
                                commandName = "help";
                                var options = _this.resolve("options");
                                options.help = true;
                            }
                        }
                        commandsService.tryExecuteCommand(commandName, commandName === "help" ? [name] : commandArguments).wait();
                    }).future()();
                }
            };
        };
        $injector.registerCommand(name, factory);
    };
    Yok.prototype.getHierarchicalCommandName = function (parentCommandName, subCommandName) {
        return [parentCommandName, subCommandName].join("|");
    };
    Yok.prototype.isValidHierarchicalCommand = function (commandName, commandArguments) {
        if (_.contains(Object.keys(this.hierarchicalCommands), commandName)) {
            var defaultCommandName = this.getDefaultCommand(commandName);
            if (defaultCommandName && (!commandArguments || commandArguments.length === 0)) {
                return true;
            }
            var subCommands = this.hierarchicalCommands[commandName];
            if (subCommands) {
                var fullCommandName = this.buildHierarchicalCommand(commandName, commandArguments);
                if (!fullCommandName) {
                    var defaultCommand = this.resolveCommand(commandName + "|" + defaultCommandName);
                    if (defaultCommand) {
                        if (defaultCommand.canExecute) {
                            return defaultCommand.canExecute(commandArguments).wait();
                        }
                        if (defaultCommand.allowedParameters.length > 0) {
                            return true;
                        }
                    }
                    var errors = $injector.resolve("errors");
                    errors.fail("The input is not valid sub-command for '%s' command", commandName);
                }
                return true;
            }
        }
        return false;
    };
    Yok.prototype.isDefaultCommand = function (commandName) {
        return commandName.indexOf("*") > 0 && commandName.indexOf("|") > 0;
    };
    Yok.prototype.register = function (name, resolver, shared) {
        if (shared === void 0) { shared = true; }
        trace("registered '%s'", name);
        var dependency = this.modules[name] || {};
        dependency.shared = shared;
        if (_.isFunction(resolver)) {
            dependency.resolver = resolver;
        }
        else {
            dependency.instance = resolver;
        }
        this.modules[name] = dependency;
    };
    Yok.prototype.resolveCommand = function (name) {
        var command;
        var commandModuleName = this.createCommandName(name);
        if (!this.modules[commandModuleName]) {
            return null;
        }
        command = this.resolve(commandModuleName);
        return command;
    };
    Yok.prototype.resolve = function (param, ctorArguments) {
        if (_.isFunction(param)) {
            return this.resolveConstructor(param, ctorArguments);
        }
        else {
            return this.resolveByName(param, ctorArguments);
        }
    };
    Object.defineProperty(Yok.prototype, "dynamicCallRegex", {
        get: function () {
            return /#{([^.]+)\.([^}]+?)(\((.+)\))*}/;
        },
        enumerable: true,
        configurable: true
    });
    Yok.prototype.dynamicCall = function (call, args) {
        var _this = this;
        return (function () {
            var parsed = call.match(_this.dynamicCallRegex);
            var module = _this.resolve(parsed[1]);
            if (!args && parsed[3]) {
                args = _.map(parsed[4].split(","), function (arg) { return arg.trim(); });
            }
            var data = module[parsed[2]].apply(module, args);
            if (helpers_1.isFuture(data)) {
                return data.wait();
            }
            return data;
        }).future()();
    };
    Yok.prototype.resolveConstructor = function (ctor, ctorArguments) {
        var _this = this;
        helpers_1.annotate(ctor);
        var resolvedArgs = ctor.$inject.args.map(function (paramName) {
            if (ctorArguments && ctorArguments.hasOwnProperty(paramName)) {
                return ctorArguments[paramName];
            }
            else {
                return _this.resolve(paramName);
            }
        });
        var name = ctor.$inject.name;
        if (name && name[0] === name[0].toUpperCase()) {
            var EmptyCtor = function () { };
            EmptyCtor.prototype = ctor.prototype;
            var obj = new EmptyCtor();
            ctor.apply(obj, resolvedArgs);
            return obj;
        }
        else {
            return ctor.apply(null, resolvedArgs);
        }
    };
    Yok.prototype.resolveByName = function (name, ctorArguments) {
        if (name[0] === "$") {
            name = name.substr(1);
        }
        if (this.resolutionProgress[name]) {
            throw new Error("Cyclic dependency detected on dependency '" + name + "'");
        }
        this.resolutionProgress[name] = true;
        trace("resolving '%s'", name);
        pushIndent();
        var dependency;
        try {
            dependency = this.resolveDependency(name);
            if (!dependency) {
                throw new Error("unable to resolve " + name);
            }
            if (!dependency.instance || !dependency.shared) {
                if (!dependency.resolver) {
                    throw new Error("no resolver registered for " + name);
                }
                dependency.instance = this.resolveConstructor(dependency.resolver, ctorArguments);
            }
        }
        finally {
            popIndent();
            delete this.resolutionProgress[name];
        }
        return dependency.instance;
    };
    Yok.prototype.resolveDependency = function (name) {
        var module = this.modules[name];
        if (!module) {
            throw new Error("unable to resolve " + name);
        }
        if (module.require) {
            require(module.require);
        }
        return module;
    };
    Yok.prototype.getRegisteredCommandsNames = function (includeDev) {
        var _this = this;
        var modulesNames = _.keys(this.modules);
        var commandsNames = _.filter(modulesNames, function (moduleName) { return _.startsWith(moduleName, _this.COMMANDS_NAMESPACE + "."); });
        var commands = _.map(commandsNames, function (commandName) { return commandName.substr(_this.COMMANDS_NAMESPACE.length + 1); });
        if (!includeDev) {
            commands = _.reject(commands, function (command) { return _.startsWith(command, "dev-"); });
        }
        return commands;
    };
    Yok.prototype.getChildrenCommandsNames = function (commandName) {
        return this.hierarchicalCommands[commandName];
    };
    Yok.prototype.createCommandName = function (name) {
        return this.COMMANDS_NAMESPACE + "." + name;
    };
    Yok.prototype.dispose = function () {
        var _this = this;
        Object.keys(this.modules).forEach(function (moduleName) {
            var instance = _this.modules[moduleName].instance;
            if (instance && instance.dispose && instance !== _this) {
                instance.dispose();
            }
        });
    };
    return Yok;
})();
exports.Yok = Yok;
exports.injector = new Yok();
