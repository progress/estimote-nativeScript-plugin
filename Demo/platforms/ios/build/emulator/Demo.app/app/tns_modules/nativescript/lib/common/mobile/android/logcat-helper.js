///<reference path="../../.d.ts"/>
"use strict";
var byline = require("byline");
var LogcatHelper = (function () {
    function LogcatHelper($childProcess, $deviceLogProvider, $devicePlatformsConstants, $logger, $staticConfig) {
        this.$childProcess = $childProcess;
        this.$deviceLogProvider = $deviceLogProvider;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$logger = $logger;
        this.$staticConfig = $staticConfig;
        this.mapDeviceToLoggingStarted = Object.create(null);
    }
    LogcatHelper.prototype.start = function (deviceIdentifier) {
        var _this = this;
        if (deviceIdentifier && !this.mapDeviceToLoggingStarted[deviceIdentifier]) {
            var adbPath = this.$staticConfig.getAdbFilePath().wait();
            this.$childProcess.spawnFromEvent(adbPath, ["-s", deviceIdentifier, "logcat", "-c"], "close", {}, { throwError: false }).wait();
            var adbLogcat = this.$childProcess.spawn(adbPath, ["-s", deviceIdentifier, "logcat"]);
            var lineStream = byline(adbLogcat.stdout);
            adbLogcat.stderr.on("data", function (data) {
                _this.$logger.trace("ADB logcat stderr: " + data.toString());
            });
            adbLogcat.on("close", function (code) {
                _this.mapDeviceToLoggingStarted[deviceIdentifier] = false;
                if (code !== 0) {
                    _this.$logger.trace("ADB process exited with code " + code.toString());
                }
            });
            lineStream.on('data', function (line) {
                var lineText = line.toString();
                _this.$deviceLogProvider.logData(lineText, _this.$devicePlatformsConstants.Android, deviceIdentifier);
            });
            this.mapDeviceToLoggingStarted[deviceIdentifier] = true;
        }
    };
    return LogcatHelper;
})();
exports.LogcatHelper = LogcatHelper;
$injector.register("logcatHelper", LogcatHelper);
