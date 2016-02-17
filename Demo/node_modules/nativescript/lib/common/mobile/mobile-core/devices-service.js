///<reference path="./../../.d.ts"/>
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var util = require("util");
var Future = require("fibers/future");
var helpers = require("../../helpers");
var assert = require("assert");
var constants = require("../constants");
var decorators_1 = require("../../decorators");
var fiberBootstrap = require("../../fiber-bootstrap");
var DevicesService = (function () {
    function DevicesService($logger, $errors, $iOSDeviceDiscovery, $androidDeviceDiscovery, $staticConfig, $mobileHelper) {
        this.$logger = $logger;
        this.$errors = $errors;
        this.$iOSDeviceDiscovery = $iOSDeviceDiscovery;
        this.$androidDeviceDiscovery = $androidDeviceDiscovery;
        this.$staticConfig = $staticConfig;
        this.$mobileHelper = $mobileHelper;
        this._devices = {};
        this.platforms = [];
        this._isInitialized = false;
        this.attachToDeviceDiscoveryEvents();
    }
    Object.defineProperty(DevicesService.prototype, "platform", {
        get: function () {
            return this._platform;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DevicesService.prototype, "deviceCount", {
        get: function () {
            return this._device ? 1 : this.getDeviceInstances().length;
        },
        enumerable: true,
        configurable: true
    });
    DevicesService.prototype.getDevices = function () {
        return this.getDeviceInstances().map(function (deviceInstance) { return deviceInstance.deviceInfo; });
    };
    DevicesService.prototype.getDeviceInstances = function () {
        return _.values(this._devices);
    };
    DevicesService.prototype.getAllPlatforms = function () {
        var _this = this;
        if (this.platforms.length > 0) {
            return this.platforms;
        }
        this.platforms = _.filter(this.$mobileHelper.platformNames, function (platform) { return _this.$mobileHelper.getPlatformCapabilities(platform).cableDeploy; });
        return this.platforms;
    };
    DevicesService.prototype.getPlatform = function (platform) {
        var allSupportedPlatforms = this.getAllPlatforms();
        var normalizedPlatform = this.$mobileHelper.validatePlatformName(platform);
        if (!_.contains(allSupportedPlatforms, normalizedPlatform)) {
            this.$errors.failWithoutHelp("Deploying to %s connected devices is not supported. Build the " +
                "app using the `build` command and deploy the package manually.", normalizedPlatform);
        }
        return normalizedPlatform;
    };
    DevicesService.prototype.attachToDeviceDiscoveryEvents = function () {
        var _this = this;
        this.$iOSDeviceDiscovery.on("deviceFound", function (device) { return _this.onDeviceFound(device); });
        this.$iOSDeviceDiscovery.on("deviceLost", function (device) { return _this.onDeviceLost(device); });
        this.$androidDeviceDiscovery.on("deviceFound", function (device) { return _this.onDeviceFound(device); });
        this.$androidDeviceDiscovery.on("deviceLost", function (device) { return _this.onDeviceLost(device); });
    };
    DevicesService.prototype.onDeviceFound = function (device) {
        this.$logger.trace("Found device with identifier '%s'", device.deviceInfo.identifier);
        this._devices[device.deviceInfo.identifier] = device;
    };
    DevicesService.prototype.onDeviceLost = function (device) {
        this.$logger.trace("Lost device with identifier '%s'", device.deviceInfo.identifier);
        delete this._devices[device.deviceInfo.identifier];
    };
    DevicesService.prototype.startLookingForDevices = function () {
        var _this = this;
        return (function () {
            _this.$logger.trace("startLookingForDevices; platform is %s", _this._platform);
            if (!_this._platform) {
                _this.$iOSDeviceDiscovery.startLookingForDevices().wait();
                _this.$androidDeviceDiscovery.startLookingForDevices().wait();
                setInterval(function () {
                    fiberBootstrap.run(function () {
                        Future.wait([_this.$iOSDeviceDiscovery.checkForDevices(),
                            _this.$androidDeviceDiscovery.checkForDevices()]);
                    });
                }, DevicesService.DEVICE_LOOKING_INTERVAL).unref();
            }
            else if (_this.$mobileHelper.isiOSPlatform(_this._platform)) {
                _this.$iOSDeviceDiscovery.startLookingForDevices().wait();
            }
            else if (_this.$mobileHelper.isAndroidPlatform(_this._platform)) {
                _this.$androidDeviceDiscovery.startLookingForDevices().wait();
            }
        }).future()();
    };
    DevicesService.prototype.getAllConnectedDevices = function () {
        if (!this._platform) {
            return this.getDeviceInstances();
        }
        else {
            return this.filterDevicesByPlatform();
        }
    };
    DevicesService.prototype.getDeviceByIndex = function (index) {
        this.validateIndex(index - 1);
        return this.getDeviceInstances()[index - 1];
    };
    DevicesService.prototype.getDeviceByIdentifier = function (identifier) {
        var searchedDevice = _.find(this.getDeviceInstances(), function (device) { return device.deviceInfo.identifier === identifier; });
        if (!searchedDevice) {
            this.$errors.fail(DevicesService.NOT_FOUND_DEVICE_BY_IDENTIFIER_ERROR_MESSAGE, identifier, this.$staticConfig.CLIENT_NAME.toLowerCase());
        }
        return searchedDevice;
    };
    DevicesService.prototype.getDevice = function (deviceOption) {
        var _this = this;
        return (function () {
            _this.startLookingForDevices().wait();
            var device = null;
            if (_this.hasDevice(deviceOption)) {
                device = _this.getDeviceByIdentifier(deviceOption);
            }
            else if (helpers.isNumber(deviceOption)) {
                device = _this.getDeviceByIndex(parseInt(deviceOption, 10));
            }
            if (!device) {
                _this.$errors.fail("Cannot resolve the specified connected device by the provided index or identifier. To list currently connected devices and verify that the specified index or identifier exists, run '%s device'.", _this.$staticConfig.CLIENT_NAME.toLowerCase());
            }
            return device;
        }).future()();
    };
    DevicesService.prototype.executeOnDevice = function (action, canExecute) {
        var _this = this;
        return (function () {
            if (!canExecute || canExecute(_this._device)) {
                action(_this._device).wait();
            }
        }).future()();
    };
    DevicesService.prototype.executeOnAllConnectedDevices = function (action, canExecute) {
        var _this = this;
        return (function () {
            var allConnectedDevices = _this.getAllConnectedDevices();
            var futures = _.map(allConnectedDevices, function (device) {
                if (!canExecute || canExecute(device)) {
                    var future = action(device);
                    Future.settle(future);
                    return future;
                }
                else {
                    return Future.fromResult();
                }
            });
            Future.wait(futures);
        }).future()();
    };
    DevicesService.prototype.deployOnDevices = function (deviceIdentifiers, packageFile, packageName) {
        var _this = this;
        this.$logger.trace("Called deployOnDevices for identifiers " + deviceIdentifiers + " for packageFile: " + packageFile + ". packageName is " + packageName + ".");
        return _.map(deviceIdentifiers, function (deviceIdentifier) { return _this.deployOnDevice(deviceIdentifier, packageFile, packageName); });
    };
    DevicesService.prototype.execute = function (action, canExecute, options) {
        var _this = this;
        return (function () {
            assert.ok(_this._isInitialized, "Devices services not initialized!");
            if (_this.hasDevices) {
                if (_this._device) {
                    _this.executeOnDevice(action, canExecute).wait();
                }
                else {
                    _this.executeOnAllConnectedDevices(action, canExecute).wait();
                }
            }
            else {
                var message = constants.ERROR_NO_DEVICES;
                if (options && options["allowNoDevices"]) {
                    _this.$logger.info(message);
                }
                else {
                    _this.$errors.failWithoutHelp(message);
                }
            }
        }).future()();
    };
    DevicesService.prototype.initialize = function (data) {
        var _this = this;
        if (this._isInitialized) {
            return Future.fromResult();
        }
        return (function () {
            data = data || {};
            var platform = data.platform;
            var deviceOption = data.deviceId;
            if (platform && deviceOption) {
                _this._device = _this.getDevice(deviceOption).wait();
                _this._platform = _this._device.deviceInfo.platform;
                if (_this._platform !== _this.getPlatform(platform)) {
                    _this.$errors.fail("Cannot resolve the specified connected device. The provided platform does not match the provided index or identifier." +
                        "To list currently connected devices and verify that the specified pair of platform and index or identifier exists, run 'device'.");
                }
                _this.$logger.warn("Your application will be deployed only on the device specified by the provided index or identifier.");
            }
            else if (!platform && deviceOption) {
                _this._device = _this.getDevice(deviceOption).wait();
                _this._platform = _this._device.deviceInfo.platform;
            }
            else if (platform && !deviceOption) {
                _this._platform = _this.getPlatform(platform);
                _this.startLookingForDevices().wait();
            }
            else if (!platform && !deviceOption) {
                _this.startLookingForDevices().wait();
                if (!data.skipInferPlatform) {
                    var devices = _this.getDeviceInstances();
                    var platforms = _.uniq(_.map(devices, function (device) { return device.deviceInfo.platform; }));
                    if (platforms.length === 1) {
                        _this._platform = platforms[0];
                    }
                    else if (platforms.length === 0) {
                        _this.$errors.fail({ formatStr: constants.ERROR_NO_DEVICES, suppressCommandHelp: true });
                    }
                    else {
                        _this.$errors.fail("Multiple device platforms detected (%s). Specify platform or device on command line.", helpers.formatListOfNames(platforms, "and"));
                    }
                }
            }
            _this._isInitialized = true;
        }).future()();
    };
    Object.defineProperty(DevicesService.prototype, "hasDevices", {
        get: function () {
            if (!this._platform) {
                return this.getDeviceInstances().length !== 0;
            }
            else {
                return this.filterDevicesByPlatform().length !== 0;
            }
        },
        enumerable: true,
        configurable: true
    });
    DevicesService.prototype.deployOnDevice = function (deviceIdentifier, packageFile, packageName) {
        var _this = this;
        return (function () {
            if (_(_this._devices).keys().find(function (d) { return d === deviceIdentifier; })) {
                _this._devices[deviceIdentifier].deploy(packageFile, packageName).wait();
            }
            else {
                throw new Error("Cannot find device with identifier " + deviceIdentifier + ".");
            }
        }).future()();
    };
    DevicesService.prototype.hasDevice = function (identifier) {
        return _.some(this.getDeviceInstances(), function (device) { return device.deviceInfo.identifier === identifier; });
    };
    DevicesService.prototype.filterDevicesByPlatform = function () {
        var _this = this;
        return _.filter(this.getDeviceInstances(), function (device) { return device.deviceInfo.platform === _this._platform; });
    };
    DevicesService.prototype.validateIndex = function (index) {
        if (index < 0 || index > this.getDeviceInstances().length) {
            throw new Error(util.format(DevicesService.NOT_FOUND_DEVICE_BY_INDEX_ERROR_MESSAGE, index, this.$staticConfig.CLIENT_NAME.toLowerCase()));
        }
    };
    DevicesService.NOT_FOUND_DEVICE_BY_IDENTIFIER_ERROR_MESSAGE = "Could not find device by specified identifier '%s'. To list currently connected devices and verify that the specified identifier exists, run '%s device'.";
    DevicesService.NOT_FOUND_DEVICE_BY_INDEX_ERROR_MESSAGE = "Could not find device by specified index %d. To list currently connected devices and verify that the specified index exists, run '%s device'.";
    DevicesService.DEVICE_LOOKING_INTERVAL = 2200;
    Object.defineProperty(DevicesService.prototype, "getDevices",
        __decorate([
            decorators_1.exported("devicesService")
        ], DevicesService.prototype, "getDevices", Object.getOwnPropertyDescriptor(DevicesService.prototype, "getDevices")));
    Object.defineProperty(DevicesService.prototype, "deployOnDevices",
        __decorate([
            decorators_1.exportedPromise("devicesService")
        ], DevicesService.prototype, "deployOnDevices", Object.getOwnPropertyDescriptor(DevicesService.prototype, "deployOnDevices")));
    return DevicesService;
})();
exports.DevicesService = DevicesService;
$injector.register("devicesService", DevicesService);
