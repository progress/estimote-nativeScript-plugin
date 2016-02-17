///<reference path=".d.ts"/>
"use strict";
var queue = require("./queue");
var path = require("path");
var CommandDispatcher = (function () {
    function CommandDispatcher($logger, $cancellation, $commandsService, $staticConfig, $sysInfo, $options, $fs) {
        this.$logger = $logger;
        this.$cancellation = $cancellation;
        this.$commandsService = $commandsService;
        this.$staticConfig = $staticConfig;
        this.$sysInfo = $sysInfo;
        this.$options = $options;
        this.$fs = $fs;
    }
    CommandDispatcher.prototype.dispatchCommand = function () {
        var _this = this;
        return (function () {
            if (_this.$options.version) {
                return _this.printVersion();
            }
            if (_this.$logger.getLevel() === "TRACE") {
                var sysInfo = _this.$sysInfo.getSysInfo(path.join(__dirname, "..", "..", "package.json")).wait();
                _this.$logger.trace("System information:");
                _this.$logger.trace(sysInfo);
            }
            var commandName = _this.getCommandName();
            var commandArguments = _this.$options.argv._.slice(1);
            var lastArgument = _.last(commandArguments);
            if (_this.$options.help) {
                commandArguments.unshift(commandName);
                commandName = "help";
            }
            else if (lastArgument === "/?" || lastArgument === "?") {
                commandArguments.pop();
                commandArguments.unshift(commandName);
                commandName = "help";
            }
            _this.$cancellation.begin("cli").wait();
            _this.$commandsService.tryExecuteCommand(commandName, commandArguments).wait();
        }).future()();
    };
    CommandDispatcher.prototype.completeCommand = function () {
        return this.$commandsService.completeCommand();
    };
    CommandDispatcher.prototype.getCommandName = function () {
        var remaining = this.$options.argv._;
        if (remaining.length > 0) {
            return remaining[0].toString().toLowerCase();
        }
        this.$options.help = true;
        return "";
    };
    CommandDispatcher.prototype.printVersion = function () {
        var version = this.$staticConfig.version;
        var json = this.$fs.readJson(this.$staticConfig.pathToPackageJson).wait();
        if (json && json.buildVersion) {
            version = version + "-" + json.buildVersion;
        }
        this.$logger.out(version);
    };
    return CommandDispatcher;
})();
exports.CommandDispatcher = CommandDispatcher;
$injector.register("commandDispatcher", CommandDispatcher);
var FutureDispatcher = (function () {
    function FutureDispatcher($errors) {
        this.$errors = $errors;
    }
    FutureDispatcher.prototype.run = function () {
        if (this.actions) {
            this.$errors.fail("You cannot run a running future dispatcher.");
        }
        this.actions = new queue.Queue();
        while (true) {
            var action = this.actions.dequeue().wait();
            action().wait();
        }
    };
    FutureDispatcher.prototype.dispatch = function (action) {
        this.actions.enqueue(action);
    };
    return FutureDispatcher;
})();
$injector.register("dispatcher", FutureDispatcher, false);
