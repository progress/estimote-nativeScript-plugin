///<reference path="./.d.ts"/>
"use strict";
global._ = require("lodash");
var Fiber = require("fibers");
var Future = require("fibers/future");
var commandExecutorLibPath = require("./command-executor");
var fiber = Fiber(function () {
    var commandExecutor = new commandExecutorLibPath.CommandExecutor();
    commandExecutor.execute().wait();
    Future.assertNoFutureLeftBehind();
});
fiber.run();
global.publicApi = {};
Object.defineProperty(global.publicApi, "getRunningSimulator", {
    get: function () {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var future = new Future();
            var libraryPath = require("./iphone-simulator-xcode-7");
            var simulator = new libraryPath.XCode7Simulator();
            var repeatCount = 30;
            var timer = setInterval(function () {
                Fiber(function () {
                    var result = simulator.getBootedDevice.apply(simulator, args).wait();
                    if ((result || !repeatCount) && !future.isResolved()) {
                        clearInterval(timer);
                        future.return(result);
                    }
                    repeatCount--;
                }).run();
            }, 500);
            return future.wait();
        };
    }
});
Object.defineProperty(global.publicApi, "getApplicationPath", {
    get: function () {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var libraryPath = require("./iphone-simulator");
            var obj = new libraryPath.iPhoneSimulator();
            var simulator = obj.createSimulator().wait();
            var result = simulator.getApplicationPath.apply(simulator, args).wait();
            return result;
        };
    }
});
module.exports = global.publicApi;
//# sourceMappingURL=ios-sim.js.map