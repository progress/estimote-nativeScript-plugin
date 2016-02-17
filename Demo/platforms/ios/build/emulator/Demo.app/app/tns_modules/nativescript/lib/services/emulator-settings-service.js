///<reference path="../.d.ts"/>
"use strict";
var EmulatorSettingsService = (function () {
    function EmulatorSettingsService($injector) {
        this.$injector = $injector;
    }
    EmulatorSettingsService.prototype.canStart = function (platform) {
        var _this = this;
        return (function () {
            var platformService = _this.$injector.resolve("platformService");
            var installedPlatforms = platformService.getInstalledPlatforms().wait();
            return _.contains(installedPlatforms, platform.toLowerCase());
        }).future()();
    };
    Object.defineProperty(EmulatorSettingsService.prototype, "minVersion", {
        get: function () {
            return EmulatorSettingsService.REQURED_ANDROID_APILEVEL;
        },
        enumerable: true,
        configurable: true
    });
    EmulatorSettingsService.REQURED_ANDROID_APILEVEL = 17;
    return EmulatorSettingsService;
})();
exports.EmulatorSettingsService = EmulatorSettingsService;
$injector.register("emulatorSettingsService", EmulatorSettingsService);
