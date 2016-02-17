///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BuildCommandBase = (function () {
    function BuildCommandBase($options, $platformService) {
        this.$options = $options;
        this.$platformService = $platformService;
    }
    BuildCommandBase.prototype.executeCore = function (args, buildConfig) {
        var _this = this;
        return (function () {
            var platform = args[0].toLowerCase();
            _this.$platformService.buildPlatform(platform, buildConfig).wait();
            if (_this.$options.copyTo) {
                _this.$platformService.copyLastOutput(platform, _this.$options.copyTo, { isForDevice: _this.$options.forDevice }).wait();
            }
        }).future()();
    };
    return BuildCommandBase;
})();
exports.BuildCommandBase = BuildCommandBase;
var BuildIosCommand = (function (_super) {
    __extends(BuildIosCommand, _super);
    function BuildIosCommand($options, $platformsData, $platformService) {
        _super.call(this, $options, $platformService);
        this.$options = $options;
        this.$platformsData = $platformsData;
        this.allowedParameters = [];
    }
    BuildIosCommand.prototype.execute = function (args) {
        return this.executeCore([this.$platformsData.availablePlatforms.iOS]);
    };
    return BuildIosCommand;
})(BuildCommandBase);
exports.BuildIosCommand = BuildIosCommand;
$injector.registerCommand("build|ios", BuildIosCommand);
var BuildAndroidCommand = (function (_super) {
    __extends(BuildAndroidCommand, _super);
    function BuildAndroidCommand($options, $platformsData, $errors, $platformService) {
        _super.call(this, $options, $platformService);
        this.$options = $options;
        this.$platformsData = $platformsData;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    BuildAndroidCommand.prototype.execute = function (args) {
        var config = this.$options.staticBindings ? { runSbGenerator: true } : undefined;
        return this.executeCore([this.$platformsData.availablePlatforms.Android], config);
    };
    BuildAndroidCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (_this.$options.release && (!_this.$options.keyStorePath || !_this.$options.keyStorePassword || !_this.$options.keyStoreAlias || !_this.$options.keyStoreAliasPassword)) {
                _this.$errors.fail("When producing a release build, you need to specify all --key-store-* options.");
            }
            return args.length === 0;
        }).future()();
    };
    return BuildAndroidCommand;
})(BuildCommandBase);
exports.BuildAndroidCommand = BuildAndroidCommand;
$injector.registerCommand("build|android", BuildAndroidCommand);
