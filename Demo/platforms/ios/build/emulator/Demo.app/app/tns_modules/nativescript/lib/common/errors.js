///<reference path=".d.ts"/>
"use strict";
var util = require("util");
var path = require("path");
function Exception() {
}
Exception.prototype = new Error();
function resolveCallStack(error) {
    var stackLines = error.stack.split("\n");
    var parsed = _.map(stackLines, function (line) {
        var match = line.match(/^\s*at ([^(]*) \((.*?):([0-9]+):([0-9]+)\)$/);
        if (match) {
            return match;
        }
        match = line.match(/^\s*at (.*?):([0-9]+):([0-9]+)$/);
        if (match) {
            match.splice(1, 0, "<anonymous>");
            return match;
        }
        return line;
    });
    var SourceMapConsumer = require("./vendor/source-map").sourceMap.SourceMapConsumer;
    var fs = require("fs");
    var remapped = _.map(parsed, function (parsedLine) {
        if (_.isString(parsedLine)) {
            return parsedLine;
        }
        var functionName = parsedLine[1];
        var fileName = parsedLine[2];
        var line = +parsedLine[3];
        var column = +parsedLine[4];
        var mapFileName = fileName + ".map";
        if (!fs.existsSync(mapFileName)) {
            return parsedLine.input;
        }
        var mapData = JSON.parse(fs.readFileSync(mapFileName).toString());
        var consumer = new SourceMapConsumer(mapData);
        var sourcePos = consumer.originalPositionFor({ line: line, column: column });
        var source = path.join(path.dirname(fileName), sourcePos.source);
        return util.format("    at %s (%s:%s:%s)", functionName, source, sourcePos.line, sourcePos.column);
    });
    var outputMessage = remapped.join("\n");
    if (outputMessage.indexOf(error.message) === -1) {
        outputMessage = outputMessage.replace(/Error/, "Error: " + error.message);
    }
    return outputMessage;
}
function installUncaughtExceptionListener(actionOnException) {
    process.on("uncaughtException", function (err) {
        var callstack = err.stack;
        if (callstack) {
            try {
                callstack = resolveCallStack(err);
            }
            catch (err) {
                console.error("Error while resolving callStack:", err);
            }
        }
        console.error(callstack || err.toString());
        if (!$injector.resolve("staticConfig").disableAnalytics) {
            try {
                var analyticsService = $injector.resolve("analyticsService");
                analyticsService.trackException(err, callstack);
            }
            catch (e) {
                console.error("Error while reporting exception: " + e);
            }
        }
        if (actionOnException) {
            actionOnException();
        }
    });
}
exports.installUncaughtExceptionListener = installUncaughtExceptionListener;
var Errors = (function () {
    function Errors() {
        this.printCallStack = false;
    }
    Errors.prototype.fail = function (optsOrFormatStr) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var opts = optsOrFormatStr;
        if (_.isString(opts)) {
            opts = { formatStr: opts };
        }
        args.unshift(opts.formatStr);
        var exception = new Exception();
        exception.name = opts.name || "Exception";
        exception.message = util.format.apply(null, args);
        exception.stack = (new Error(exception.message)).stack;
        exception.errorCode = opts.errorCode || 127;
        exception.suppressCommandHelp = opts.suppressCommandHelp;
        throw exception;
    };
    Errors.prototype.failWithoutHelp = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        args.unshift(message);
        this.fail({ formatStr: util.format.apply(null, args), suppressCommandHelp: true });
    };
    Errors.prototype.beginCommand = function (action, printCommandHelp) {
        var _this = this;
        return (function () {
            try {
                return action().wait();
            }
            catch (ex) {
                var loggerLevel = $injector.resolve("logger").getLevel().toUpperCase();
                var printCallStack = _this.printCallStack || loggerLevel === "TRACE" || loggerLevel === "DEBUG";
                console.error(printCallStack
                    ? resolveCallStack(ex)
                    : "\x1B[31;1m" + ex.message + "\x1B[0m");
                if (!ex.suppressCommandHelp) {
                    printCommandHelp().wait();
                }
                process.exit(_.isNumber(ex.errorCode) ? ex.errorCode : 127);
            }
        }).future()();
    };
    Errors.prototype.verifyHeap = function (message) {
        if (global.gc) {
            console.log("verifyHeap: '%s'", message);
            global.gc();
        }
    };
    return Errors;
})();
exports.Errors = Errors;
$injector.register("errors", Errors);
