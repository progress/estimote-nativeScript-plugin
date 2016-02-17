///<reference path="../.d.ts"/>
"use strict";
require("../bootstrap");
var options_1 = require("../options");
$injector.require("staticConfig", "./appbuilder/proton-static-config");
$injector.register("mobilePlatformsCapabilities", {});
$injector.register("config", {});
$injector.register("analyiticsService", {});
$injector.register("options", $injector.resolve(options_1.OptionsBase, { options: {}, defaultProfileDir: "" }));
$injector.requirePublicClass("deviceEmitter", "./mobile/mobile-core/device-emitter");
$injector.requirePublicClass("deviceLogProvider", "./appbuilder/device-log-provider");
var errors_1 = require("../errors");
errors_1.installUncaughtExceptionListener();
