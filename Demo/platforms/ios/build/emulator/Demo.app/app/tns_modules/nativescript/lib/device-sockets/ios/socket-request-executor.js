///<reference path="../../.d.ts"/>
"use strict";
var helpers = require("../../common/helpers");
var iOSProxyServices = require("../../common/mobile/ios/ios-proxy-services");
var IOSSocketRequestExecutor = (function () {
    function IOSSocketRequestExecutor($errors, $injector, $iOSNotification, $iOSNotificationService, $logger, $projectData, $socketProxyFactory) {
        this.$errors = $errors;
        this.$injector = $injector;
        this.$iOSNotification = $iOSNotification;
        this.$iOSNotificationService = $iOSNotificationService;
        this.$logger = $logger;
        this.$projectData = $projectData;
        this.$socketProxyFactory = $socketProxyFactory;
    }
    IOSSocketRequestExecutor.prototype.executeAttachRequest = function (device, timeout) {
        var _this = this;
        return (function () {
            var npc = new iOSProxyServices.NotificationProxyClient(device, _this.$injector);
            var _a = [_this.$iOSNotification.alreadyConnected, _this.$iOSNotification.readyForAttach, _this.$iOSNotification.attachAvailable]
                .map(function (notification) { return _this.$iOSNotificationService.awaitNotification(npc, notification, timeout); }), alreadyConnected = _a[0], readyForAttach = _a[1], attachAvailable = _a[2];
            npc.postNotificationAndAttachForData(_this.$iOSNotification.attachAvailabilityQuery);
            var receivedNotification;
            try {
                receivedNotification = helpers.whenAny(alreadyConnected, readyForAttach, attachAvailable).wait();
            }
            catch (e) {
                _this.$errors.failWithoutHelp("The application " + _this.$projectData.projectId + " does not appear to be running on " + device.deviceInfo.displayName + " or is not built with debugging enabled.");
            }
            switch (receivedNotification) {
                case alreadyConnected:
                    _this.$errors.failWithoutHelp("A client is already connected.");
                    break;
                case attachAvailable:
                    _this.executeAttachAvailable(npc, timeout).wait();
                    break;
                case readyForAttach:
                    break;
            }
        }).future()();
    };
    IOSSocketRequestExecutor.prototype.executeLaunchRequest = function (device, timeout, readyForAttachTimeout) {
        var _this = this;
        return (function () {
            var npc = new iOSProxyServices.NotificationProxyClient(device, _this.$injector);
            try {
                _this.$iOSNotificationService.awaitNotification(npc, _this.$iOSNotification.appLaunching, timeout).wait();
                process.nextTick(function () {
                    npc.postNotificationAndAttachForData(_this.$iOSNotification.waitForDebug);
                    npc.postNotificationAndAttachForData(_this.$iOSNotification.attachRequest);
                });
                _this.$iOSNotificationService.awaitNotification(npc, _this.$iOSNotification.readyForAttach, readyForAttachTimeout).wait();
            }
            catch (e) {
                _this.$logger.trace("Timeout error: " + e);
                _this.$errors.failWithoutHelp("Timeout waiting for response from NativeScript runtime.");
            }
        }).future()();
    };
    IOSSocketRequestExecutor.prototype.executeAttachAvailable = function (npc, timeout) {
        var _this = this;
        return (function () {
            process.nextTick(function () { return npc.postNotificationAndAttachForData(_this.$iOSNotification.attachRequest); });
            try {
                _this.$iOSNotificationService.awaitNotification(npc, _this.$iOSNotification.readyForAttach, timeout).wait();
            }
            catch (e) {
                _this.$errors.failWithoutHelp("The application " + _this.$projectData.projectId + " timed out when performing the socket handshake.");
            }
        }).future()();
    };
    return IOSSocketRequestExecutor;
})();
exports.IOSSocketRequestExecutor = IOSSocketRequestExecutor;
$injector.register("iOSSocketRequestExecutor", IOSSocketRequestExecutor);
