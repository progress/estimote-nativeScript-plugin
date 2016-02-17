///<reference path=".d.ts"/>
"use strict";
var PlatformsData = (function () {
    function PlatformsData($androidProjectService, $iOSProjectService) {
        this.platformsData = {};
        this.platformsData = {
            ios: $iOSProjectService.platformData,
            android: $androidProjectService.platformData
        };
    }
    Object.defineProperty(PlatformsData.prototype, "platformsNames", {
        get: function () {
            return Object.keys(this.platformsData);
        },
        enumerable: true,
        configurable: true
    });
    PlatformsData.prototype.getPlatformData = function (platform) {
        return this.platformsData[platform];
    };
    Object.defineProperty(PlatformsData.prototype, "availablePlatforms", {
        get: function () {
            return {
                iOS: "ios",
                Android: "android"
            };
        },
        enumerable: true,
        configurable: true
    });
    return PlatformsData;
})();
exports.PlatformsData = PlatformsData;
$injector.register("platformsData", PlatformsData);
