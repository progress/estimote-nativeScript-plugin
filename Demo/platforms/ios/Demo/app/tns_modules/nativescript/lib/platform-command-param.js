///<reference path=".d.ts"/>
"use strict";
var PlatformCommandParameter = (function () {
    function PlatformCommandParameter($platformService) {
        this.$platformService = $platformService;
        this.mandatory = true;
    }
    PlatformCommandParameter.prototype.validate = function (value) {
        var _this = this;
        return (function () {
            _this.$platformService.validatePlatform(value);
            return true;
        }).future()();
    };
    return PlatformCommandParameter;
})();
exports.PlatformCommandParameter = PlatformCommandParameter;
$injector.register("platformCommandParameter", PlatformCommandParameter);
