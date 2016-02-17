///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var userSettingsServiceBaseLib = require("../common/services/user-settings-service");
var UserSettingsService = (function (_super) {
    __extends(UserSettingsService, _super);
    function UserSettingsService($fs, $options) {
        var userSettingsFilePath = path.join($options.profileDir, "user-settings.json");
        _super.call(this, userSettingsFilePath, $fs);
    }
    return UserSettingsService;
})(userSettingsServiceBaseLib.UserSettingsServiceBase);
$injector.register("userSettingsService", UserSettingsService);
