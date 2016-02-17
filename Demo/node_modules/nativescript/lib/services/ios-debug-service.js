///<reference path="../.d.ts"/>
"use strict";
var net = require("net");
var path = require("path");
var semver = require("semver");
var byline = require("byline");
var InspectorBackendPort = 18181;
var IOSDebugService = (function () {
    function IOSDebugService($platformService, $iOSEmulatorServices, $devicesService, $platformsData, $projectData, $childProcess, $logger, $fs, $errors, $injector, $npmInstallationManager, $options, $projectDataService, $utils, $iOSNotification, $iOSSocketRequestExecutor, $socketProxyFactory) {
        this.$platformService = $platformService;
        this.$iOSEmulatorServices = $iOSEmulatorServices;
        this.$devicesService = $devicesService;
        this.$platformsData = $platformsData;
        this.$projectData = $projectData;
        this.$childProcess = $childProcess;
        this.$logger = $logger;
        this.$fs = $fs;
        this.$errors = $errors;
        this.$injector = $injector;
        this.$npmInstallationManager = $npmInstallationManager;
        this.$options = $options;
        this.$projectDataService = $projectDataService;
        this.$utils = $utils;
        this.$iOSNotification = $iOSNotification;
        this.$iOSSocketRequestExecutor = $iOSSocketRequestExecutor;
        this.$socketProxyFactory = $socketProxyFactory;
    }
    Object.defineProperty(IOSDebugService.prototype, "platform", {
        get: function () {
            return "ios";
        },
        enumerable: true,
        configurable: true
    });
    IOSDebugService.prototype.debug = function () {
        if (this.$options.debugBrk && this.$options.start) {
            this.$errors.failWithoutHelp("Expected exactly one of the --debug-brk or --start options.");
        }
        if (!this.$options.debugBrk && !this.$options.start) {
            this.$logger.warn("Neither --debug-brk nor --start option was specified. Defaulting to --debug-brk.");
            this.$options.debugBrk = true;
        }
        if (this.$options.emulator) {
            if (this.$options.debugBrk) {
                return this.emulatorDebugBrk();
            }
            else if (this.$options.start) {
                return this.emulatorStart();
            }
        }
        else {
            if (this.$options.debugBrk) {
                return this.deviceDebugBrk();
            }
            else if (this.$options.start) {
                return this.deviceStart();
            }
        }
        this.$errors.failWithoutHelp("Failed to select device or emulator to debug on.");
    };
    IOSDebugService.prototype.debugStart = function () {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ platform: _this.platform, deviceId: _this.$options.device }).wait();
            _this.$devicesService.execute(function (device) { return _this.debugBrkCore(device); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.emulatorDebugBrk = function () {
        var _this = this;
        return (function () {
            var platformData = _this.$platformsData.getPlatformData(_this.platform);
            _this.$platformService.buildPlatform(_this.platform).wait();
            var emulatorPackage = _this.$platformService.getLatestApplicationPackageForEmulator(platformData).wait();
            var child_process = _this.$iOSEmulatorServices.startEmulator(emulatorPackage.packageName, { waitForDebugger: true, captureStdin: true,
                args: "--nativescript-debug-brk", appId: _this.$projectData.projectId }).wait();
            var lineStream = byline(child_process.stdout);
            lineStream.on('data', function (line) {
                var lineText = line.toString();
                if (lineText && _.startsWith(lineText, _this.$projectData.projectId)) {
                    var pid = _.trimLeft(lineText, _this.$projectData.projectId + ": ");
                    _this.$childProcess.exec("lldb -p " + pid + " -o \"process continue\"");
                }
                else {
                    process.stdout.write(line + "\n");
                }
            });
            _this.wireDebuggerClient(function () { return net.connect(InspectorBackendPort); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.emulatorStart = function () {
        var _this = this;
        return (function () {
            _this.wireDebuggerClient(function () { return net.connect(InspectorBackendPort); }).wait();
            var attachRequestMessage = _this.$iOSNotification.attachRequest;
            var iOSEmulator = _this.$iOSEmulatorServices;
            iOSEmulator.postDarwinNotification(attachRequestMessage).wait();
        }).future()();
    };
    IOSDebugService.prototype.deviceDebugBrk = function () {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ platform: _this.platform, deviceId: _this.$options.device }).wait();
            _this.$devicesService.execute(function (device) { return (function () {
                var deploy = _this.$platformService.deployOnDevice(_this.platform);
                _this.debugBrkCore(device).wait();
                deploy.wait();
            }).future()(); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.debugBrkCore = function (device) {
        var _this = this;
        return (function () {
            var timeout = _this.$utils.getMilliSecondsTimeout(IOSDebugService.TIMEOUT_SECONDS);
            var readyForAttachTimeout = _this.getReadyForAttachTimeout(timeout);
            _this.$iOSSocketRequestExecutor.executeLaunchRequest(device, timeout, readyForAttachTimeout).wait();
            _this.wireDebuggerClient(function () { return device.connectToPort(InspectorBackendPort); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.deviceStart = function () {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ platform: _this.platform, deviceId: _this.$options.device }).wait();
            _this.$devicesService.execute(function (device) { return _this.deviceStartCore(device); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.deviceStartCore = function (device) {
        var _this = this;
        return (function () {
            var timeout = _this.getReadyForAttachTimeout();
            _this.$iOSSocketRequestExecutor.executeAttachRequest(device, timeout).wait();
            _this.wireDebuggerClient(function () { return device.connectToPort(InspectorBackendPort); }).wait();
        }).future()();
    };
    IOSDebugService.prototype.wireDebuggerClient = function (factory) {
        var _this = this;
        return (function () {
            var socketProxy = _this.$socketProxyFactory.createSocketProxy(factory).wait();
            _this.executeOpenDebuggerClient(socketProxy).wait();
        }).future()();
    };
    IOSDebugService.prototype.executeOpenDebuggerClient = function (fileDescriptor) {
        var _this = this;
        if (this.$options.client) {
            return this.openDebuggingClient(fileDescriptor);
        }
        else {
            return (function () {
                _this.$logger.info("Supressing debugging client.");
            }).future()();
        }
    };
    IOSDebugService.prototype.openDebuggingClient = function (fileDescriptor) {
        var _this = this;
        return (function () {
            var frameworkVersion = _this.getProjectFrameworkVersion().wait();
            var inspectorPath = _this.getInspectorPath(frameworkVersion).wait();
            var inspectorSourceLocation = path.join(inspectorPath, "Safari/Main.html");
            var cmd = null;
            if (semver.lt(frameworkVersion, "1.2.0")) {
                cmd = "open -a Safari \"" + inspectorSourceLocation + "\"";
            }
            else {
                var inspectorApplicationPath = path.join(inspectorPath, "NativeScript Inspector.app");
                if (!_this.$fs.exists(inspectorApplicationPath).wait()) {
                    _this.$fs.unzip(path.join(inspectorPath, "NativeScript Inspector.zip"), inspectorPath).wait();
                }
                cmd = "open -a '" + inspectorApplicationPath + "' --args '" + inspectorSourceLocation + "' '" + _this.$projectData.projectName + "' '" + fileDescriptor + "'";
            }
            _this.$childProcess.exec(cmd).wait();
        }).future()();
    };
    IOSDebugService.prototype.getProjectFrameworkVersion = function () {
        var _this = this;
        return (function () {
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var platformData = _this.$platformsData.getPlatformData(_this.platform);
            return _this.$projectDataService.getValue(platformData.frameworkPackageName).wait().version;
        }).future()();
    };
    IOSDebugService.prototype.getInspectorPath = function (frameworkVersion) {
        var _this = this;
        return (function () {
            var tnsIosPackage = "";
            if (_this.$options.frameworkPath) {
                if (_this.$fs.getFsStats(_this.$options.frameworkPath).wait().isFile()) {
                    _this.$errors.failWithoutHelp("frameworkPath option must be path to directory which contains tns-ios framework");
                }
                tnsIosPackage = path.resolve(_this.$options.frameworkPath);
            }
            else {
                var platformData = _this.$platformsData.getPlatformData(_this.platform);
                tnsIosPackage = _this.$npmInstallationManager.install(platformData.frameworkPackageName, { version: frameworkVersion }).wait();
            }
            var inspectorPath = path.join(tnsIosPackage, "WebInspectorUI/");
            return inspectorPath;
        }).future()();
    };
    IOSDebugService.prototype.getReadyForAttachTimeout = function (timeoutInMilliseconds) {
        var timeout = timeoutInMilliseconds || this.$utils.getMilliSecondsTimeout(IOSDebugService.TIMEOUT_SECONDS);
        var readyForAttachTimeout = timeout / 10;
        var defaultReadyForAttachTimeout = 5000;
        return readyForAttachTimeout > defaultReadyForAttachTimeout ? readyForAttachTimeout : defaultReadyForAttachTimeout;
    };
    IOSDebugService.TIMEOUT_SECONDS = 90;
    return IOSDebugService;
})();
$injector.register("iOSDebugService", IOSDebugService);
