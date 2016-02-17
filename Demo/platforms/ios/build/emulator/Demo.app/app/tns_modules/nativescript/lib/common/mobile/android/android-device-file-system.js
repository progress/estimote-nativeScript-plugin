///<reference path="../../.d.ts"/>
"use strict";
var path = require("path");
var temp = require("temp");
var future = require("fibers/future");
var AndroidDeviceFileSystem = (function () {
    function AndroidDeviceFileSystem(adb, identifier, $fs, $logger, $deviceAppDataFactory, $mobileHelper) {
        this.adb = adb;
        this.identifier = identifier;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$deviceAppDataFactory = $deviceAppDataFactory;
        this.$mobileHelper = $mobileHelper;
    }
    AndroidDeviceFileSystem.prototype.listFiles = function (devicePath) {
        return future.fromResult();
    };
    AndroidDeviceFileSystem.prototype.getFile = function (deviceFilePath) {
        return future.fromResult();
    };
    AndroidDeviceFileSystem.prototype.putFile = function (localFilePath, deviceFilePath) {
        return future.fromResult();
    };
    AndroidDeviceFileSystem.prototype.transferFiles = function (appIdentifier, localToDevicePaths, projectFilesPath) {
        var _this = this;
        return (function () {
            _(localToDevicePaths)
                .filter(function (localToDevicePathData) { return _this.$fs.getFsStats(localToDevicePathData.getLocalPath()).wait().isFile(); })
                .each(function (localToDevicePathData) {
                return _this.adb.executeCommand(["push", localToDevicePathData.getLocalPath(), localToDevicePathData.getDevicePath()]).wait();
            })
                .value();
            _(localToDevicePaths)
                .filter(function (localToDevicePathData) { return _this.$fs.getFsStats(localToDevicePathData.getLocalPath()).wait().isDirectory(); })
                .each(function (localToDevicePathData) {
                return _this.adb.executeShellCommand(["chmod", "0777", localToDevicePathData.getDevicePath()]).wait();
            })
                .value();
        }).future()();
    };
    AndroidDeviceFileSystem.prototype.transferDirectory = function (deviceAppData, localToDevicePaths, projectFilesPath) {
        var _this = this;
        return (function () {
            _this.adb.executeCommand(["push", projectFilesPath, deviceAppData.deviceProjectRootPath]).wait();
            var command = _.map(localToDevicePaths, function (localToDevicePathData) { return ("\"" + localToDevicePathData.getDevicePath() + "\""); }).join(" ");
            var commandsDeviceFilePath = _this.$mobileHelper.buildDevicePath(deviceAppData.deviceProjectRootPath, "nativescript.commands.sh");
            _this.createFileOnDevice(commandsDeviceFilePath, command).wait();
            _this.adb.executeShellCommand([commandsDeviceFilePath]).wait();
        }).future()();
    };
    AndroidDeviceFileSystem.prototype.transferFile = function (localPath, devicePath) {
        var _this = this;
        return (function () {
            _this.$logger.trace("Transfering " + localPath + " to " + devicePath);
            var stats = _this.$fs.getFsStats(localPath).wait();
            if (stats.isDirectory()) {
                _this.adb.executeShellCommand(["mkdir", path.dirname(devicePath)]).wait();
            }
            else {
                _this.adb.executeCommand(["push", localPath, devicePath]).wait();
            }
        }).future()();
    };
    AndroidDeviceFileSystem.prototype.createFileOnDevice = function (deviceFilePath, fileContent) {
        var _this = this;
        return (function () {
            var hostTmpDir = _this.getTempDir();
            var commandsFileHostPath = path.join(hostTmpDir, "temp.commands.file");
            _this.$fs.writeFile(commandsFileHostPath, fileContent).wait();
            _this.transferFile(commandsFileHostPath, deviceFilePath).wait();
            _this.adb.executeShellCommand(["chmod", "0777", deviceFilePath]).wait();
        }).future()();
    };
    AndroidDeviceFileSystem.prototype.getTempDir = function () {
        temp.track();
        return temp.mkdirSync("application-");
    };
    return AndroidDeviceFileSystem;
})();
exports.AndroidDeviceFileSystem = AndroidDeviceFileSystem;
