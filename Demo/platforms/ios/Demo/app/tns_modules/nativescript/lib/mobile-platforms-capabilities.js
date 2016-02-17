///<reference path=".d.ts"/>
"use strict";
var MobilePlatformsCapabilities = (function () {
    function MobilePlatformsCapabilities($errors) {
        this.$errors = $errors;
    }
    MobilePlatformsCapabilities.prototype.getPlatformNames = function () {
        return _.keys(this.getAllCapabilities());
    };
    MobilePlatformsCapabilities.prototype.getAllCapabilities = function () {
        this.platformCapabilities = this.platformCapabilities || {
            iOS: {
                wirelessDeploy: false,
                cableDeploy: true,
                companion: false,
                hostPlatformsForDeploy: ["darwin"]
            },
            Android: {
                wirelessDeploy: false,
                cableDeploy: true,
                companion: false,
                hostPlatformsForDeploy: ["win32", "darwin", "linux"]
            }
        };
        return this.platformCapabilities;
    };
    return MobilePlatformsCapabilities;
})();
exports.MobilePlatformsCapabilities = MobilePlatformsCapabilities;
$injector.register("mobilePlatformsCapabilities", MobilePlatformsCapabilities);
