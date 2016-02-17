///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var child_process = require("child_process");
var ChildProcess = (function () {
    function ChildProcess($logger, $errors) {
        this.$logger = $logger;
        this.$errors = $errors;
    }
    ChildProcess.prototype.exec = function (command, options, execOptions) {
        var _this = this;
        var future = new Future();
        var callback = function (error, stdout, stderr) {
            _this.$logger.trace("Exec %s \n stdout: %s \n stderr: %s", command, stdout.toString(), stderr.toString());
            if (error) {
                future.throw(error);
            }
            else {
                var output = execOptions && execOptions.showStderr ? { stdout: stdout, stderr: stderr } : stdout;
                future.return(output);
            }
        };
        if (options) {
            child_process.exec(command, options, callback);
        }
        else {
            child_process.exec(command, callback);
        }
        return future;
    };
    ChildProcess.prototype.execFile = function (command, args) {
        this.$logger.debug("execFile: %s %s", command, this.getArgumentsAsQuotedString(args));
        var future = new Future();
        child_process.execFile(command, args, function (error, stdout) {
            if (error) {
                future.throw(error);
            }
            else {
                future.return(stdout);
            }
        });
        return future;
    };
    ChildProcess.prototype.spawn = function (command, args, options) {
        this.$logger.debug("spawn: %s %s", command, this.getArgumentsAsQuotedString(args));
        return child_process.spawn(command, args, options);
    };
    ChildProcess.prototype.fork = function (modulePath, args, options) {
        this.$logger.debug("fork: %s %s", modulePath, this.getArgumentsAsQuotedString(args));
        return child_process.fork(modulePath, args, options);
    };
    ChildProcess.prototype.spawnFromEvent = function (command, args, event, options, spawnFromEventOptions) {
        var future = new Future();
        var childProcess = this.spawn(command, args, options);
        var capturedOut = "";
        var capturedErr = "";
        if (childProcess.stdout) {
            childProcess.stdout.on("data", function (data) {
                capturedOut += data;
            });
        }
        if (childProcess.stderr) {
            childProcess.stderr.on("data", function (data) {
                capturedErr += data;
            });
        }
        childProcess.on(event, function (arg) {
            var exitCode = typeof arg === "number" ? arg : arg && arg.code;
            var result = {
                stdout: capturedOut,
                stderr: capturedErr,
                exitCode: exitCode
            };
            if (spawnFromEventOptions && spawnFromEventOptions.throwError === false) {
                if (!future.isResolved()) {
                    future.return(result);
                }
            }
            else {
                if (exitCode === 0) {
                    future.return(result);
                }
                else {
                    var errorMessage = "Command " + command + " failed with exit code " + exitCode;
                    if (capturedErr) {
                        errorMessage += " Error output: \n " + capturedErr;
                    }
                    if (!future.isResolved()) {
                        future.throw(new Error(errorMessage));
                    }
                }
            }
        });
        childProcess.once("error", function (err) {
            if (!future.isResolved()) {
                if (spawnFromEventOptions && spawnFromEventOptions.throwError === false) {
                    var result = {
                        stdout: capturedOut,
                        stderr: err.message,
                        exitCode: err.code
                    };
                    future.return(result);
                }
                else {
                    future.throw(err);
                }
            }
        });
        return future;
    };
    ChildProcess.prototype.tryExecuteApplication = function (command, args, event, errorMessage, condition) {
        var _this = this;
        return (function () {
            var childProcess = _this.tryExecuteApplicationCore(command, args, event, errorMessage).wait();
            if (condition && condition(childProcess)) {
                _this.$errors.fail(errorMessage);
            }
        }).future()();
    };
    ChildProcess.prototype.tryExecuteApplicationCore = function (command, args, event, errorMessage) {
        try {
            return this.spawnFromEvent(command, args, event, undefined, { throwError: false });
        }
        catch (e) {
            var message = (e.code === "ENOENT") ? errorMessage : e.message;
            this.$errors.failWithoutHelp(message);
        }
    };
    ChildProcess.prototype.getArgumentsAsQuotedString = function (args) {
        return args.map(function (argument) { return ("\"" + argument + "\""); }).join(" ");
    };
    return ChildProcess;
})();
exports.ChildProcess = ChildProcess;
$injector.register("childProcess", ChildProcess);
