///<reference path="../../.d.ts"/>
"use strict";
var Fiber = require("fibers");
var Future = require("fibers/future");
var iconv = require("iconv-lite");
var os_1 = require("os");
var osenv = require("osenv");
var path = require("path");
var helpers = require("../../helpers");
var net = require("net");
var VirtualMachine = (function () {
    function VirtualMachine(name, identifier) {
        this.name = name;
        this.identifier = identifier;
    }
    return VirtualMachine;
})();
var AndroidEmulatorServices = (function () {
    function AndroidEmulatorServices($logger, $emulatorSettingsService, $errors, $childProcess, $fs, $staticConfig, $devicePlatformsConstants, $logcatHelper, $options, $utils) {
        this.$logger = $logger;
        this.$emulatorSettingsService = $emulatorSettingsService;
        this.$errors = $errors;
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$logcatHelper = $logcatHelper;
        this.$options = $options;
        this.$utils = $utils;
        iconv.extendNodeEncodings();
        this.adbFilePath = this.$staticConfig.getAdbFilePath().wait();
    }
    Object.defineProperty(AndroidEmulatorServices.prototype, "pathToEmulatorExecutable", {
        get: function () {
            if (!this._pathToEmulatorExecutable) {
                var androidHome = process.env.ANDROID_HOME;
                var emulatorExecutableName = "emulator";
                this._pathToEmulatorExecutable = androidHome ? path.join(androidHome, "tools", emulatorExecutableName) : emulatorExecutableName;
            }
            return this._pathToEmulatorExecutable;
        },
        enumerable: true,
        configurable: true
    });
    AndroidEmulatorServices.prototype.getEmulatorId = function () {
        var _this = this;
        return (function () {
            var image = _this.getEmulatorImage().wait();
            if (!image) {
                _this.$errors.fail("Could not find an emulator image to run your project.");
            }
            var emulatorId = _this.startEmulatorInstance(image).wait();
            return emulatorId;
        }).future()();
    };
    AndroidEmulatorServices.prototype.checkDependencies = function () {
        var _this = this;
        return (function () {
            _this.checkAndroidSDKConfiguration().wait();
            if (_this.$options.geny) {
                _this.checkGenymotionConfiguration().wait();
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.checkAndroidSDKConfiguration = function () {
        var _this = this;
        return (function () {
            try {
                _this.$childProcess.tryExecuteApplication(_this.pathToEmulatorExecutable, ['-help'], "exit", AndroidEmulatorServices.MISSING_SDK_MESSAGE).wait();
            }
            catch (err) {
                _this.$logger.trace("Error while checking Android SDK configuration: " + err);
                _this.$errors.failWithoutHelp("Android SDK is not configured properly. Make sure you have added tools and platform-tools to your PATH environment variable.");
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.checkGenymotionConfiguration = function () {
        var _this = this;
        return (function () {
            try {
                var condition = function (childProcess) { return childProcess.stderr && !_.startsWith(childProcess.stderr, "Usage:"); };
                _this.$childProcess.tryExecuteApplication("player", [], "exit", AndroidEmulatorServices.MISSING_GENYMOTION_MESSAGE, condition).wait();
            }
            catch (err) {
                _this.$logger.trace("Error while checking Genymotion configuration: " + err);
                _this.$errors.failWithoutHelp("Genymotion is not configured properly. Make sure you have added its installation directory to your PATH environment variable.");
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.getEmulatorImage = function () {
        var _this = this;
        return (function () {
            var image = _this.$options.avd || _this.$options.geny || _this.getBestFit().wait();
            return image;
        }).future()();
    };
    AndroidEmulatorServices.prototype.checkAvailability = function () {
        var _this = this;
        return (function () {
            var platform = _this.$devicePlatformsConstants.Android;
            if (!_this.$emulatorSettingsService.canStart(platform).wait()) {
                _this.$errors.fail("The current project does not target Android and cannot be run in the Android emulator.");
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.startEmulator = function (app, emulatorOptions) {
        var _this = this;
        return (function () {
            if (_this.$options.avd && _this.$options.geny) {
                _this.$errors.fail("You cannot specify both --avd and --geny options. Please use only one of them.");
            }
            var image = _this.getEmulatorImage().wait();
            if (image) {
                _this.startEmulatorCore(app, emulatorOptions.appId, image).wait();
            }
            else {
                _this.$errors.fail("Could not find an emulator image to run your project.");
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.startEmulatorCore = function (app, appId, image) {
        var _this = this;
        return (function () {
            var emulatorId = _this.startEmulatorInstance(image).wait();
            _this.waitForEmulatorBootToComplete(emulatorId).wait();
            _this.unlockScreen(emulatorId).wait();
            _this.$logger.info("installing %s through adb", app);
            var childProcess = _this.$childProcess.spawn(_this.adbFilePath, ["-s", emulatorId, 'install', '-r', app]);
            _this.$fs.futureFromEvent(childProcess, "close").wait();
            _this.unlockScreen(emulatorId).wait();
            _this.$logger.info("running %s through adb", app);
            childProcess = _this.$childProcess.spawn(_this.adbFilePath, ["-s", emulatorId, 'shell', 'am', 'start', '-S', appId + "/" + _this.$staticConfig.START_PACKAGE_ACTIVITY_NAME], { stdio: "ignore", detached: true });
            _this.$fs.futureFromEvent(childProcess, "close").wait();
            if (!_this.$options.justlaunch) {
                _this.$logcatHelper.start(emulatorId);
            }
        }).future()();
    };
    AndroidEmulatorServices.prototype.unlockScreen = function (emulatorId) {
        var childProcess = this.$childProcess.spawn(this.adbFilePath, ["-s", emulatorId, "shell", "input", "keyevent", "82"]);
        return this.$fs.futureFromEvent(childProcess, "close");
    };
    AndroidEmulatorServices.prototype.sleep = function (ms) {
        var fiber = Fiber.current;
        setTimeout(function () { return fiber.run(); }, ms);
        Fiber.yield();
    };
    AndroidEmulatorServices.prototype.getRunningEmulatorId = function (image) {
        var _this = this;
        return (function () {
            var runningEmulators = _this.getRunningEmulators().wait();
            if (runningEmulators.length === 0) {
                return "";
            }
            var getNameFunction = _this.$options.geny ? _this.getNameFromGenymotionEmulatorId : _this.getNameFromSDKEmulatorId;
            var emulatorId = _(runningEmulators).find(function (emulator) { return getNameFunction.apply(_this, [emulator]).wait() === image; });
            return emulatorId;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getNameFromGenymotionEmulatorId = function (emulatorId) {
        var _this = this;
        return (function () {
            var modelOutputLines = _this.$childProcess.execFile(_this.adbFilePath, ["-s", emulatorId, "shell", "getprop", "ro.product.model"]).wait();
            _this.$logger.trace(modelOutputLines);
            var model = _.first(modelOutputLines.split(os_1.EOL)).trim();
            return model;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getNameFromSDKEmulatorId = function (emulatorId) {
        var match = emulatorId.match(/^emulator-(\d+)/);
        var portNumber;
        if (match && match[1]) {
            portNumber = match[1];
        }
        else {
            return Future.fromResult("");
        }
        var future = new Future();
        var output = "";
        var client = net.connect(portNumber, function () {
            client.write("avd name" + os_1.EOL);
        });
        client.on('data', function (data) {
            output += data.toString();
            client.end();
        });
        client.on('end', function () {
            var name;
            var foundOK = false;
            var lines = output.split(os_1.EOL);
            _(lines).each(function (line) {
                if (foundOK) {
                    name = line.trim();
                    return false;
                }
                else if (line.match(/^OK/)) {
                    foundOK = true;
                }
            }).value();
            future.return(name);
        });
        return future;
    };
    AndroidEmulatorServices.prototype.startEmulatorInstance = function (image) {
        var _this = this;
        return (function () {
            var emulatorId = _this.getRunningEmulatorId(image).wait();
            _this.endTimeEpoch = helpers.getCurrentEpochTime() + _this.$utils.getMilliSecondsTimeout(AndroidEmulatorServices.TIMEOUT_SECONDS);
            if (emulatorId) {
                return emulatorId;
            }
            _this.$logger.info("Starting Android emulator with image %s", image);
            if (_this.$options.geny) {
                _this.$childProcess.spawn("player", ["--vm-name", image], { stdio: "ignore", detached: true }).unref();
            }
            else {
                _this.$childProcess.spawn(_this.pathToEmulatorExecutable, ['-avd', image], { stdio: "ignore", detached: true }).unref();
            }
            var isInfiniteWait = _this.$utils.getMilliSecondsTimeout(AndroidEmulatorServices.TIMEOUT_SECONDS) === 0;
            var hasTimeLeft = helpers.getCurrentEpochTime() < _this.endTimeEpoch;
            while (hasTimeLeft || isInfiniteWait) {
                emulatorId = _this.getRunningEmulatorId(image).wait();
                if (emulatorId) {
                    return emulatorId;
                }
                _this.sleep(10000);
                hasTimeLeft = helpers.getCurrentEpochTime() < _this.endTimeEpoch;
            }
            if (!hasTimeLeft && !isInfiniteWait) {
                _this.$errors.fail(AndroidEmulatorServices.UNABLE_TO_START_EMULATOR_MESSAGE);
            }
            return emulatorId;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getRunningGenymotionEmulators = function (adbDevicesOutput) {
        var _this = this;
        return (function () {
            var futures = (_(adbDevicesOutput).filter(function (r) { return !r.match(AndroidEmulatorServices.RUNNING_ANDROID_EMULATOR_REGEX); })
                .map(function (row) {
                var match = row.match(/^(.+?)\s+device$/);
                if (match && match[1]) {
                    var emulatorId = match[1];
                    return Future.fromResult(_this.isGenymotionEmulator(emulatorId).wait() ? emulatorId : undefined);
                }
                return Future.fromResult(undefined);
            }).value());
            Future.wait(futures);
            return _(futures).filter(function (future) { return !!future.get(); })
                .map(function (f) { return f.get().toString(); })
                .value();
        }).future()();
    };
    AndroidEmulatorServices.prototype.isGenymotionEmulator = function (emulatorId) {
        var _this = this;
        return (function () {
            var manufacturer = _this.$childProcess.execFile(_this.adbFilePath, ["-s", emulatorId, "shell", "getprop", "ro.product.manufacturer"]).wait();
            if (manufacturer.match(/^Genymotion/i)) {
                return true;
            }
            var buildProduct = _this.$childProcess.execFile(_this.adbFilePath, ["-s", emulatorId, "shell", "getprop", "ro.build.product"]).wait();
            if (buildProduct && _.contains(buildProduct.toLowerCase(), "vbox")) {
                return true;
            }
            return false;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getRunningEmulators = function () {
        var _this = this;
        return (function () {
            var emulatorDevices = [];
            var outputRaw = _this.$childProcess.execFile(_this.adbFilePath, ['devices']).wait().split(os_1.EOL);
            if (_this.$options.geny) {
                emulatorDevices = _this.getRunningGenymotionEmulators(outputRaw).wait();
            }
            else {
                _.each(outputRaw, function (device) {
                    var rx = device.match(AndroidEmulatorServices.RUNNING_ANDROID_EMULATOR_REGEX);
                    if (rx && rx[1]) {
                        emulatorDevices.push(rx[1]);
                    }
                });
            }
            return emulatorDevices;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getBestFit = function () {
        var _this = this;
        return (function () {
            var minVersion = _this.$emulatorSettingsService.minVersion;
            var best = _(_this.getAvds().wait())
                .map(function (avd) { return _this.getInfoFromAvd(avd).wait(); })
                .max(function (avd) { return avd.targetNum; });
            return (best.targetNum >= minVersion) ? best.name : null;
        }).future()();
    };
    AndroidEmulatorServices.prototype.getInfoFromAvd = function (avdName) {
        var _this = this;
        return (function () {
            var iniFile = path.join(_this.avdDir, avdName + ".ini");
            var avdInfo = _this.parseAvdFile(avdName, iniFile).wait();
            if (avdInfo.path && _this.$fs.exists(avdInfo.path).wait()) {
                iniFile = path.join(avdInfo.path, "config.ini");
                avdInfo = _this.parseAvdFile(avdName, iniFile, avdInfo).wait();
            }
            return avdInfo;
        }).future()();
    };
    AndroidEmulatorServices.prototype.parseAvdFile = function (avdName, avdFileName, avdInfo) {
        var _this = this;
        if (avdInfo === void 0) { avdInfo = null; }
        return (function () {
            var encoding = _this.getAvdEncoding(avdFileName).wait();
            var contents = _this.$fs.readText(avdFileName, encoding).wait().split("\n");
            avdInfo = _.reduce(contents, function (result, line) {
                var parsedLine = line.split("=");
                var key = parsedLine[0];
                switch (key) {
                    case "target":
                        result.target = parsedLine[1];
                        result.targetNum = _this.readTargetNum(result.target);
                        break;
                    case "path":
                        result.path = parsedLine[1];
                        break;
                    case "hw.device.name":
                        result.device = parsedLine[1];
                        break;
                    case "abi.type":
                        result.abi = parsedLine[1];
                        break;
                    case "skin.name":
                        result.skin = parsedLine[1];
                        break;
                    case "sdcard.size":
                        result.sdcard = parsedLine[1];
                        break;
                }
                return result;
            }, avdInfo || Object.create(null));
            avdInfo.name = avdName;
            return avdInfo;
        }).future()();
    };
    AndroidEmulatorServices.prototype.readTargetNum = function (target) {
        var platform = target.replace('android-', '');
        var platformNumber = +platform;
        if (isNaN(platformNumber)) {
            var googlePlatform = target.split(":")[2];
            if (googlePlatform) {
                platformNumber = +googlePlatform;
            }
            else if (platform === "L") {
                platformNumber = 20;
            }
            else if (platform === "MNC") {
                platformNumber = 22;
            }
        }
        return platformNumber;
    };
    AndroidEmulatorServices.prototype.getAvdEncoding = function (avdName) {
        var _this = this;
        return (function () {
            var encoding = "utf8";
            var contents = _this.$fs.readText(avdName, "ascii").wait();
            if (contents.length > 0) {
                contents = contents.split("\n", 1)[0];
                if (contents.length > 0) {
                    var matches = contents.match(AndroidEmulatorServices.ENCODING_MASK);
                    if (matches) {
                        encoding = matches[1];
                    }
                }
            }
            return encoding;
        }).future()();
    };
    Object.defineProperty(AndroidEmulatorServices.prototype, "androidHomeDir", {
        get: function () {
            return path.join(osenv.home(), AndroidEmulatorServices.ANDROID_DIR_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidEmulatorServices.prototype, "avdDir", {
        get: function () {
            return path.join(this.androidHomeDir, AndroidEmulatorServices.AVD_DIR_NAME);
        },
        enumerable: true,
        configurable: true
    });
    AndroidEmulatorServices.prototype.getAvds = function () {
        var _this = this;
        return (function () {
            var result = [];
            if (_this.$fs.exists(_this.avdDir).wait()) {
                var entries = _this.$fs.readDirectory(_this.avdDir).wait();
                result = _.select(entries, function (e) { return e.match(AndroidEmulatorServices.INI_FILES_MASK) !== null; })
                    .map(function (e) { return e.match(AndroidEmulatorServices.INI_FILES_MASK)[1]; });
            }
            return result;
        }).future()();
    };
    AndroidEmulatorServices.prototype.waitForEmulatorBootToComplete = function (emulatorId) {
        var _this = this;
        return (function () {
            _this.$logger.printInfoMessageOnSameLine("Waiting for emulator device initialization...");
            var isInfiniteWait = _this.$utils.getMilliSecondsTimeout(AndroidEmulatorServices.TIMEOUT_SECONDS) === 0;
            while (helpers.getCurrentEpochTime() < _this.endTimeEpoch || isInfiniteWait) {
                var isEmulatorBootCompleted = _this.isEmulatorBootCompleted(emulatorId).wait();
                if (isEmulatorBootCompleted) {
                    _this.$logger.printInfoMessageOnSameLine(os_1.EOL);
                    return;
                }
                _this.$logger.printInfoMessageOnSameLine(".");
                _this.sleep(10000);
            }
            _this.$logger.printInfoMessageOnSameLine(os_1.EOL);
            _this.$errors.fail(AndroidEmulatorServices.UNABLE_TO_START_EMULATOR_MESSAGE);
        }).future()();
    };
    AndroidEmulatorServices.prototype.isEmulatorBootCompleted = function (emulatorId) {
        var _this = this;
        return (function () {
            var output = _this.$childProcess.execFile(_this.adbFilePath, ["-s", emulatorId, "shell", "getprop", "dev.bootcomplete"]).wait();
            var matches = output.match("1");
            return matches && matches.length > 0;
        }).future()();
    };
    AndroidEmulatorServices.ANDROID_DIR_NAME = ".android";
    AndroidEmulatorServices.AVD_DIR_NAME = "avd";
    AndroidEmulatorServices.INI_FILES_MASK = /^(.*)\.ini$/i;
    AndroidEmulatorServices.ENCODING_MASK = /^avd\.ini\.encoding=(.*)$/;
    AndroidEmulatorServices.TIMEOUT_SECONDS = 120;
    AndroidEmulatorServices.UNABLE_TO_START_EMULATOR_MESSAGE = "Cannot run your app in the native emulator. Increase the timeout of the operation with the --timeout option or try to restart your adb server with 'adb kill-server' command. Alternatively, run the Android Virtual Device manager and increase the allocated RAM for the virtual device.";
    AndroidEmulatorServices.RUNNING_ANDROID_EMULATOR_REGEX = /^(emulator-\d+)\s+device$/;
    AndroidEmulatorServices.MISSING_SDK_MESSAGE = "The Android SDK is not configured properly. " +
        "Verify that you have installed the Android SDK and that you have configured it as described in System Requirements.";
    AndroidEmulatorServices.MISSING_GENYMOTION_MESSAGE = "Genymotion is not configured properly. " +
        "Verify that you have installed Genymotion and that you have added its installation directory to your PATH environment variable.";
    return AndroidEmulatorServices;
})();
$injector.register("androidEmulatorServices", AndroidEmulatorServices);
