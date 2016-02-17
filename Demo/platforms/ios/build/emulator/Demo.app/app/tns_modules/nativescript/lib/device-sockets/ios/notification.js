///<reference path="../../.d.ts"/>
"use strict";
var IOSNotification = (function () {
    function IOSNotification($projectData) {
        this.$projectData = $projectData;
    }
    Object.defineProperty(IOSNotification.prototype, "waitForDebug", {
        get: function () {
            return this.formatNotification(IOSNotification.WAIT_FOR_DEBUG_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "attachRequest", {
        get: function () {
            return this.formatNotification(IOSNotification.ATTACH_REQUEST_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "appLaunching", {
        get: function () {
            return this.formatNotification(IOSNotification.APP_LAUNCHING_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "readyForAttach", {
        get: function () {
            return this.formatNotification(IOSNotification.READY_FOR_ATTACH_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "attachAvailabilityQuery", {
        get: function () {
            return this.formatNotification(IOSNotification.ATTACH_AVAILABILITY_QUERY_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "alreadyConnected", {
        get: function () {
            return this.formatNotification(IOSNotification.ALREADY_CONNECTED_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSNotification.prototype, "attachAvailable", {
        get: function () {
            return this.formatNotification(IOSNotification.ATTACH_AVAILABLE_NOTIFICATION_NAME);
        },
        enumerable: true,
        configurable: true
    });
    IOSNotification.prototype.formatNotification = function (notification) {
        return this.$projectData.projectId + ":NativeScript.Debug." + notification;
    };
    IOSNotification.WAIT_FOR_DEBUG_NOTIFICATION_NAME = "WaitForDebugger";
    IOSNotification.ATTACH_REQUEST_NOTIFICATION_NAME = "AttachRequest";
    IOSNotification.APP_LAUNCHING_NOTIFICATION_NAME = "AppLaunching";
    IOSNotification.READY_FOR_ATTACH_NOTIFICATION_NAME = "ReadyForAttach";
    IOSNotification.ATTACH_AVAILABILITY_QUERY_NOTIFICATION_NAME = "AttachAvailabilityQuery";
    IOSNotification.ALREADY_CONNECTED_NOTIFICATION_NAME = "AlreadyConnected";
    IOSNotification.ATTACH_AVAILABLE_NOTIFICATION_NAME = "AttachAvailable";
    return IOSNotification;
})();
exports.IOSNotification = IOSNotification;
$injector.register("iOSNotification", IOSNotification);
