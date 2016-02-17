///<reference path=".d.ts"/>
"use strict";
var fiber = require("fibers");
var Future = require("fibers/future");
function run(action) {
    if (fiber.current) {
        action();
    }
    else {
        fiber(function () {
            action();
            $injector.dispose();
            Future.assertNoFutureLeftBehind();
        }).run();
    }
}
exports.run = run;
