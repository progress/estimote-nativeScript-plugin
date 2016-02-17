///<reference path="../../.d.ts"/>
"use strict";
require(process.argv[2]);
var fiberBootstrap = require("../../fiber-bootstrap");
var ios_core_1 = require("./ios-core");
fiberBootstrap.run(function () {
    var winSocket = $injector.resolve(ios_core_1.WinSocket, { service: process.argv[3], format: process.argv[4] });
    winSocket.readSystemLogBlocking();
});
