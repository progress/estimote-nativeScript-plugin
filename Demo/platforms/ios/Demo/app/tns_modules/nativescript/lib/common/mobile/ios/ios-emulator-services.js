///<reference path="../../.d.ts"/>
"use strict";
var Future = require("fibers/future");
var path = require("path");
var shell = require("shelljs");
var IosEmulatorServices = (function () {
    function IosEmulatorServices($logger, $emulatorSettingsService, $errors, $childProcess, $devicePlatformsConstants, $hostInfo, $options, $fs, $bplistParser, $dispatcher) {
        this.$logger = $logger;
        this.$emulatorSettingsService = $emulatorSettingsService;
        this.$errors = $errors;
        this.$childProcess = $childProcess;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$hostInfo = $hostInfo;
        this.$options = $options;
        this.$fs = $fs;
        this.$bplistParser = $bplistParser;
        this.$dispatcher = $dispatcher;
        this._iosSim = null;
    }
    IosEmulatorServices.prototype.getEmulatorId = function () {
        return Future.fromResult("");
    };
    IosEmulatorServices.prototype.checkDependencies = function () {
        return Future.fromResult();
    };
    IosEmulatorServices.prototype.checkAvailability = function (dependsOnProject) {
        var _this = this;
        if (dependsOnProject === void 0) { dependsOnProject = true; }
        return (function () {
            if (!_this.$hostInfo.isDarwin) {
                _this.$errors.fail("iOS Simulator is available only on Mac OS X.");
            }
            var platform = _this.$devicePlatformsConstants.iOS;
            if (dependsOnProject && !_this.$emulatorSettingsService.canStart(platform).wait()) {
                _this.$errors.fail("The current project does not target iOS and cannot be run in the iOS Simulator.");
            }
        }).future()();
    };
    IosEmulatorServices.prototype.startEmulator = function (app, emulatorOptions) {
        var _this = this;
        return (function () {
            return _this.startEmulatorCore(app, emulatorOptions);
        }).future()();
    };
    IosEmulatorServices.prototype.postDarwinNotification = function (notification) {
        var iosSimPath = require.resolve("ios-sim-portable");
        var nodeCommandName = process.argv[0];
        var opts = ["notify-post", notification];
        if (this.$options.device) {
            opts.push("--device", this.$options.device);
        }
        return this.$childProcess.exec(nodeCommandName + " " + iosSimPath + " " + opts.join(' '));
    };
    IosEmulatorServices.prototype.sync = function (appIdentifier, projectFilesPath, notRunningSimulatorAction, getApplicationPathForiOSSimulatorAction) {
        var syncAction = function (applicationPath) { return (function () { shell.cp("-Rf", projectFilesPath, applicationPath); }).future()(); };
        return this.syncCore(appIdentifier, notRunningSimulatorAction, syncAction, getApplicationPathForiOSSimulatorAction);
    };
    IosEmulatorServices.prototype.syncFiles = function (appIdentifier, projectFilesPath, projectFiles, notRunningSimulatorAction, getApplicationPathForiOSSimulatorAction, relativeToProjectBasePathAction) {
        var _this = this;
        var syncAction = function (applicationPath) { return _this.transferFiles(appIdentifier, projectFiles, relativeToProjectBasePathAction, applicationPath); };
        return this.syncCore(appIdentifier, notRunningSimulatorAction, syncAction, getApplicationPathForiOSSimulatorAction);
    };
    IosEmulatorServices.prototype.removeFiles = function (appIdentifier, projectFilesPath, projectFiles, relativeToProjectBasePathAction) {
        var _this = this;
        var applicationPath = this.getApplicationPath(appIdentifier);
        _.each(projectFiles, function (projectFile) {
            var destinationFilePath = path.join(applicationPath, relativeToProjectBasePathAction(projectFile), path.basename(projectFile));
            _this.$logger.trace("Deleting " + destinationFilePath + ".");
            shell.rm(destinationFilePath);
        });
    };
    IosEmulatorServices.prototype.transferFiles = function (appIdentifier, projectFiles, relativeToProjectBasePathAction, applicationPath) {
        var _this = this;
        return (function () {
            applicationPath = applicationPath || _this.getApplicationPath(appIdentifier);
            _.each(projectFiles, function (projectFile) {
                var destinationPath = path.join(applicationPath, relativeToProjectBasePathAction(projectFile));
                _this.$logger.trace("Transfering " + projectFile + " to " + destinationPath);
                shell.cp("-Rf", projectFile, destinationPath);
            });
        }).future()();
    };
    IosEmulatorServices.prototype.isSimulatorRunning = function () {
        var _this = this;
        return (function () {
            try {
                var output = _this.$childProcess.exec("ps cax | grep launchd_sim").wait();
                return output.indexOf('launchd_sim') !== -1;
            }
            catch (e) {
                return false;
            }
        }).future()();
    };
    IosEmulatorServices.prototype.restartApplication = function (appIdentifier, getApplicationPathForiOSSimulatorAction) {
        var _this = this;
        return (function () {
            var runningSimulatorId = _this.getRunningSimulatorId(appIdentifier);
            var applicationPath = _this.getApplicationPath(appIdentifier);
            if (applicationPath) {
                _this.killApplication(path.basename(applicationPath)).wait();
            }
            else {
                var app = getApplicationPathForiOSSimulatorAction().wait();
                _this.$childProcess.exec("xcrun simctl install " + runningSimulatorId + " " + app).wait();
            }
            _this.launchApplication(runningSimulatorId, appIdentifier);
        }).future()();
    };
    Object.defineProperty(IosEmulatorServices.prototype, "iosSim", {
        get: function () {
            if (!this._iosSim) {
                this._iosSim = require("ios-sim-portable");
            }
            return this._iosSim;
        },
        enumerable: true,
        configurable: true
    });
    IosEmulatorServices.prototype.startEmulatorCore = function (app, emulatorOptions) {
        this.$logger.info("Starting iOS Simulator");
        var iosSimPath = require.resolve("ios-sim-portable");
        var nodeCommandName = process.argv[0];
        if (this.$options.availableDevices) {
            this.$childProcess.spawnFromEvent(nodeCommandName, [iosSimPath, "device-types"], "close", { stdio: "inherit" }).wait();
            return;
        }
        var opts = [
            iosSimPath,
            "launch", app, emulatorOptions.appId
        ];
        if (this.$options.timeout) {
            opts = opts.concat("--timeout", this.$options.timeout);
        }
        if (this.$options.sdk) {
            opts = opts.concat("--sdkVersion", this.$options.sdk);
        }
        if (!this.$options.justlaunch) {
            opts.push("--logging");
        }
        else {
            if (emulatorOptions) {
                if (emulatorOptions.stderrFilePath) {
                    opts = opts.concat("--stderr", emulatorOptions.stderrFilePath);
                }
                if (emulatorOptions.stdoutFilePath) {
                    opts = opts.concat("--stdout", emulatorOptions.stdoutFilePath);
                }
            }
            opts.push("--exit");
        }
        if (this.$options.device) {
            opts = opts.concat("--device", this.$options.device);
        }
        else if (emulatorOptions && emulatorOptions.deviceType) {
            opts = opts.concat("--device", emulatorOptions.deviceType);
        }
        if (emulatorOptions && emulatorOptions.args) {
            opts.push("--args=" + emulatorOptions.args);
        }
        if (emulatorOptions && emulatorOptions.waitForDebugger) {
            opts.push("--waitForDebugger");
        }
        var stdioOpts = { stdio: (emulatorOptions && emulatorOptions.captureStdin) ? "pipe" : "inherit" };
        return this.$childProcess.spawn(nodeCommandName, opts, stdioOpts);
    };
    IosEmulatorServices.prototype.syncCore = function (appIdentifier, notRunningSimulatorAction, syncAction, getApplicationPathForiOSSimulatorAction) {
        var _this = this;
        return (function () {
            if (!_this.isSimulatorRunning().wait()) {
                notRunningSimulatorAction().wait();
            }
            var runningSimulatorId = _this.getRunningSimulatorId(appIdentifier);
            var applicationPath = _this.getApplicationPath(appIdentifier);
            if (applicationPath) {
                syncAction(applicationPath).wait();
                _this.killApplication(path.basename(applicationPath)).wait();
            }
            else {
                var app = getApplicationPathForiOSSimulatorAction().wait();
                _this.$childProcess.exec("xcrun simctl install " + runningSimulatorId + " " + app).wait();
            }
            _this.launchApplication(runningSimulatorId, appIdentifier);
        }).future()();
    };
    IosEmulatorServices.prototype.getApplicationPath = function (appIdentifier) {
        var runningSimulatorId = this.getRunningSimulatorId(appIdentifier);
        var applicationPath = this.iosSim.getApplicationPath(runningSimulatorId, appIdentifier);
        return applicationPath;
    };
    IosEmulatorServices.prototype.getRunningSimulatorId = function (appIdentifier) {
        var runningSimulator = this.iosSim.getRunningSimulator(appIdentifier);
        var runningSimulatorId = runningSimulator.id;
        return runningSimulatorId;
    };
    IosEmulatorServices.prototype.killApplication = function (applicationName) {
        var _this = this;
        return (function () {
            try {
                _this.$childProcess.exec("killall " + applicationName.split(".")[0]).wait();
            }
            catch (e) {
                _this.$logger.trace("Unable to kill simulator: " + e);
            }
        }).future()();
    };
    IosEmulatorServices.prototype.launchApplication = function (runningSimulatorId, appIdentifier) {
        var _this = this;
        setTimeout(function () {
            _this.$childProcess.exec("xcrun simctl launch " + runningSimulatorId + " " + appIdentifier);
        }, 500);
    };
    return IosEmulatorServices;
})();
$injector.register("iOSEmulatorServices", IosEmulatorServices);
