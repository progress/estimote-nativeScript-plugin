// This function must be separate to avoid dependencies on C++ modules - it must execute precisely when other functions cannot
"use strict";
var os_1 = require("os");
var versionsCausingFailure = ["0.10.34", "4.0.0", "4.2.0", "5.0.0"];
function verifyNodeVersion(supportedVersionsRange) {
    require("colors");
    var nodeVer = process.version.substr(1);
    if (versionsCausingFailure.indexOf(nodeVer) !== -1) {
        console.error((os_1.EOL + "Node.js '" + nodeVer + "' is not supported. To be able to work with this CLI, install any Node.js version in the following range: " + supportedVersionsRange + "." + os_1.EOL).red.bold);
        process.exit(1);
    }
    var checkSatisfied = require("semver").satisfies(nodeVer, supportedVersionsRange);
    if (!checkSatisfied) {
        console.log((os_1.EOL + "Support for node.js " + nodeVer + " is not verified. This CLI might not install or run properly." + os_1.EOL).yellow.bold);
    }
}
exports.verifyNodeVersion = verifyNodeVersion;
