///<reference path="../.d.ts"/>
"use strict";
var DevicePlatformsConstants = (function () {
    function DevicePlatformsConstants() {
        this.iOS = "iOS";
        this.Android = "Android";
        this.WP8 = "WP8";
    }
    return DevicePlatformsConstants;
})();
exports.DevicePlatformsConstants = DevicePlatformsConstants;
$injector.register("devicePlatformsConstants", DevicePlatformsConstants);
