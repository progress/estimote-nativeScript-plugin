///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../helpers");
var path = require("path");
var LocalToDevicePathData = (function () {
    function LocalToDevicePathData(fileName, localProjectRootPath, onDeviceFileName, deviceProjectRootPath) {
        this.fileName = fileName;
        this.localProjectRootPath = localProjectRootPath;
        this.onDeviceFileName = onDeviceFileName;
        this.deviceProjectRootPath = deviceProjectRootPath;
    }
    LocalToDevicePathData.prototype.getLocalPath = function () {
        return this.fileName;
    };
    LocalToDevicePathData.prototype.getDevicePath = function () {
        if (!this.devicePath) {
            var devicePath = path.join(this.deviceProjectRootPath, this.getRelativeToProjectBasePath());
            this.devicePath = helpers.fromWindowsRelativePathToUnix(devicePath);
        }
        return this.devicePath;
    };
    LocalToDevicePathData.prototype.getRelativeToProjectBasePath = function () {
        if (!this.relativeToProjectBasePath) {
            this.relativeToProjectBasePath = helpers.getRelativeToRootPath(this.localProjectRootPath, this.onDeviceFileName);
        }
        return this.relativeToProjectBasePath;
    };
    return LocalToDevicePathData;
})();
exports.LocalToDevicePathData = LocalToDevicePathData;
var LocalToDevicePathDataFactory = (function () {
    function LocalToDevicePathDataFactory() {
    }
    LocalToDevicePathDataFactory.prototype.create = function (fileName, localProjectRootPath, onDeviceFileName, deviceProjectRootPath) {
        return new LocalToDevicePathData(fileName, localProjectRootPath, onDeviceFileName, deviceProjectRootPath);
    };
    return LocalToDevicePathDataFactory;
})();
exports.LocalToDevicePathDataFactory = LocalToDevicePathDataFactory;
$injector.register("localToDevicePathDataFactory", LocalToDevicePathDataFactory);
