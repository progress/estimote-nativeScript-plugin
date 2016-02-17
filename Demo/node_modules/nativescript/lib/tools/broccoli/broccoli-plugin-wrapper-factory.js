///<reference path="../../.d.ts"/>
"use strict";
var broccoliPluginWrapperLib = require("./broccoli-plugin-wrapper");
function wrapBroccoliPlugin(pluginClass) {
    return function () { return new broccoliPluginWrapperLib.BroccoliPluginWrapper(pluginClass, arguments); };
}
exports.wrapBroccoliPlugin = wrapBroccoliPlugin;
