///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../helpers");
var MobileHelper = (function () {
    function MobileHelper($mobilePlatformsCapabilities, $errors, $devicePlatformsConstants) {
        this.$mobilePlatformsCapabilities = $mobilePlatformsCapabilities;
        this.$errors = $errors;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
    }
    Object.defineProperty(MobileHelper.prototype, "platformNames", {
        get: function () {
            var _this = this;
            this.platformNamesCache = this.platformNamesCache ||
                _.map(this.$mobilePlatformsCapabilities.getPlatformNames(), function (platform) { return _this.normalizePlatformName(platform); });
            return this.platformNamesCache;
        },
        enumerable: true,
        configurable: true
    });
    MobileHelper.prototype.getPlatformCapabilities = function (platform) {
        var platformNames = this.$mobilePlatformsCapabilities.getPlatformNames();
        var validPlatformName = this.validatePlatformName(platform);
        if (!_.any(platformNames, function (platformName) { return platformName === validPlatformName; })) {
            this.$errors.failWithoutHelp("'%s' is not a valid device platform. Valid platforms are %s.", platform, platformNames);
        }
        return this.$mobilePlatformsCapabilities.getAllCapabilities()[validPlatformName];
    };
    MobileHelper.prototype.isAndroidPlatform = function (platform) {
        return this.$devicePlatformsConstants.Android.toLowerCase() === platform.toLowerCase();
    };
    MobileHelper.prototype.isiOSPlatform = function (platform) {
        return this.$devicePlatformsConstants.iOS.toLowerCase() === platform.toLowerCase();
    };
    MobileHelper.prototype.isWP8Platform = function (platform) {
        return this.$devicePlatformsConstants.WP8.toLowerCase() === platform.toLowerCase();
    };
    MobileHelper.prototype.normalizePlatformName = function (platform) {
        if (this.isAndroidPlatform(platform)) {
            return "Android";
        }
        else if (this.isiOSPlatform(platform)) {
            return "iOS";
        }
        else if (this.isWP8Platform(platform)) {
            return "WP8";
        }
        return undefined;
    };
    MobileHelper.prototype.isPlatformSupported = function (platform) {
        return _.contains(this.getPlatformCapabilities(platform).hostPlatformsForDeploy, process.platform);
    };
    MobileHelper.prototype.validatePlatformName = function (platform) {
        if (!platform) {
            this.$errors.fail("No device platform specified.");
        }
        var normalizedPlatform = this.normalizePlatformName(platform);
        if (!normalizedPlatform || !_.contains(this.platformNames, normalizedPlatform)) {
            this.$errors.fail("'%s' is not a valid device platform. Valid platforms are %s.", platform, helpers.formatListOfNames(this.platformNames));
        }
        return normalizedPlatform;
    };
    MobileHelper.prototype.buildDevicePath = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return this.correctDevicePath(args.join(MobileHelper.DEVICE_PATH_SEPARATOR));
    };
    MobileHelper.prototype.correctDevicePath = function (filePath) {
        return helpers.stringReplaceAll(filePath, '\\', '/');
    };
    MobileHelper.DEVICE_PATH_SEPARATOR = "/";
    return MobileHelper;
})();
exports.MobileHelper = MobileHelper;
$injector.register("mobileHelper", MobileHelper);
