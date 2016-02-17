///<reference path="./../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var device_discovery_1 = require("./device-discovery");
var ios_core_1 = require("../ios/ios-core");
var ref = require("ref");
var ios_device_1 = require("../ios/ios-device");
var IOSDeviceDiscovery = (function (_super) {
    __extends(IOSDeviceDiscovery, _super);
    function IOSDeviceDiscovery($errors, $injector, $utils, $logger, $iTunesValidator, $hostInfo, $staticConfig) {
        _super.call(this);
        this.$errors = $errors;
        this.$injector = $injector;
        this.$utils = $utils;
        this.$logger = $logger;
        this.$iTunesValidator = $iTunesValidator;
        this.$hostInfo = $hostInfo;
        this.$staticConfig = $staticConfig;
        this.timerCallbackPtr = null;
        this.notificationCallbackPtr = null;
        this.timerCallbackPtr = ios_core_1.CoreTypes.cf_run_loop_timer_callback.toPointer(IOSDeviceDiscovery.timerCallback);
        this.notificationCallbackPtr = ios_core_1.CoreTypes.am_device_notification_callback.toPointer(IOSDeviceDiscovery.deviceNotificationCallback);
    }
    IOSDeviceDiscovery.prototype.validateiTunes = function () {
        var _this = this;
        return (function () {
            if (!_this._iTunesErrorMessage) {
                _this._iTunesErrorMessage = _this.$iTunesValidator.getError().wait();
                if (_this._iTunesErrorMessage) {
                    _this.$logger.warn(_this._iTunesErrorMessage);
                }
            }
            return !_this._iTunesErrorMessage;
        }).future()();
    };
    Object.defineProperty(IOSDeviceDiscovery.prototype, "$coreFoundation", {
        get: function () {
            if (!this._coreFoundation) {
                this._coreFoundation = this.$injector.resolve("$coreFoundation");
            }
            return this._coreFoundation;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSDeviceDiscovery.prototype, "$mobileDevice", {
        get: function () {
            if (!this._mobileDevice) {
                this._mobileDevice = this.$injector.resolve("$mobileDevice");
            }
            return this._mobileDevice;
        },
        enumerable: true,
        configurable: true
    });
    IOSDeviceDiscovery.prototype.startLookingForDevices = function () {
        var _this = this;
        return (function () {
            if (_this.validateiTunes().wait()) {
                _this.subscribeForNotifications();
                _this.checkForDevices().wait();
            }
        }).future()();
    };
    IOSDeviceDiscovery.prototype.checkForDevices = function () {
        var _this = this;
        return (function () {
            if (_this.validateiTunes().wait()) {
                var defaultTimeoutInSeconds = 1;
                var parsedTimeout = _this.$utils.getParsedTimeout(defaultTimeoutInSeconds);
                var timeout = parsedTimeout > defaultTimeoutInSeconds ? parsedTimeout / 1000 : defaultTimeoutInSeconds;
                _this.startRunLoopWithTimer(timeout);
            }
        }).future()();
    };
    IOSDeviceDiscovery.deviceNotificationCallback = function (devicePointer, user) {
        var iOSDeviceDiscovery = $injector.resolve("iOSDeviceDiscovery");
        var deviceInfo = ref.deref(devicePointer);
        if (deviceInfo.msg === IOSDeviceDiscovery.ADNCI_MSG_CONNECTED) {
            iOSDeviceDiscovery.createAndAddDevice(deviceInfo.dev);
        }
        else if (deviceInfo.msg === IOSDeviceDiscovery.ADNCI_MSG_DISCONNECTED) {
            var deviceIdentifier = iOSDeviceDiscovery.$coreFoundation.convertCFStringToCString(iOSDeviceDiscovery.$mobileDevice.deviceCopyDeviceIdentifier(deviceInfo.dev));
            iOSDeviceDiscovery.removeDevice(deviceIdentifier);
        }
    };
    IOSDeviceDiscovery.timerCallback = function () {
        var iOSDeviceDiscovery = $injector.resolve("iOSDeviceDiscovery");
        iOSDeviceDiscovery.$coreFoundation.runLoopStop(iOSDeviceDiscovery.$coreFoundation.runLoopGetCurrent());
    };
    IOSDeviceDiscovery.prototype.validateResult = function (result, error) {
        if (result !== 0) {
            this.$errors.fail(error);
        }
    };
    IOSDeviceDiscovery.prototype.subscribeForNotifications = function () {
        var notifyFunction = ref.alloc(ios_core_1.CoreTypes.amDeviceNotificationRef);
        var result = this.$mobileDevice.deviceNotificationSubscribe(this.notificationCallbackPtr, 0, 0, 0, notifyFunction);
        var error = IOSDeviceDiscovery.APPLE_SERVICE_NOT_STARTED_ERROR_CODE ?
            "Cannot run and complete operations on iOS devices because Apple Mobile Device Service is not started. Verify that iTunes is installed and running on your system." : "Unable to subscribe for notifications";
        this.validateResult(result, error);
        this.$errors.verifyHeap("subscribeForNotifications");
    };
    IOSDeviceDiscovery.prototype.startRunLoopWithTimer = function (timeout) {
        var kCFRunLoopDefaultMode = this.$coreFoundation.kCFRunLoopDefaultMode();
        var timer = null;
        if (timeout > 0) {
            var currentTime = this.$coreFoundation.absoluteTimeGetCurrent() + timeout;
            timer = this.$coreFoundation.runLoopTimerCreate(null, currentTime, 0, 0, 0, this.timerCallbackPtr, null);
            this.$coreFoundation.runLoopAddTimer(this.$coreFoundation.runLoopGetCurrent(), timer, kCFRunLoopDefaultMode);
        }
        this.$coreFoundation.runLoopRun();
        if (timeout > 0) {
            this.$coreFoundation.runLoopRemoveTimer(this.$coreFoundation.runLoopGetCurrent(), timer, kCFRunLoopDefaultMode);
        }
        this.$errors.verifyHeap("startRunLoopWithTimer");
    };
    IOSDeviceDiscovery.prototype.createAndAddDevice = function (devicePointer) {
        var device = this.$injector.resolve(ios_device_1.IOSDevice, { devicePointer: devicePointer });
        this.addDevice(device);
    };
    IOSDeviceDiscovery.ADNCI_MSG_CONNECTED = 1;
    IOSDeviceDiscovery.ADNCI_MSG_DISCONNECTED = 2;
    IOSDeviceDiscovery.APPLE_SERVICE_NOT_STARTED_ERROR_CODE = 0xE8000063;
    return IOSDeviceDiscovery;
})(device_discovery_1.DeviceDiscovery);
$injector.register("iOSDeviceDiscovery", IOSDeviceDiscovery);
