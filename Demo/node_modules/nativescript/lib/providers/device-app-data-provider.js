///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var deviceAppDataBaseLib = require("../common/mobile/device-app-data/device-app-data-base");
var Future = require("fibers/future");
var IOSAppIdentifier = (function (_super) {
    __extends(IOSAppIdentifier, _super);
    function IOSAppIdentifier(_appIdentifier) {
        _super.call(this, _appIdentifier);
    }
    Object.defineProperty(IOSAppIdentifier.prototype, "deviceProjectRootPath", {
        get: function () {
            return this.getDeviceProjectRootPath(IOSAppIdentifier.DEVICE_PROJECT_ROOT_PATH);
        },
        enumerable: true,
        configurable: true
    });
    IOSAppIdentifier.prototype.isLiveSyncSupported = function (device) {
        return Future.fromResult(true);
    };
    IOSAppIdentifier.DEVICE_PROJECT_ROOT_PATH = "Library/Application Support/LiveSync";
    return IOSAppIdentifier;
})(deviceAppDataBaseLib.DeviceAppDataBase);
exports.IOSAppIdentifier = IOSAppIdentifier;
var AndroidAppIdentifier = (function (_super) {
    __extends(AndroidAppIdentifier, _super);
    function AndroidAppIdentifier(_appIdentifier) {
        _super.call(this, _appIdentifier);
    }
    Object.defineProperty(AndroidAppIdentifier.prototype, "deviceProjectRootPath", {
        get: function () {
            var options = $injector.resolve("options");
            var syncFolderName = options.watch ? "sync" : "fullsync";
            return "/data/local/tmp/" + this.appIdentifier + "/" + syncFolderName;
        },
        enumerable: true,
        configurable: true
    });
    AndroidAppIdentifier.prototype.isLiveSyncSupported = function (device) {
        return Future.fromResult(true);
    };
    return AndroidAppIdentifier;
})(deviceAppDataBaseLib.DeviceAppDataBase);
exports.AndroidAppIdentifier = AndroidAppIdentifier;
var AndroidCompanionAppIdentifier = (function (_super) {
    __extends(AndroidCompanionAppIdentifier, _super);
    function AndroidCompanionAppIdentifier() {
        _super.call(this, AndroidCompanionAppIdentifier.APP_IDENTIFIER);
    }
    Object.defineProperty(AndroidCompanionAppIdentifier.prototype, "deviceProjectRootPath", {
        get: function () {
            return "/mnt/sdcard/Android/data/" + this.appIdentifier + "/files/12590FAA-5EDD-4B12-856D-F52A0A1599F2";
        },
        enumerable: true,
        configurable: true
    });
    AndroidCompanionAppIdentifier.APP_IDENTIFIER = "com.telerik.NativeScript";
    return AndroidCompanionAppIdentifier;
})(deviceAppDataBaseLib.CompanionDeviceAppDataBase);
exports.AndroidCompanionAppIdentifier = AndroidCompanionAppIdentifier;
var DeviceAppDataProvider = (function () {
    function DeviceAppDataProvider() {
    }
    DeviceAppDataProvider.prototype.createFactoryRules = function () {
        return {
            iOS: {
                vanilla: IOSAppIdentifier
            },
            Android: {
                vanilla: AndroidAppIdentifier,
                companion: AndroidCompanionAppIdentifier
            }
        };
    };
    return DeviceAppDataProvider;
})();
exports.DeviceAppDataProvider = DeviceAppDataProvider;
$injector.register("deviceAppDataProvider", DeviceAppDataProvider);
