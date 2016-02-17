///<reference path="../../.d.ts"/>
"use strict";
var path = require("path");
var future = require("fibers/future");
var Wp8EmulatorServices = (function () {
    function Wp8EmulatorServices($logger, $emulatorSettingsService, $errors, $childProcess, $devicePlatformsConstants, $hostInfo) {
        this.$logger = $logger;
        this.$emulatorSettingsService = $emulatorSettingsService;
        this.$errors = $errors;
        this.$childProcess = $childProcess;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$hostInfo = $hostInfo;
    }
    Wp8EmulatorServices.prototype.getEmulatorId = function () {
        return future.fromResult("");
    };
    Wp8EmulatorServices.prototype.checkDependencies = function () {
        return future.fromResult();
    };
    Wp8EmulatorServices.prototype.checkAvailability = function () {
        var _this = this;
        return (function () {
            if (!_this.$hostInfo.isWindows) {
                _this.$errors.fail("Windows Phone Emulator is available only on Windows 8 or later.");
            }
            var platform = _this.$devicePlatformsConstants.WP8;
            if (!_this.$emulatorSettingsService.canStart(platform).wait()) {
                _this.$errors.fail("The current project does not target Windows Phone 8 and cannot be run in the Windows Phone emulator.");
            }
        }).future()();
    };
    Wp8EmulatorServices.prototype.startEmulator = function (app, emulatorOptions) {
        var _this = this;
        return (function () {
            _this.$logger.info("Starting Windows Phone Emulator");
            var emulatorStarter = path.join(Wp8EmulatorServices.programFilesPath, Wp8EmulatorServices.WP8_LAUNCHER_PATH, Wp8EmulatorServices.WP8_LAUNCHER);
            _this.$childProcess.spawn(emulatorStarter, ["/installlaunch", app, "/targetdevice:xd"], { stdio: "ignore", detached: true }).unref();
        }).future()();
    };
    Object.defineProperty(Wp8EmulatorServices, "programFilesPath", {
        get: function () {
            return (process.arch === "x64") ? process.env["PROGRAMFILES(X86)"] : process.env.ProgramFiles;
        },
        enumerable: true,
        configurable: true
    });
    Wp8EmulatorServices.WP8_LAUNCHER = "XapDeployCmd.exe";
    Wp8EmulatorServices.WP8_LAUNCHER_PATH = "Microsoft SDKs\\Windows Phone\\v8.0\\Tools\\XAP Deployment";
    return Wp8EmulatorServices;
})();
$injector.register("wp8EmulatorServices", Wp8EmulatorServices);
