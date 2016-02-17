///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DebugPlatformCommand = (function () {
    function DebugPlatformCommand(debugService) {
        this.debugService = debugService;
        this.allowedParameters = [];
    }
    DebugPlatformCommand.prototype.execute = function (args) {
        return this.debugService.debug();
    };
    return DebugPlatformCommand;
})();
exports.DebugPlatformCommand = DebugPlatformCommand;
var DebugIOSCommand = (function (_super) {
    __extends(DebugIOSCommand, _super);
    function DebugIOSCommand($iOSDebugService) {
        _super.call(this, $iOSDebugService);
        this.$iOSDebugService = $iOSDebugService;
    }
    return DebugIOSCommand;
})(DebugPlatformCommand);
exports.DebugIOSCommand = DebugIOSCommand;
$injector.registerCommand("debug|ios", DebugIOSCommand);
var DebugAndroidCommand = (function (_super) {
    __extends(DebugAndroidCommand, _super);
    function DebugAndroidCommand($androidDebugService) {
        _super.call(this, $androidDebugService);
        this.$androidDebugService = $androidDebugService;
    }
    return DebugAndroidCommand;
})(DebugPlatformCommand);
exports.DebugAndroidCommand = DebugAndroidCommand;
$injector.registerCommand("debug|android", DebugAndroidCommand);
