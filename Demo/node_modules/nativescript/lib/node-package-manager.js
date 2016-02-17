///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var npm = require("npm");
var NodePackageManager = (function () {
    function NodePackageManager($childProcess, $options) {
        this.$childProcess = $childProcess;
        this.$options = $options;
    }
    NodePackageManager.prototype.getCache = function () {
        return npm.cache;
    };
    NodePackageManager.prototype.load = function (config) {
        if (npm.config.loaded) {
            var data = npm.config.sources.cli.data;
            Object.keys(data).forEach(function (k) { return delete data[k]; });
            if (config) {
                _.assign(data, config);
            }
            return Future.fromResult();
        }
        else {
            var future = new Future();
            npm.load(config, function (err) {
                if (err) {
                    future.throw(err);
                }
                else {
                    future.return();
                }
            });
            return future;
        }
    };
    NodePackageManager.prototype.install = function (packageName, pathToSave, config) {
        if (this.$options.ignoreScripts) {
            config = config || {};
            config["ignore-scripts"] = true;
        }
        return this.loadAndExecute("install", [pathToSave, packageName], { config: config });
    };
    NodePackageManager.prototype.uninstall = function (packageName, config, path) {
        return this.loadAndExecute("uninstall", [[packageName]], { config: config, path: path });
    };
    NodePackageManager.prototype.cache = function (packageName, version, config) {
        return this.loadAndExecute("cache", [packageName, version, undefined, false], { subCommandName: "add", config: config });
    };
    NodePackageManager.prototype.cacheUnpack = function (packageName, version, unpackTarget) {
        return this.loadAndExecute("cache", [packageName, version, unpackTarget, null, null, null, null], { subCommandName: "unpack" });
    };
    NodePackageManager.prototype.view = function (packageName, propertyName) {
        return this.loadAndExecute("view", [[packageName, propertyName], [false]]);
    };
    NodePackageManager.prototype.executeNpmCommand = function (npmCommandName, currentWorkingDirectory) {
        return this.$childProcess.exec(npmCommandName, { cwd: currentWorkingDirectory });
    };
    NodePackageManager.prototype.loadAndExecute = function (commandName, args, opts) {
        var _this = this;
        return (function () {
            opts = opts || {};
            _this.load(opts.config).wait();
            return _this.executeCore(commandName, args, opts).wait();
        }).future()();
    };
    NodePackageManager.prototype.executeCore = function (commandName, args, opts) {
        var future = new Future();
        var oldNpmPath = undefined;
        var callback = function (err, data) {
            if (oldNpmPath) {
                npm.prefix = oldNpmPath;
            }
            if (err) {
                future.throw(err);
            }
            else {
                future.return(data);
            }
        };
        args.push(callback);
        if (opts && opts.path) {
            oldNpmPath = npm.prefix;
            npm.prefix = opts.path;
        }
        var subCommandName = opts.subCommandName;
        var command = subCommandName ? npm.commands[commandName][subCommandName] : npm.commands[commandName];
        command.apply(this, args);
        return future;
    };
    return NodePackageManager;
})();
exports.NodePackageManager = NodePackageManager;
$injector.register("npm", NodePackageManager);
