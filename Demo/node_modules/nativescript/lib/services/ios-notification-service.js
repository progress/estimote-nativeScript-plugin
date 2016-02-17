///<reference path="../.d.ts"/>
"use strict";
var Future = require("fibers/future");
var IOSNotificationService = (function () {
    function IOSNotificationService() {
    }
    IOSNotificationService.prototype.awaitNotification = function (npc, notification, timeout) {
        var future = new Future();
        var timeoutToken = setTimeout(function () {
            detachObserver();
            future.throw(new Error("Timeout receiving " + notification + " notification."));
        }, timeout);
        function notificationObserver(_notification) {
            clearTimeout(timeoutToken);
            detachObserver();
            future.return(_notification);
        }
        function detachObserver() {
            process.nextTick(function () { return npc.removeObserver(notification, notificationObserver); });
        }
        npc.addObserver(notification, notificationObserver);
        return future;
    };
    return IOSNotificationService;
})();
exports.IOSNotificationService = IOSNotificationService;
$injector.register("iOSNotificationService", IOSNotificationService);
