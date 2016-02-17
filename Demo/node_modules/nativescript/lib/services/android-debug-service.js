///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../common/helpers");
var path = require("path");
var util = require("util");
var AndroidDebugService = (function () {
    function AndroidDebugService($devicesService, $platformService, $platformsData, $projectData, $logger, $options, $childProcess, $mobileHelper, $hostInfo, $errors, $opener, $staticConfig, $utils, $config) {
        this.$devicesService = $devicesService;
        this.$platformService = $platformService;
        this.$platformsData = $platformsData;
        this.$projectData = $projectData;
        this.$logger = $logger;
        this.$options = $options;
        this.$childProcess = $childProcess;
        this.$mobileHelper = $mobileHelper;
        this.$hostInfo = $hostInfo;
        this.$errors = $errors;
        this.$opener = $opener;
        this.$staticConfig = $staticConfig;
        this.$utils = $utils;
        this.$config = $config;
        this._device = null;
    }
    Object.defineProperty(AndroidDebugService.prototype, "platform", {
        get: function () { return "android"; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidDebugService.prototype, "device", {
        get: function () {
            return this._device;
        },
        set: function (newDevice) {
            this._device = newDevice;
        },
        enumerable: true,
        configurable: true
    });
    AndroidDebugService.prototype.debug = function () {
        return this.$options.emulator
            ? this.debugOnEmulator()
            : this.debugOnDevice();
    };
    AndroidDebugService.prototype.debugOnEmulator = function () {
        var _this = this;
        return (function () {
            _this.$platformService.deployOnEmulator(_this.platform).wait();
            _this.debugOnDevice().wait();
        }).future()();
    };
    AndroidDebugService.prototype.debugOnDevice = function () {
        var _this = this;
        return (function () {
            var packageFile = "";
            if (!_this.$options.debugBrk && !_this.$options.start && !_this.$options.getPort && !_this.$options.stop) {
                _this.$logger.warn("Neither --debug-brk nor --start option was specified. Defaulting to --debug-brk.");
                _this.$options.debugBrk = true;
            }
            if (_this.$options.debugBrk && !_this.$options.emulator) {
                var cachedDeviceOption = _this.$options.forDevice;
                _this.$options.forDevice = true;
                _this.$platformService.buildPlatform(_this.platform).wait();
                _this.$options.forDevice = !!cachedDeviceOption;
                var platformData = _this.$platformsData.getPlatformData(_this.platform);
                packageFile = _this.$platformService.getLatestApplicationPackageForDevice(platformData).wait().packageName;
                _this.$logger.out("Using ", packageFile);
            }
            _this.$devicesService.initialize({ platform: _this.platform, deviceId: _this.$options.device }).wait();
            var action = function (device) { return _this.debugCore(device, packageFile, _this.$projectData.projectId); };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    AndroidDebugService.prototype.debugCore = function (device, packageFile, packageName) {
        var _this = this;
        return (function () {
            _this.device = device;
            if (_this.$options.getPort) {
                _this.printDebugPort(packageName).wait();
            }
            else if (_this.$options.start) {
                _this.attachDebugger(packageName);
            }
            else if (_this.$options.stop) {
                _this.detachDebugger(packageName).wait();
            }
            else if (_this.$options.debugBrk) {
                _this.startAppWithDebugger(packageFile, packageName).wait();
            }
        }).future()();
    };
    AndroidDebugService.prototype.printDebugPort = function (packageName) {
        var _this = this;
        return (function () {
            var res = _this.device.adb.executeShellCommand(["am", "broadcast", "-a", packageName + "-GetDbgPort"]).wait();
            _this.$logger.info(res);
        }).future()();
    };
    AndroidDebugService.prototype.attachDebugger = function (packageName) {
        var startDebuggerCommand = ["am", "broadcast", "-a", '\"${packageName}-Debug\"', "--ez", "enable", "true"];
        var port = this.$options.debugPort;
        if (port > 0) {
            startDebuggerCommand.push("--ei", "debuggerPort", port.toString());
            this.device.adb.executeShellCommand(startDebuggerCommand).wait();
        }
        else {
            var res = this.device.adb.executeShellCommand(["am", "broadcast", "-a", packageName + "-Debug", "--ez", "enable", "true"]).wait();
            var match = res.match(/result=(\d)+/);
            if (match) {
                port = match[0].substring(7);
            }
            else {
                port = 0;
            }
        }
        if ((0 < port) && (port < 65536)) {
            this.tcpForward(port, port).wait();
            this.startDebuggerClient(port).wait();
            this.openDebuggerClient(AndroidDebugService.DEFAULT_NODE_INSPECTOR_URL + "?port=" + port);
        }
        else {
            this.$logger.info("Cannot detect debug port.");
        }
    };
    AndroidDebugService.prototype.detachDebugger = function (packageName) {
        return this.device.adb.executeShellCommand(["am", "broadcast", "-a", (packageName + "-Debug"), "--ez", "enable", "false"]);
    };
    AndroidDebugService.prototype.startAppWithDebugger = function (packageFile, packageName) {
        var _this = this;
        return (function () {
            if (!_this.$options.emulator) {
                _this.device.applicationManager.uninstallApplication(packageName).wait();
                _this.device.applicationManager.installApplication(packageFile).wait();
            }
            _this.debugStartCore().wait();
        }).future()();
    };
    AndroidDebugService.prototype.debugStart = function () {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ platform: _this.platform, deviceId: _this.$options.device }).wait();
            var action = function (device) {
                _this.device = device;
                return _this.debugStartCore();
            };
            _this.$devicesService.execute(action).wait();
        }).future()();
    };
    AndroidDebugService.prototype.debugStartCore = function () {
        var _this = this;
        return (function () {
            var packageName = _this.$projectData.projectId;
            var packageDir = util.format(AndroidDebugService.PACKAGE_EXTERNAL_DIR_TEMPLATE, packageName);
            var envDebugOutFullpath = _this.$mobileHelper.buildDevicePath(packageDir, AndroidDebugService.ENV_DEBUG_OUT_FILENAME);
            _this.device.adb.executeShellCommand(["rm", ("" + envDebugOutFullpath)]).wait();
            _this.device.adb.executeShellCommand(["mkdir", "-p", ("" + packageDir)]).wait();
            var debugBreakPath = _this.$mobileHelper.buildDevicePath(packageDir, "debugbreak");
            _this.device.adb.executeShellCommand([("cat /dev/null > " + debugBreakPath)]).wait();
            _this.device.applicationManager.stopApplication(packageName).wait();
            _this.device.applicationManager.startApplication(packageName).wait();
            var dbgPort = _this.startAndGetPort(packageName).wait();
            if (dbgPort > 0) {
                _this.tcpForward(dbgPort, dbgPort).wait();
                _this.startDebuggerClient(dbgPort).wait();
                _this.openDebuggerClient(AndroidDebugService.DEFAULT_NODE_INSPECTOR_URL + "?port=" + dbgPort);
            }
        }).future()();
    };
    AndroidDebugService.prototype.tcpForward = function (src, dest) {
        return this.device.adb.executeCommand(["forward", ("tcp:" + src.toString()), ("tcp:" + dest.toString())]);
    };
    AndroidDebugService.prototype.startDebuggerClient = function (port) {
        var _this = this;
        return (function () {
            var nodeInspectorModuleFilePath = require.resolve("node-inspector");
            var nodeInspectorModuleDir = path.dirname(nodeInspectorModuleFilePath);
            var nodeInspectorFullPath = path.join(nodeInspectorModuleDir, "bin", "inspector");
            _this.$childProcess.spawn(process.argv[0], [nodeInspectorFullPath, "--debug-port", port.toString()], { stdio: "ignore", detached: true });
        }).future()();
    };
    AndroidDebugService.prototype.openDebuggerClient = function (url) {
        var defaultDebugUI = "chrome";
        if (this.$hostInfo.isDarwin) {
            defaultDebugUI = "Google Chrome";
        }
        if (this.$hostInfo.isLinux) {
            defaultDebugUI = "google-chrome";
        }
        var debugUI = this.$config.ANDROID_DEBUG_UI || defaultDebugUI;
        var child = this.$opener.open(url, debugUI);
        if (!child) {
            this.$errors.failWithoutHelp("Unable to open " + debugUI + ".");
        }
    };
    AndroidDebugService.prototype.checkIfRunning = function (packageName) {
        var packageDir = util.format(AndroidDebugService.PACKAGE_EXTERNAL_DIR_TEMPLATE, packageName);
        var envDebugOutFullpath = packageDir + AndroidDebugService.ENV_DEBUG_OUT_FILENAME;
        var isRunning = this.checkIfFileExists(envDebugOutFullpath).wait();
        return isRunning;
    };
    AndroidDebugService.prototype.checkIfFileExists = function (filename) {
        var _this = this;
        return (function () {
            var res = _this.device.adb.executeShellCommand([("test -f " + filename + " && echo 'yes' || echo 'no'")]).wait();
            var exists = res.indexOf('yes') > -1;
            return exists;
        }).future()();
    };
    AndroidDebugService.prototype.startAndGetPort = function (packageName) {
        var _this = this;
        return (function () {
            var port = -1;
            var timeout = _this.$utils.getParsedTimeout(90);
            var packageDir = util.format(AndroidDebugService.PACKAGE_EXTERNAL_DIR_TEMPLATE, packageName);
            var envDebugInFullpath = packageDir + AndroidDebugService.ENV_DEBUG_IN_FILENAME;
            _this.device.adb.executeShellCommand(["rm", ("" + envDebugInFullpath)]).wait();
            var isRunning = false;
            for (var i = 0; i < timeout; i++) {
                helpers.sleep(1000);
                isRunning = _this.checkIfRunning(packageName);
                if (isRunning) {
                    break;
                }
            }
            if (isRunning) {
                _this.device.adb.executeShellCommand([("cat /dev/null > " + envDebugInFullpath)]).wait();
                for (var i = 0; i < timeout; i++) {
                    helpers.sleep(1000);
                    var envDebugOutFullpath = packageDir + AndroidDebugService.ENV_DEBUG_OUT_FILENAME;
                    var exists = _this.checkIfFileExists(envDebugOutFullpath).wait();
                    if (exists) {
                        var res = _this.device.adb.executeShellCommand(["cat", envDebugOutFullpath]).wait();
                        var match = res.match(/PORT=(\d)+/);
                        if (match) {
                            port = parseInt(match[0].substring(5), 10);
                            break;
                        }
                    }
                }
            }
            return port;
        }).future()();
    };
    AndroidDebugService.ENV_DEBUG_IN_FILENAME = "envDebug.in";
    AndroidDebugService.ENV_DEBUG_OUT_FILENAME = "envDebug.out";
    AndroidDebugService.DEFAULT_NODE_INSPECTOR_URL = "http://127.0.0.1:8080/debug";
    AndroidDebugService.PACKAGE_EXTERNAL_DIR_TEMPLATE = "/sdcard/Android/data/%s/files/";
    return AndroidDebugService;
})();
$injector.register("androidDebugService", AndroidDebugService);
