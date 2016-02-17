///<reference path=".d.ts"/>
"use strict";
require("./common/verify-node-version").verifyNodeVersion(require("../package.json").engines.node);
require("./bootstrap");
var fiber = require("fibers");
var Future = require("fibers/future");
var shelljs = require("shelljs");
shelljs.config.silent = true;
var errors_1 = require("./common/errors");
errors_1.installUncaughtExceptionListener(process.exit);
fiber(function () {
    var config = $injector.resolve("$config");
    var err = $injector.resolve("$errors");
    err.printCallStack = config.DEBUG;
    var commandDispatcher = $injector.resolve("commandDispatcher");
    if (process.argv[2] === "completion") {
        commandDispatcher.completeCommand().wait();
    }
    else {
        commandDispatcher.dispatchCommand().wait();
    }
    $injector.dispose();
    Future.assertNoFutureLeftBehind();
}).run();
