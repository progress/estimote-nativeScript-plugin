///<reference path="../../.d.ts"/>
"use strict";
var AndroidDebugBridge = (function () {
    function AndroidDebugBridge(identifier, $childProcess, $errors, $logger, $staticConfig) {
        this.identifier = identifier;
        this.$childProcess = $childProcess;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$staticConfig = $staticConfig;
    }
    AndroidDebugBridge.prototype.executeCommand = function (args) {
        var _this = this;
        return (function () {
            var command = _this.composeCommand(args).wait();
            return _this.$childProcess.spawnFromEvent(command.command, command.args, "close", undefined, { throwError: false }).wait().stdout;
        }).future()();
    };
    AndroidDebugBridge.prototype.executeShellCommand = function (args) {
        var _this = this;
        return (function () {
            args.unshift("shell");
            var shellCommand = _this.composeCommand(args).wait();
            return _this.$childProcess.spawnFromEvent(shellCommand.command, shellCommand.args, "close", undefined, { throwError: false }).wait().stdout;
        }).future()();
    };
    AndroidDebugBridge.prototype.sendBroadcastToDevice = function (action, extras) {
        var _this = this;
        if (extras === void 0) { extras = {}; }
        return (function () {
            var broadcastCommand = ["am", "broadcast", "-a", ("" + action)];
            _.each(extras, function (value, key) { return broadcastCommand.push("-e", key, value); });
            var result = _this.executeShellCommand(broadcastCommand).wait();
            _this.$logger.trace("Broadcast result " + result + " from " + broadcastCommand);
            var match = result.match(/Broadcast completed: result=(\d+)/);
            if (match) {
                return +match[1];
            }
            _this.$errors.failWithoutHelp("Unable to broadcast to android device:\n%s", result);
        }).future()();
    };
    AndroidDebugBridge.prototype.composeCommand = function (params) {
        var _this = this;
        return (function () {
            var command = _this.$staticConfig.getAdbFilePath().wait();
            var args = ["-s", ("" + _this.identifier)].concat(params);
            return { command: command, args: args };
        }).future()();
    };
    return AndroidDebugBridge;
})();
exports.AndroidDebugBridge = AndroidDebugBridge;
