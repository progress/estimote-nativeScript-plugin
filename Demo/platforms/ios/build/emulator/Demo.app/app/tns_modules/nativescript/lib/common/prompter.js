///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var prompt = require("inquirer");
var helpers = require("./helpers");
var readline = require("readline");
var MuteStream = require("mute-stream");
var Prompter = (function () {
    function Prompter() {
        prompt.message = "";
        prompt.delimiter = ":";
        prompt.colors = false;
        prompt.isDefaultValueEditable = true;
        if (helpers.isInteractive()) {
            process.stdin.setRawMode(true);
            var mutestream = new MuteStream();
            mutestream.pipe(process.stdout);
            mutestream.mute();
            this.ctrlcReader = readline.createInterface({
                input: process.stdin,
                output: mutestream
            });
            this.ctrlcReader.on("SIGINT", function () { return process.exit(); });
        }
    }
    Prompter.prototype.dispose = function () {
        if (this.ctrlcReader) {
            this.ctrlcReader.close();
        }
    };
    Prompter.prototype.get = function (schemas) {
        var future = new Future;
        if (!helpers.isInteractive()) {
            if (_.any(schemas, function (s) { return !s.default; })) {
                future.throw(new Error("Console is not interactive and no default action specified."));
            }
            else {
                var result = {};
                _.each(schemas, function (s) {
                    result[s.name] = s.default();
                });
                future.return(result);
            }
        }
        else {
            prompt.prompt(schemas, function (result) {
                if (result) {
                    future.return(result);
                }
                else {
                    future.throw(new Error("Unable to get result from prompt: " + result));
                }
            });
        }
        return future;
    };
    Prompter.prototype.getPassword = function (prompt, options) {
        var _this = this;
        return (function () {
            var schema = {
                message: prompt,
                type: "password",
                name: "password",
                validate: function (value) {
                    var allowEmpty = options && options.allowEmpty;
                    return (!allowEmpty && !value) ? "Password must be non-empty" : true;
                }
            };
            var result = _this.get([schema]).wait();
            return result.password;
        }).future()();
    };
    Prompter.prototype.getString = function (prompt, defaultAction) {
        var _this = this;
        return (function () {
            var schema = {
                message: prompt,
                type: "input",
                name: "inputString"
            };
            if (defaultAction) {
                schema.default = defaultAction;
            }
            var result = _this.get([schema]).wait();
            return result.inputString;
        }).future()();
    };
    Prompter.prototype.promptForChoice = function (promptMessage, choices) {
        var _this = this;
        return (function () {
            var schema = {
                message: promptMessage,
                type: "list",
                name: "userAnswer",
                choices: choices
            };
            var result = _this.get([schema]).wait();
            return result.userAnswer;
        }).future()();
    };
    Prompter.prototype.confirm = function (prompt, defaultAction) {
        var _this = this;
        return (function () {
            var schema = {
                type: "confirm",
                name: "prompt",
                default: defaultAction,
                message: prompt
            };
            var result = _this.get([schema]).wait();
            return result.prompt;
        }).future()();
    };
    return Prompter;
})();
exports.Prompter = Prompter;
$injector.register("prompter", Prompter);
