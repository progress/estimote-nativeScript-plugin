///<reference path="../../.d.ts"/>
"use strict";
var DeviceAppDataFactory = (function () {
    function DeviceAppDataFactory($deviceAppDataProvider, $options) {
        this.$deviceAppDataProvider = $deviceAppDataProvider;
        this.$options = $options;
    }
    DeviceAppDataFactory.prototype.create = function (appIdentifier, platform) {
        var factoryRules = this.$deviceAppDataProvider.createFactoryRules();
        var ctor = factoryRules[platform][this.$options.companion ? "companion" : "vanilla"];
        return new ctor(appIdentifier);
    };
    return DeviceAppDataFactory;
})();
exports.DeviceAppDataFactory = DeviceAppDataFactory;
$injector.register("deviceAppDataFactory", DeviceAppDataFactory);
