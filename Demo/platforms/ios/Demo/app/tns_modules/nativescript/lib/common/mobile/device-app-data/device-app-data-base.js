///<reference path="../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var helpers = require("../../helpers");
var constants = require("../constants");
var DeviceAppDataBase = (function () {
    function DeviceAppDataBase(_appIdentifier) {
        this._appIdentifier = _appIdentifier;
    }
    Object.defineProperty(DeviceAppDataBase.prototype, "appIdentifier", {
        get: function () {
            return this._appIdentifier;
        },
        enumerable: true,
        configurable: true
    });
    DeviceAppDataBase.prototype.getDeviceProjectRootPath = function (projectRoot) {
        return helpers.fromWindowsRelativePathToUnix(projectRoot);
    };
    return DeviceAppDataBase;
})();
exports.DeviceAppDataBase = DeviceAppDataBase;
var AndroidDeviceAppDataBase = (function (_super) {
    __extends(AndroidDeviceAppDataBase, _super);
    function AndroidDeviceAppDataBase() {
        _super.apply(this, arguments);
    }
    AndroidDeviceAppDataBase.prototype.isLiveSyncSupported = function (device) {
        var _this = this;
        return (function () {
            var broadcastResult = device.adb.sendBroadcastToDevice(constants.CHECK_LIVESYNC_INTENT_NAME, { "app-id": _this.appIdentifier }).wait();
            return broadcastResult !== 0;
        }).future()();
    };
    return AndroidDeviceAppDataBase;
})(DeviceAppDataBase);
exports.AndroidDeviceAppDataBase = AndroidDeviceAppDataBase;
var CompanionDeviceAppDataBase = (function (_super) {
    __extends(CompanionDeviceAppDataBase, _super);
    function CompanionDeviceAppDataBase() {
        _super.apply(this, arguments);
    }
    CompanionDeviceAppDataBase.prototype.isLiveSyncSupported = function (device) {
        var _this = this;
        return (function () {
            var applications = device.applicationManager.getInstalledApplications().wait();
            return _.contains(applications, _this.appIdentifier);
        }).future()();
    };
    return CompanionDeviceAppDataBase;
})(DeviceAppDataBase);
exports.CompanionDeviceAppDataBase = CompanionDeviceAppDataBase;
