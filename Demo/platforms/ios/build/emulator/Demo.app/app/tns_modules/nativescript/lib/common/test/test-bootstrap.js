var Future = require("fibers/future");
global._ = require("lodash");
global.$injector = require("../yok").injector;
$injector.require("hostInfo", "../host-info");
$injector.register("config", {});
$injector.register("analyticsService", {
    checkConsent: function () { return Future.fromResult(); },
    trackFeature: function (featureName) { return Future.fromResult(); },
    trackException: function (exception, message) { return Future.fromResult(); },
    setStatus: function (settingName, enabled) { return Future.fromResult(); },
    getStatusMessage: function (settingName, jsonFormat, readableSettingName) { return Future.fromResult("Fake message"); },
    isEnabled: function (settingName) { return Future.fromResult(false); },
    track: function (featureName, featureValue) { return Future.fromResult(); }
});
var errors = require("../errors");
errors.installUncaughtExceptionListener();
process.on('exit', function (code) {
    require("fibers/future").assertNoFutureLeftBehind();
});
