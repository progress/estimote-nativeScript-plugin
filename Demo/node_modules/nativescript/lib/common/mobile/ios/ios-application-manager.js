///<reference path="../../.d.ts"/>
"use strict";
var net = require("net");
var ref = require("ref");
var os = require("os");
var ios_core_1 = require("./ios-core");
var iOSProxyServices = require("./ios-proxy-services");
var IOSApplicationManager = (function () {
    function IOSApplicationManager(device, devicePointer, $childProcess, $coreFoundation, $errors, $injector, $mobileDevice, $logger, $hostInfo, $staticConfig, $devicePlatformsConstants, $options) {
        this.device = device;
        this.devicePointer = devicePointer;
        this.$childProcess = $childProcess;
        this.$coreFoundation = $coreFoundation;
        this.$errors = $errors;
        this.$injector = $injector;
        this.$mobileDevice = $mobileDevice;
        this.$logger = $logger;
        this.$hostInfo = $hostInfo;
        this.$staticConfig = $staticConfig;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$options = $options;
        this.uninstallApplicationCallbackPtr = null;
        this._gdbServer = null;
        this.uninstallApplicationCallbackPtr = ios_core_1.CoreTypes.am_device_mount_image_callback.toPointer(IOSApplicationManager.uninstallCallback);
    }
    IOSApplicationManager.uninstallCallback = function (dictionary, user) { };
    IOSApplicationManager.prototype.getInstalledApplications = function () {
        var _this = this;
        return (function () {
            return _(_this.lookupApplications()).keys().sortBy(function (identifier) { return identifier.toLowerCase(); }).value();
        }).future()();
    };
    IOSApplicationManager.prototype.installApplication = function (packageFilePath) {
        var _this = this;
        return (function () {
            var installationProxy = _this.$injector.resolve(iOSProxyServices.InstallationProxyClient, { device: _this.device });
            installationProxy.deployApplication(packageFilePath).wait();
            installationProxy.closeSocket();
        }).future()();
    };
    IOSApplicationManager.prototype.uninstallApplication = function (applicationId) {
        var _this = this;
        return (function () {
            var afc = _this.device.startService(iOSProxyServices.MobileServices.INSTALLATION_PROXY);
            try {
                var result = _this.$mobileDevice.deviceUninstallApplication(afc, _this.$coreFoundation.createCFString(applicationId), null, _this.uninstallApplicationCallbackPtr);
                if (result) {
                    _this.$errors.failWithoutHelp("AMDeviceUninstallApplication returned '%d'.", result);
                }
            }
            catch (e) {
                _this.$logger.trace("Error while uninstalling application " + e + ".");
            }
            _this.$logger.trace("Application %s has been uninstalled successfully.", applicationId);
        }).future()();
    };
    IOSApplicationManager.prototype.reinstallApplication = function (applicationId, packageFilePath) {
        var _this = this;
        return (function () {
            _this.uninstallApplication(applicationId).wait();
            _this.installApplication(packageFilePath).wait();
        }).future()();
    };
    IOSApplicationManager.prototype.startApplication = function (applicationId) {
        var _this = this;
        return (function () {
            if (_this.$hostInfo.isWindows && !_this.$staticConfig.enableDeviceRunCommandOnWindows) {
                _this.$errors.fail("$%s device run command is not supported on Windows for iOS devices.", _this.$staticConfig.CLIENT_NAME.toLowerCase());
            }
            _this.validateApplicationId(applicationId);
            _this.device.mountImage().wait();
            _this.runApplicationCore(applicationId).wait();
            _this.$logger.info("Successfully run application " + applicationId + " on device with ID " + _this.device.deviceInfo.identifier + ".");
        }).future()();
    };
    IOSApplicationManager.prototype.stopApplication = function (applicationId) {
        var application = this.getApplicationById(applicationId);
        var gdbServer = this.createGdbServer();
        return gdbServer.kill([("" + application.Path)]);
    };
    IOSApplicationManager.prototype.restartApplication = function (applicationId) {
        var _this = this;
        return (function () {
            _this.stopApplication(applicationId).wait();
            _this.runApplicationCore(applicationId).wait();
        }).future()();
    };
    IOSApplicationManager.prototype.lookupApplications = function () {
        var _this = this;
        var func = function () {
            var dictionaryPointer = ref.alloc(ios_core_1.CoreTypes.cfDictionaryRef);
            var result = _this.$mobileDevice.deviceLookupApplications(_this.devicePointer, 0, dictionaryPointer);
            if (result) {
                _this.$errors.fail("Invalid result code %s from device lookup applications.", result);
            }
            var cfDictionary = dictionaryPointer.deref();
            var jsDictionary = _this.$coreFoundation.cfTypeTo(cfDictionary);
            return jsDictionary;
        };
        return this.device.tryExecuteFunction(func);
    };
    IOSApplicationManager.prototype.validateApplicationId = function (applicationId) {
        var applications = this.lookupApplications();
        var application = applications[applicationId];
        if (!application) {
            var sortedKeys = _.sortBy(_.keys(applications));
            this.$errors.failWithoutHelp("Invalid application id: %s. All available application ids are: %s%s ", applicationId, os.EOL, sortedKeys.join(os.EOL));
        }
        return application;
    };
    IOSApplicationManager.prototype.runApplicationCore = function (applicationId) {
        if (this._gdbServer) {
            this._gdbServer.destroy();
            this._gdbServer = null;
        }
        var application = this.getApplicationById(applicationId);
        var gdbServer = this.createGdbServer();
        return gdbServer.run([("" + application.Path)]);
    };
    IOSApplicationManager.prototype.createGdbServer = function () {
        if (!this._gdbServer) {
            var service = this.device.startService(iOSProxyServices.MobileServices.DEBUG_SERVER);
            var socket = this.$hostInfo.isWindows ? service : new net.Socket({ fd: service });
            this._gdbServer = this.$injector.resolve(ios_core_1.GDBServer, { socket: socket });
        }
        return this._gdbServer;
    };
    IOSApplicationManager.prototype.getApplicationById = function (applicationId) {
        return this.validateApplicationId(applicationId);
    };
    return IOSApplicationManager;
})();
exports.IOSApplicationManager = IOSApplicationManager;
