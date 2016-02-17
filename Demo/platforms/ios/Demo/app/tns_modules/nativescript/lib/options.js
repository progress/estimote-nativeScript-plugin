///<reference path=".d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var commonOptionsLibPath = require("./common/options");
var osenv = require("osenv");
var path = require("path");
var OptionType = commonOptionsLibPath.OptionType;
var Options = (function (_super) {
    __extends(Options, _super);
    function Options($errors, $staticConfig, $hostInfo) {
        _super.call(this, {
            frameworkPath: { type: OptionType.String },
            frameworkName: { type: OptionType.String },
            framework: { type: OptionType.String },
            frameworkVersion: { type: OptionType.String },
            copyFrom: { type: OptionType.String },
            linkTo: { type: OptionType.String },
            release: { type: OptionType.Boolean },
            symlink: { type: OptionType.Boolean },
            forDevice: { type: OptionType.Boolean },
            client: { type: OptionType.Boolean, default: true },
            production: { type: OptionType.Boolean },
            debugTransport: { type: OptionType.Boolean },
            keyStorePath: { type: OptionType.String },
            keyStorePassword: { type: OptionType.String, },
            keyStoreAlias: { type: OptionType.String },
            keyStoreAliasPassword: { type: OptionType.String },
            ignoreScripts: { type: OptionType.Boolean },
            tnsModulesVersion: { type: OptionType.String },
            staticBindings: { type: OptionType.Boolean },
            compileSdk: { type: OptionType.Number },
            port: { type: OptionType.Number },
            copyTo: { type: OptionType.String },
            baseConfig: { type: OptionType.String }
        }, path.join($hostInfo.isWindows ? process.env.LocalAppData : path.join(osenv.home(), ".local/share"), ".nativescript-cli"), $errors, $staticConfig);
    }
    return Options;
})(commonOptionsLibPath.OptionsBase);
exports.Options = Options;
$injector.register("options", Options);
