///<reference path="../.d.ts"/>
"use strict";
var DeviceLogProvider = (function () {
    function DeviceLogProvider($devicePlatformsConstants, $logger) {
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$logger = $logger;
    }
    DeviceLogProvider.prototype.logData = function (lineText, platform, deviceIdentifier) {
        if (!platform || platform.toLowerCase() === this.$devicePlatformsConstants.iOS.toLowerCase()) {
            this.$logger.out(lineText);
        }
        else if (platform === this.$devicePlatformsConstants.Android) {
            var log = this.getConsoleLogFromLine(lineText);
            if (log) {
                if (log.tag) {
                    this.$logger.out(log.tag + ": " + log.message);
                }
                else {
                    this.$logger.out(log.message);
                }
            }
        }
    };
    DeviceLogProvider.prototype.getConsoleLogFromLine = function (lineText) {
        var acceptedTags = ["chromium", "Web Console", "JS"];
        var match = lineText.match(DeviceLogProvider.LINE_REGEX) || lineText.match(DeviceLogProvider.API_LEVEL_23_LINE_REGEX);
        if (match && acceptedTags.indexOf(match[1].trim()) !== -1) {
            return { tag: match[1].trim(), message: match[2] };
        }
        var matchingTag = _.any(acceptedTags, function (tag) { return lineText.indexOf(tag) !== -1; });
        return matchingTag ? { message: lineText } : null;
    };
    DeviceLogProvider.LINE_REGEX = /.\/(.+?)\s*\(\s*\d+?\): (.*)/;
    DeviceLogProvider.API_LEVEL_23_LINE_REGEX = /.+?\s+?(?:[A-Z]\s+?)([A-Za-z ]+?)\s+?\: (.*)/;
    return DeviceLogProvider;
})();
exports.DeviceLogProvider = DeviceLogProvider;
$injector.register("deviceLogProvider", DeviceLogProvider);
