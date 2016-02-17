///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var util = require("util");
var Future = require("fibers/future");
var Hook = (function () {
    function Hook(name, fullPath) {
        this.name = name;
        this.fullPath = fullPath;
    }
    return Hook;
})();
var HooksService = (function () {
    function HooksService($childProcess, $fs, $logger, $errors, $staticConfig, $injector, $projectHelper) {
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$errors = $errors;
        this.$staticConfig = $staticConfig;
        this.$injector = $injector;
        this.$projectHelper = $projectHelper;
    }
    HooksService.prototype.initialize = function () {
        this.cachedHooks = {};
        var relativeToLibPath = path.join(__dirname, "../../");
        this.hooksDirectories = [
            path.join(relativeToLibPath, HooksService.HOOKS_DIRECTORY_NAME),
            path.join(relativeToLibPath, "common", HooksService.HOOKS_DIRECTORY_NAME)
        ];
        if (this.$projectHelper.projectDir) {
            this.hooksDirectories.push(path.join(this.$projectHelper.projectDir, HooksService.HOOKS_DIRECTORY_NAME));
        }
        this.$logger.trace("Hooks directories: " + util.inspect(this.hooksDirectories));
    };
    HooksService.formatHookName = function (commandName) {
        return commandName.replace(/\|[\s\S]*$/, "");
    };
    HooksService.prototype.executeBeforeHooks = function (commandName, hookArguments) {
        if (!this.hooksDirectories) {
            this.initialize();
        }
        var beforeHookName = "before-" + HooksService.formatHookName(commandName);
        this.$logger.trace("BeforeHookName for command %s is %s", commandName, beforeHookName);
        return this.executeHooks(beforeHookName, hookArguments);
    };
    HooksService.prototype.executeAfterHooks = function (commandName, hookArguments) {
        if (!this.hooksDirectories) {
            this.initialize();
        }
        var afterHookName = "after-" + HooksService.formatHookName(commandName);
        this.$logger.trace("AfterHookName for command %s is %s", commandName, afterHookName);
        return this.executeHooks(afterHookName, hookArguments);
    };
    HooksService.prototype.executeHooks = function (hookName, hookArguments) {
        var _this = this;
        return (function () {
            try {
                _.each(_this.hooksDirectories, function (hooksDirectory) {
                    _this.executeHooksInDirectory(hooksDirectory, hookName, hookArguments).wait();
                });
            }
            catch (err) {
                _this.$logger.trace("Failed during hook execution.");
                _this.$errors.failWithoutHelp(err.message);
            }
        }).future()();
    };
    HooksService.prototype.executeHooksInDirectory = function (directoryPath, hookName, hookArguments) {
        var _this = this;
        return (function () {
            var hooks = _this.getHooksByName(directoryPath, hookName).wait();
            hooks.forEach(function (hook) {
                _this.$logger.info("Executing %s hook from %s", hookName, hook.fullPath);
                var command = _this.getSheBangInterpreter(hook).wait();
                var inProc = false;
                if (!command) {
                    command = hook.fullPath;
                    if (path.extname(hook.fullPath).toLowerCase() === ".js") {
                        command = process.argv[0];
                        inProc = _this.shouldExecuteInProcess(_this.$fs.readText(hook.fullPath).wait());
                    }
                }
                if (inProc) {
                    _this.$logger.trace("Executing %s hook at location %s in-process", hookName, hook.fullPath);
                    var hookEntryPoint = require(hook.fullPath);
                    var maybePromise = _this.$injector.resolve(hookEntryPoint, hookArguments);
                    if (maybePromise) {
                        _this.$logger.trace('Hook promises to signal completion');
                        var hookCompletion = new Future();
                        maybePromise.then(function () { return hookCompletion.return(); }, function (err) { return hookCompletion.throw(err); });
                        hookCompletion.wait();
                    }
                    _this.$logger.trace('Hook completed');
                }
                else {
                    var environment = _this.prepareEnvironment(hook.fullPath);
                    _this.$logger.trace("Executing %s hook at location %s with environment ", hookName, hook.fullPath, environment);
                    var output = _this.$childProcess.spawnFromEvent(command, [hook.fullPath], "close", environment, { throwError: false }).wait();
                    if (output.exitCode !== 0) {
                        throw new Error(output.stdout + output.stderr);
                    }
                }
            });
        }).future()();
    };
    HooksService.prototype.getHooksByName = function (directoryPath, hookName) {
        var _this = this;
        return (function () {
            var allBaseHooks = _this.getHooksInDirectory(directoryPath).wait();
            var baseHooks = _.filter(allBaseHooks, function (hook) { return hook.name.toLowerCase() === hookName.toLowerCase(); });
            var moreHooks = _this.getHooksInDirectory(path.join(directoryPath, hookName)).wait();
            return baseHooks.concat(moreHooks);
        }).future()();
    };
    HooksService.prototype.getHooksInDirectory = function (directoryPath) {
        var _this = this;
        return (function () {
            if (!_this.cachedHooks[directoryPath]) {
                var hooks = [];
                if (directoryPath && _this.$fs.exists(directoryPath).wait() && _this.$fs.getFsStats(directoryPath).wait().isDirectory()) {
                    var directoryContent = _this.$fs.readDirectory(directoryPath).wait();
                    var files = _.filter(directoryContent, function (entry) {
                        var fullPath = path.join(directoryPath, entry);
                        var isFile = _this.$fs.getFsStats(fullPath).wait().isFile();
                        return isFile;
                    });
                    hooks = _.map(files, function (file) {
                        var fullPath = path.join(directoryPath, file);
                        return new Hook(_this.getBaseFilename(file), fullPath);
                    });
                }
                _this.cachedHooks[directoryPath] = hooks;
            }
            return _this.cachedHooks[directoryPath];
        }).future()();
    };
    HooksService.prototype.prepareEnvironment = function (hookFullPath) {
        var clientName = this.$staticConfig.CLIENT_NAME.toUpperCase();
        var environment = {};
        environment[util.format("%s-COMMANDLINE", clientName)] = process.argv.join(' ');
        environment[util.format("%s-HOOK_FULL_PATH", clientName)] = hookFullPath;
        environment[util.format("%s-VERSION", clientName)] = this.$staticConfig.version;
        return {
            cwd: this.$projectHelper.projectDir,
            stdio: 'inherit',
            env: _.extend({}, process.env, environment)
        };
    };
    HooksService.prototype.getSheBangInterpreter = function (hook) {
        var _this = this;
        return (function () {
            var interpreter = null;
            var shMatch = [];
            var fileContent = _this.$fs.readText(hook.fullPath).wait();
            if (fileContent) {
                var sheBangMatch = fileContent.split('\n')[0].match(/^#!(?:\/usr\/bin\/env )?([^\r\n]+)/m);
                if (sheBangMatch) {
                    interpreter = sheBangMatch[1];
                }
                if (interpreter) {
                    shMatch = interpreter.match(/bin\/((?:ba)?sh)$/);
                }
                if (shMatch) {
                    interpreter = shMatch[1];
                }
            }
            return interpreter;
        }).future()();
    };
    HooksService.prototype.getBaseFilename = function (fileName) {
        return fileName.substr(0, fileName.length - path.extname(fileName).length);
    };
    HooksService.prototype.shouldExecuteInProcess = function (scriptSource) {
        try {
            var esprima = require('esprima');
            var ast = esprima.parse(scriptSource);
            var inproc = false;
            ast.body.forEach(function (statement) {
                if (statement.type !== 'ExpressionStatement'
                    || statement.expression.type !== 'AssignmentExpression') {
                    return;
                }
                var left = statement.expression.left;
                if (left.type === 'MemberExpression' &&
                    left.object && left.object.type === 'Identifier' && left.object.name === 'module'
                    && left.property && left.property.type === 'Identifier' && left.property.name === 'exports') {
                    inproc = true;
                }
            });
            return inproc;
        }
        catch (err) {
            return false;
        }
    };
    HooksService.HOOKS_DIRECTORY_NAME = "hooks";
    return HooksService;
})();
exports.HooksService = HooksService;
$injector.register("hooksService", HooksService);
