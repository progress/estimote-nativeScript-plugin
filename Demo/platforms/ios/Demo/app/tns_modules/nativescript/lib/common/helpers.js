///<reference path=".d.ts"/>
"use strict";
var uuid = require("node-uuid");
var Fiber = require("fibers");
var Table = require("cli-table");
var Future = require("fibers/future");
var os_1 = require("os");
function bashQuote(s) {
    if (s[0] === "'" && s[s.length - 1] === "'") {
        return s;
    }
    return "'" + s.replace(/'/g, '\'"\'"\'') + "'";
}
function cmdQuote(s) {
    if (s[0] === '"' && s[s.length - 1] === '"') {
        return s;
    }
    return '"' + s.replace(/"/g, '\\"') + '"';
}
function quoteString(s) {
    if (!s) {
        return s;
    }
    return (os_1.platform() === "win32") ? cmdQuote(s) : bashQuote(s);
}
exports.quoteString = quoteString;
function createGUID(useBraces) {
    if (useBraces === void 0) { useBraces = true; }
    var output;
    if (useBraces) {
        output = "{" + uuid.v4() + "}";
    }
    else {
        output = uuid.v4();
    }
    return output;
}
exports.createGUID = createGUID;
function stringReplaceAll(string, find, replace) {
    return string.split(find).join(replace);
}
exports.stringReplaceAll = stringReplaceAll;
function isRequestSuccessful(request) {
    return request.statusCode >= 200 && request.statusCode < 300;
}
exports.isRequestSuccessful = isRequestSuccessful;
function isResponseRedirect(response) {
    return _.contains([301, 302, 303, 307, 308], response.statusCode);
}
exports.isResponseRedirect = isResponseRedirect;
function formatListOfNames(names, conjunction) {
    if (conjunction === void 0) { conjunction = "or"; }
    if (names.length <= 1) {
        return names[0];
    }
    else {
        return _.initial(names).join(", ") + " " + conjunction + " " + names[names.length - 1];
    }
}
exports.formatListOfNames = formatListOfNames;
function getRelativeToRootPath(rootPath, filePath) {
    var relativeToRootPath = filePath.substr(rootPath.length);
    return relativeToRootPath;
}
exports.getRelativeToRootPath = getRelativeToRootPath;
function versionCompare(version1, version2) {
    version1 = version1.split("-")[0];
    version2 = version2.split("-")[0];
    var v1array = _.map(version1.split("."), function (x) { return parseInt(x, 10); }), v2array = _.map(version2.split("."), function (x) { return parseInt(x, 10); });
    if (v1array.length !== v2array.length) {
        throw new Error("Version strings are not in the same format");
    }
    for (var i = 0; i < v1array.length; ++i) {
        if (v1array[i] !== v2array[i]) {
            return v1array[i] > v2array[i] ? 1 : -1;
        }
    }
    return 0;
}
exports.versionCompare = versionCompare;
function isInteractive() {
    return process.stdout.isTTY && process.stdin.isTTY;
}
exports.isInteractive = isInteractive;
function toBoolean(str) {
    return str === "true";
}
exports.toBoolean = toBoolean;
function block(operation) {
    if (isInteractive()) {
        process.stdin.setRawMode(false);
    }
    operation();
    if (isInteractive()) {
        process.stdin.setRawMode(true);
    }
}
exports.block = block;
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
exports.isNumber = isNumber;
function fromWindowsRelativePathToUnix(windowsRelativePath) {
    return windowsRelativePath.replace(/\\/g, "/");
}
exports.fromWindowsRelativePathToUnix = fromWindowsRelativePathToUnix;
function isNullOrWhitespace(input) {
    if (!input) {
        return true;
    }
    return input.replace(/\s/gi, "").length < 1;
}
exports.isNullOrWhitespace = isNullOrWhitespace;
function getCurrentEpochTime() {
    var dateTime = new Date();
    return dateTime.getTime();
}
exports.getCurrentEpochTime = getCurrentEpochTime;
function sleep(ms) {
    var fiber = Fiber.current;
    setTimeout(function () { return fiber.run(); }, ms);
    Fiber.yield();
}
exports.sleep = sleep;
function createTable(headers, data) {
    var table = new Table({
        head: headers,
        chars: { "mid": "", "left-mid": "", "mid-mid": "", "right-mid": "" }
    });
    _.forEach(data, function (row) { return table.push(row); });
    return table;
}
exports.createTable = createTable;
function remove(array, predicate, numberOfElements) {
    numberOfElements = numberOfElements || 1;
    var index = _.findIndex(array, predicate);
    if (index === -1) {
        return new Array();
    }
    return array.splice(index, numberOfElements);
}
exports.remove = remove;
function trimSymbol(str, symbol) {
    while (str.charAt(0) === symbol) {
        str = str.substr(1);
    }
    while (str.charAt(str.length - 1) === symbol) {
        str = str.substr(0, str.length - 1);
    }
    return str;
}
exports.trimSymbol = trimSymbol;
function getFuturesResults(futures, predicate) {
    Future.wait(futures);
    return _(futures)
        .map(function (f) { return f.get(); })
        .filter(predicate)
        .flatten()
        .value();
}
exports.getFuturesResults = getFuturesResults;
function appendZeroesToVersion(version, requiredVersionLength) {
    var zeroesToAppend = requiredVersionLength - version.split(".").length;
    for (var index = 0; index < zeroesToAppend; index++) {
        version += ".0";
    }
    return version;
}
exports.appendZeroesToVersion = appendZeroesToVersion;
function decorateMethod(before, after) {
    return function (target, propertyKey, descriptor) {
        var sink = descriptor.value;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            if (before) {
                before(sink, this, args);
            }
            var result = sink.apply(this, args);
            if (after) {
                return after(sink, this, result, args);
            }
            return result;
        };
    };
}
exports.decorateMethod = decorateMethod;
function hook(commandName) {
    function getHooksService(self) {
        var hooksService = self.$hooksService;
        if (!hooksService) {
            var injector = self.$injector;
            if (!injector) {
                throw Error('Type with hooks needs to have either $hooksService or $injector injected.');
            }
            hooksService = injector.resolve('hooksService');
        }
        return hooksService;
    }
    function prepareArguments(method, args) {
        annotate(method);
        var argHash = {};
        for (var i = 0; i < method.$inject.args.length; ++i) {
            argHash[method.$inject.args[i]] = args[i];
        }
        argHash.$arguments = args;
        return {
            hookArgs: argHash
        };
    }
    return decorateMethod(function (method, self, args) {
        getHooksService(self).executeBeforeHooks(commandName, prepareArguments(method, args)).wait();
    }, function (method, self, resultPromise, args) {
        var result = resultPromise.wait();
        getHooksService(self).executeAfterHooks(commandName, prepareArguments(method, args)).wait();
        return Future.fromResult(result);
    });
}
exports.hook = hook;
function isFuture(candidateFuture) {
    return candidateFuture && typeof (candidateFuture.wait) === "function";
}
exports.isFuture = isFuture;
function whenAny() {
    var futures = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        futures[_i - 0] = arguments[_i];
    }
    var resultFuture = new Future();
    var futuresLeft = futures.length;
    _.each(futures, function (future) {
        future.resolve(function (error, result) {
            futuresLeft--;
            if (!resultFuture.isResolved()) {
                if (typeof error === "undefined") {
                    resultFuture.return(future);
                }
                else if (futuresLeft === 0) {
                    resultFuture.throw(new Error("None of the futures succeeded."));
                }
            }
        });
    });
    return resultFuture;
}
exports.whenAny = whenAny;
function connectEventually(factory, handler) {
    function tryConnect() {
        var tryConnectAfterTimeout = setTimeout.bind(undefined, tryConnect, 1000);
        var socket = factory();
        socket.on("connect", function () {
            socket.removeListener("error", tryConnectAfterTimeout);
            handler(socket);
        });
        socket.on("error", tryConnectAfterTimeout);
    }
    tryConnect();
}
exports.connectEventually = connectEventually;
var FN_NAME_AND_ARGS = /^function\s*([^\(]*)\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
function annotate(fn) {
    var $inject, fnText, argDecl;
    if (typeof fn === "function") {
        if (!($inject = fn.$inject) || $inject.name !== fn.name) {
            $inject = { args: [], name: "" };
            fnText = fn.toString().replace(STRIP_COMMENTS, '');
            argDecl = fnText.match(FN_NAME_AND_ARGS);
            $inject.name = argDecl[1];
            if (fn.length) {
                argDecl[2].split(FN_ARG_SPLIT).forEach(function (arg) {
                    arg.replace(FN_ARG, function (all, underscore, name) { return $inject.args.push(name); });
                });
            }
            fn.$inject = $inject;
        }
    }
    return $inject;
}
exports.annotate = annotate;
