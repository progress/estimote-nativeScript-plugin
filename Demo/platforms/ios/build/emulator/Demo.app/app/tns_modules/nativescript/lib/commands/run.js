///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var RunCommandBase = (function () {
    function RunCommandBase($platformService) {
        this.$platformService = $platformService;
    }
    RunCommandBase.prototype.executeCore = function (args, buildConfig) {
        return this.$platformService.runPlatform(args[0], buildConfig);
    };
    return RunCommandBase;
})();
exports.RunCommandBase = RunCommandBase;
var RunIosCommand = (function (_super) {
    __extends(RunIosCommand, _super);
    function RunIosCommand($platformService, $platformsData) {
        _super.call(this, $platformService);
        this.$platformsData = $platformsData;
        this.allowedParameters = [];
    }
    RunIosCommand.prototype.execute = function (args) {
        return this.executeCore([this.$platformsData.availablePlatforms.iOS]);
    };
    return RunIosCommand;
})(RunCommandBase);
exports.RunIosCommand = RunIosCommand;
$injector.registerCommand("run|ios", RunIosCommand);
var RunAndroidCommand = (function (_super) {
    __extends(RunAndroidCommand, _super);
    function RunAndroidCommand($platformService, $platformsData, $options, $errors) {
        _super.call(this, $platformService);
        this.$platformsData = $platformsData;
        this.$options = $options;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    RunAndroidCommand.prototype.execute = function (args) {
        var config = this.$options.staticBindings ? { runSbGenerator: true } : undefined;
        return this.executeCore([this.$platformsData.availablePlatforms.Android], config);
    };
    RunAndroidCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$options.release && (!_this.$options.keyStorePath || !_this.$options.keyStorePassword || !_this.$options.keyStoreAlias || !_this.$options.keyStoreAliasPassword)) {
                _this.$errors.fail("When producing a release build, you need to specify all --key-store-* options.");
            }
            return args.length === 0;
        }).future()();
    };
    return RunAndroidCommand;
})(RunCommandBase);
exports.RunAndroidCommand = RunAndroidCommand;
$injector.registerCommand("run|android", RunAndroidCommand);
