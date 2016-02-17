"use strict";
var ProvisionType = (function () {
    function ProvisionType() {
    }
    ProvisionType.Development = "Development";
    ProvisionType.AdHoc = "AdHoc";
    ProvisionType.AppStore = "AppStore";
    ProvisionType.Enterprise = "Enterprise";
    return ProvisionType;
})();
exports.ProvisionType = ProvisionType;
exports.ERROR_NO_DEVICES = "Cannot find connected devices. Reconnect any connected devices, verify that your system recognizes them, and run this command again.";
exports.CHECK_LIVESYNC_INTENT_NAME = "com.telerik.IsLiveSyncSupported";
