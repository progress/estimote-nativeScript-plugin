///<reference path=".d.ts"/>
"use strict";
var log4js = require("log4js");
var util = require("util");
var stream = require("stream");
var Future = require("fibers/future");
var marked = require("marked");
var TerminalRenderer = require("marked-terminal");
var chalk = require("chalk");
var Logger = (function () {
    function Logger($config, $options) {
        this.$options = $options;
        this.log4jsLogger = null;
        this.encodeRequestPaths = ['/appbuilder/api/itmstransporter/applications?username='];
        this.encodeBody = false;
        this.passwordRegex = /[Pp]assword=(.*?)(['&,]|$)|\"[Pp]assword\":\"(.*?)\"/;
        this.requestBodyRegex = /^\"(.*?)\"$/;
        var appenders = [];
        if (!$config.CI_LOGGER) {
            appenders.push({
                type: "console",
                layout: {
                    type: "messagePassThrough"
                }
            });
        }
        log4js.configure({ appenders: appenders });
        this.log4jsLogger = log4js.getLogger();
        if (this.$options.log) {
            this.log4jsLogger.setLevel(this.$options.log);
        }
        else {
            this.log4jsLogger.setLevel($config.DEBUG ? "TRACE" : "INFO");
        }
    }
    Logger.prototype.setLevel = function (level) {
        this.log4jsLogger.setLevel(level);
    };
    Logger.prototype.getLevel = function () {
        return this.log4jsLogger.level.toString();
    };
    Logger.prototype.fatal = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.log4jsLogger.fatal.apply(this.log4jsLogger, args);
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var message = util.format.apply(null, args);
        var colorizedMessage = message.red;
        this.log4jsLogger.error.apply(this.log4jsLogger, [colorizedMessage]);
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var message = util.format.apply(null, args);
        var colorizedMessage = message.yellow;
        this.log4jsLogger.warn.apply(this.log4jsLogger, [colorizedMessage]);
    };
    Logger.prototype.warnWithLabel = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var message = util.format.apply(util, args);
        this.warn(Logger.LABEL + " " + message);
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.log4jsLogger.info.apply(this.log4jsLogger, args);
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var encodedArgs = this.getPasswordEncodedArguments(args);
        this.log4jsLogger.debug.apply(this.log4jsLogger, encodedArgs);
    };
    Logger.prototype.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var encodedArgs = this.getPasswordEncodedArguments(args);
        this.log4jsLogger.trace.apply(this.log4jsLogger, encodedArgs);
    };
    Logger.prototype.out = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log(util.format.apply(null, args));
    };
    Logger.prototype.write = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        process.stdout.write(util.format.apply(null, args));
    };
    Logger.prototype.prepare = function (item) {
        if (typeof item === "undefined" || item === null) {
            return "[no content]";
        }
        if (typeof item === "string") {
            return item;
        }
        if (item instanceof stream.Readable) {
            return "[ReadableStream]";
        }
        return JSON.stringify(item);
    };
    Logger.prototype.printInfoMessageOnSameLine = function (message) {
        if (!this.$options.log || this.$options.log === "info") {
            this.write(message);
        }
    };
    Logger.prototype.printMsgWithTimeout = function (message, timeout) {
        var _this = this;
        var printMsgFuture = new Future();
        setTimeout(function () {
            _this.printInfoMessageOnSameLine(message);
            printMsgFuture.return();
        }, timeout);
        return printMsgFuture;
    };
    Logger.prototype.printMarkdown = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var opts = {
            unescape: true,
            link: chalk.red,
            tableOptions: {
                chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
                style: {
                    'padding-left': 1,
                    'padding-right': 1,
                    head: ['green', 'bold'],
                    border: ['grey'],
                    compact: false
                }
            }
        };
        marked.setOptions({ renderer: new TerminalRenderer(opts) });
        var formattedMessage = marked(util.format.apply(null, args));
        this.write(formattedMessage);
    };
    Logger.prototype.getPasswordEncodedArguments = function (args) {
        var _this = this;
        return _.map(args, function (argument) {
            if (typeof argument !== 'string') {
                return argument;
            }
            var passwordMatch = _this.passwordRegex.exec(argument);
            if (passwordMatch) {
                var password = passwordMatch[1] || passwordMatch[3];
                return _this.getHiddenPassword(password, argument);
            }
            if (_this.encodeBody) {
                var bodyMatch = _this.requestBodyRegex.exec(argument);
                if (bodyMatch) {
                    return _this.getHiddenPassword(bodyMatch[1], argument);
                }
            }
            _.each(_this.encodeRequestPaths, function (path) {
                if (argument.indexOf('path') > -1) {
                    _this.encodeBody = argument.indexOf(path) > -1;
                    return false;
                }
            });
            return argument;
        });
    };
    Logger.prototype.getHiddenPassword = function (password, originalString) {
        password = password || '';
        return originalString.replace(password, new Array(password.length + 1).join('*'));
    };
    Logger.LABEL = "[WARNING]:";
    return Logger;
})();
exports.Logger = Logger;
$injector.register("logger", Logger);
