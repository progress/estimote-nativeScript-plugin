///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var EmulateCommandBase = (function () {
    function EmulateCommandBase($platformService) {
        this.$platformService = $platformService;
    }
    EmulateCommandBase.prototype.executeCore = function (args) {
        return this.$platformService.deployOnEmulator(args[0]);
    };
    return EmulateCommandBase;
})();
exports.EmulateCommandBase = EmulateCommandBase;
var EmulateIosCommand = (function (_super) {
    __extends(EmulateIosCommand, _super);
    function EmulateIosCommand($platformService, $platformsData) {
        _super.call(this, $platformService);
        this.$platformsData = $platformsData;
        this.allowedParameters = [];
    }
    EmulateIosCommand.prototype.execute = function (args) {
        return this.executeCore([this.$platformsData.availablePlatforms.iOS]);
    };
    return EmulateIosCommand;
})(EmulateCommandBase);
exports.EmulateIosCommand = EmulateIosCommand;
$injector.registerCommand("emulate|ios", EmulateIosCommand);
var EmulateAndroidCommand = (function (_super) {
    __extends(EmulateAndroidCommand, _super);
    function EmulateAndroidCommand($platformService, $platformsData) {
        _super.call(this, $platformService);
        this.$platformsData = $platformsData;
        this.allowedParameters = [];
    }
    EmulateAndroidCommand.prototype.execute = function (args) {
        return this.executeCore([this.$platformsData.availablePlatforms.Android]);
    };
    return EmulateAndroidCommand;
})(EmulateCommandBase);
exports.EmulateAndroidCommand = EmulateAndroidCommand;
$injector.registerCommand("emulate|android", EmulateAndroidCommand);
