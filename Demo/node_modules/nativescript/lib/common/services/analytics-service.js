///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../helpers");
var os = require("os");
global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
global.XMLHttpRequest.prototype.withCredentials = false;
var AnalyticsService = (function () {
    function AnalyticsService($staticConfig, $logger, $errors, $prompter, $userSettingsService, $analyticsSettingsService, $options) {
        this.$staticConfig = $staticConfig;
        this.$logger = $logger;
        this.$errors = $errors;
        this.$prompter = $prompter;
        this.$userSettingsService = $userSettingsService;
        this.$analyticsSettingsService = $analyticsSettingsService;
        this.$options = $options;
        this.analyticsStatuses = {};
        this.isAnalyticsStatusesInitialized = false;
    }
    AnalyticsService.prototype.checkConsent = function () {
        var _this = this;
        return (function () {
            if (_this.$analyticsSettingsService.canDoRequest().wait()) {
                if (_this.isNotConfirmed(_this.$staticConfig.TRACK_FEATURE_USAGE_SETTING_NAME).wait() && helpers.isInteractive()) {
                    _this.$logger.out("Do you want to help us improve "
                        + _this.$analyticsSettingsService.getClientName()
                        + " by automatically sending anonymous usage statistics? We will not use this information to identify or contact you."
                        + " You can read our official Privacy Policy at");
                    var message = _this.$analyticsSettingsService.getPrivacyPolicyLink();
                    var trackFeatureUsage = _this.$prompter.confirm(message, function () { return true; }).wait();
                    _this.setStatus(_this.$staticConfig.TRACK_FEATURE_USAGE_SETTING_NAME, trackFeatureUsage).wait();
                }
                if (_this.isNotConfirmed(_this.$staticConfig.ERROR_REPORT_SETTING_NAME).wait()) {
                    _this.$logger.out("Error reporting will be enabled. You can disable it by running '$ " + _this.$staticConfig.CLIENT_NAME.toLowerCase() + " error-reporting disable'.");
                    _this.setStatus(_this.$staticConfig.ERROR_REPORT_SETTING_NAME, true).wait();
                }
            }
        }).future()();
    };
    AnalyticsService.prototype.trackFeature = function (featureName) {
        var category = this.$options.analyticsClient ||
            (helpers.isInteractive() ? "CLI" : "Non-interactive");
        return this.track(category, featureName);
    };
    AnalyticsService.prototype.track = function (featureName, featureValue) {
        var _this = this;
        return (function () {
            _this.initAnalyticsStatuses().wait();
            _this.$logger.trace("Trying to track feature '" + featureName + "' with value '" + featureValue + "'.");
            if (_this.analyticsStatuses[_this.$staticConfig.TRACK_FEATURE_USAGE_SETTING_NAME] !== AnalyticsStatus.disabled &&
                _this.$analyticsSettingsService.canDoRequest().wait()) {
                try {
                    _this.start().wait();
                    if (_this._eqatecMonitor) {
                        _this._eqatecMonitor.trackFeature(featureName + "." + featureValue);
                    }
                }
                catch (e) {
                    _this.$logger.trace("Analytics exception: '%s'", e.toString());
                }
            }
        }).future()();
    };
    AnalyticsService.prototype.trackException = function (exception, message) {
        var _this = this;
        return (function () {
            _this.initAnalyticsStatuses().wait();
            _this.$logger.trace("Trying to track exception with message '" + message + "'.");
            if (_this.analyticsStatuses[_this.$staticConfig.ERROR_REPORT_SETTING_NAME] !== AnalyticsStatus.disabled &&
                _this.$analyticsSettingsService.canDoRequest().wait()) {
                try {
                    _this.start().wait();
                    if (_this._eqatecMonitor) {
                        _this._eqatecMonitor.trackException(exception, message);
                    }
                }
                catch (e) {
                    _this.$logger.trace("Analytics exception: '%s'", e.toString());
                }
            }
        }).future()();
    };
    AnalyticsService.prototype.setStatus = function (settingName, enabled) {
        var _this = this;
        return (function () {
            _this.analyticsStatuses[settingName] = enabled ? AnalyticsStatus.enabled : AnalyticsStatus.disabled;
            _this.$userSettingsService.saveSetting(settingName, enabled.toString()).wait();
            if (_this.analyticsStatuses[settingName] === AnalyticsStatus.disabled
                && _this.analyticsStatuses[settingName] === AnalyticsStatus.disabled
                && _this._eqatecMonitor) {
                _this._eqatecMonitor.stop();
            }
        }).future()();
    };
    AnalyticsService.prototype.getStatus = function (settingName) {
        var _this = this;
        return (function () {
            if (!_this.analyticsStatuses[settingName]) {
                var settingValue = _this.$userSettingsService.getSettingValue(settingName).wait();
                if (settingValue) {
                    var isEnabled = helpers.toBoolean(settingValue);
                    if (isEnabled) {
                        _this.analyticsStatuses[settingName] = AnalyticsStatus.enabled;
                    }
                    else {
                        _this.analyticsStatuses[settingName] = AnalyticsStatus.disabled;
                    }
                }
                else {
                    _this.analyticsStatuses[settingName] = AnalyticsStatus.notConfirmed;
                }
            }
            return _this.analyticsStatuses[settingName];
        }).future()();
    };
    AnalyticsService.prototype.start = function () {
        var _this = this;
        return (function () {
            if (_this._eqatecMonitor || _this.isEverythingDisabled()) {
                return;
            }
            require("../vendor/EqatecMonitor");
            var settings = global._eqatec.createSettings(_this.$staticConfig.ANALYTICS_API_KEY);
            settings.useHttps = false;
            settings.userAgent = _this.getUserAgentString();
            settings.version = _this.$staticConfig.version;
            settings.loggingInterface = {
                logMessage: _this.$logger.trace.bind(_this.$logger),
                logError: _this.$logger.debug.bind(_this.$logger)
            };
            _this._eqatecMonitor = global._eqatec.createMonitor(settings);
            var guid = _this.$userSettingsService.getSettingValue(_this.$staticConfig.ANALYTICS_INSTALLATION_ID_SETTING_NAME).wait();
            if (!guid) {
                guid = helpers.createGUID(false);
                _this.$userSettingsService.saveSetting(_this.$staticConfig.ANALYTICS_INSTALLATION_ID_SETTING_NAME, guid).wait();
            }
            _this.$logger.trace("%s: %s", _this.$staticConfig.ANALYTICS_INSTALLATION_ID_SETTING_NAME, guid.toString());
            _this._eqatecMonitor.setInstallationID(guid);
            try {
                _this._eqatecMonitor.setUserID(_this.$analyticsSettingsService.getUserId().wait());
            }
            catch (e) {
            }
            _this._eqatecMonitor.start();
            _this.reportNodeVersion();
        }).future()();
    };
    AnalyticsService.prototype.reportNodeVersion = function () {
        var reportedVersion = process.version.slice(1).replace(/[.]/g, "_");
        this._eqatecMonitor.trackFeature("NodeJSVersion." + reportedVersion);
    };
    AnalyticsService.prototype.getUserAgentString = function () {
        var userAgentString;
        var osType = os.type();
        if (osType === "Windows_NT") {
            userAgentString = "(Windows NT " + os.release() + ")";
        }
        else if (osType === "Darwin") {
            userAgentString = "(Mac OS X " + os.release() + ")";
        }
        else {
            userAgentString = "(" + osType + ")";
        }
        return userAgentString;
    };
    AnalyticsService.prototype.isEnabled = function (settingName) {
        var _this = this;
        return (function () {
            var analyticsStatus = _this.getStatus(settingName).wait();
            return analyticsStatus === AnalyticsStatus.enabled;
        }).future()();
    };
    AnalyticsService.prototype.isNotConfirmed = function (settingName) {
        var _this = this;
        return (function () {
            var analyticsStatus = _this.getStatus(settingName).wait();
            return analyticsStatus === AnalyticsStatus.notConfirmed;
        }).future()();
    };
    AnalyticsService.prototype.getStatusMessage = function (settingName, jsonFormat, readableSettingName) {
        if (jsonFormat) {
            return this.getJsonStatusMessage(settingName);
        }
        return this.getHumanReadableStatusMessage(settingName, readableSettingName);
    };
    AnalyticsService.prototype.getHumanReadableStatusMessage = function (settingName, readableSettingName) {
        var _this = this;
        return (function () {
            var status = null;
            if (_this.isNotConfirmed(settingName).wait()) {
                status = "disabled until confirmed";
            }
            else {
                status = AnalyticsStatus[_this.getStatus(settingName).wait()];
            }
            return readableSettingName + " is " + status + ".";
        }).future()();
    };
    AnalyticsService.prototype.getJsonStatusMessage = function (settingName) {
        var _this = this;
        return (function () {
            var status = _this.getStatus(settingName).wait();
            var enabled = status === AnalyticsStatus.notConfirmed ? null : status === AnalyticsStatus.disabled ? false : true;
            return JSON.stringify({ enabled: enabled });
        }).future()();
    };
    AnalyticsService.prototype.isEverythingDisabled = function () {
        var statuses = _(this.analyticsStatuses)
            .values()
            .groupBy(function (p) { return _.identity(p); })
            .keys()
            .value();
        return statuses.length === 1 && _.first(statuses) === AnalyticsStatus.disabled.toString();
    };
    AnalyticsService.prototype.initAnalyticsStatuses = function () {
        var _this = this;
        return (function () {
            if (_this.$analyticsSettingsService.canDoRequest().wait()) {
                if (!_this.isAnalyticsStatusesInitialized) {
                    _this.$logger.trace("Initializing analytics statuses.");
                    var settingsNames = [_this.$staticConfig.TRACK_FEATURE_USAGE_SETTING_NAME, _this.$staticConfig.ERROR_REPORT_SETTING_NAME];
                    settingsNames.forEach(function (settingName) { return _this.getStatus(settingName).wait(); });
                    _this.isAnalyticsStatusesInitialized = true;
                }
                _this.$logger.trace("Analytics statuses: ");
                _this.$logger.trace(_this.analyticsStatuses);
            }
        }).future()();
    };
    return AnalyticsService;
})();
exports.AnalyticsService = AnalyticsService;
$injector.register("analyticsService", AnalyticsService);
(function (AnalyticsStatus) {
    AnalyticsStatus[AnalyticsStatus["enabled"] = 0] = "enabled";
    AnalyticsStatus[AnalyticsStatus["disabled"] = 1] = "disabled";
    AnalyticsStatus[AnalyticsStatus["notConfirmed"] = 2] = "notConfirmed";
})(exports.AnalyticsStatus || (exports.AnalyticsStatus = {}));
var AnalyticsStatus = exports.AnalyticsStatus;
