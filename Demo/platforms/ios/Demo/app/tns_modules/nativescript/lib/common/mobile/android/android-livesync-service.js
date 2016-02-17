///<reference path="../../.d.ts"/>
"use strict";
var LiveSyncCommands = (function () {
    function LiveSyncCommands() {
    }
    LiveSyncCommands.DeployProjectCommand = function (liveSyncUrl) {
        return "DeployProject " + liveSyncUrl + " \r";
    };
    LiveSyncCommands.ReloadStartViewCommand = function () {
        return "ReloadStartView \r";
    };
    LiveSyncCommands.SyncFilesCommand = function () {
        return "SyncFiles \r";
    };
    LiveSyncCommands.RefreshCurrentViewCommand = function () {
        return "RefreshCurrentView \r";
    };
    return LiveSyncCommands;
})();
var AndroidLiveSyncService = (function () {
    function AndroidLiveSyncService(device, $fs, $mobileHelper) {
        this.device = device;
        this.$fs = $fs;
        this.$mobileHelper = $mobileHelper;
    }
    Object.defineProperty(AndroidLiveSyncService.prototype, "liveSyncCommands", {
        get: function () {
            return LiveSyncCommands;
        },
        enumerable: true,
        configurable: true
    });
    AndroidLiveSyncService.prototype.livesync = function (appIdentifier, liveSyncRoot, commands) {
        var _this = this;
        return (function () {
            var commandsFileDevicePath = _this.$mobileHelper.buildDevicePath(liveSyncRoot, AndroidLiveSyncService.COMMANDS_FILE);
            _this.createCommandsFileOnDevice(commandsFileDevicePath, commands).wait();
            _this.device.adb.sendBroadcastToDevice(AndroidLiveSyncService.LIVESYNC_BROADCAST_NAME, { "app-id": appIdentifier }).wait();
        }).future()();
    };
    AndroidLiveSyncService.prototype.createCommandsFileOnDevice = function (commandsFileDevicePath, commands) {
        return this.device.fileSystem.createFileOnDevice(commandsFileDevicePath, commands.join("\n"));
    };
    AndroidLiveSyncService.COMMANDS_FILE = "telerik.livesync.commands";
    AndroidLiveSyncService.LIVESYNC_BROADCAST_NAME = "com.telerik.LiveSync";
    return AndroidLiveSyncService;
})();
exports.AndroidLiveSyncService = AndroidLiveSyncService;
