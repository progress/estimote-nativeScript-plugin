///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AnalyticsCommand = (function () {
    function AnalyticsCommand($analyticsService, $logger, $errors, $options, $staticConfig, settingName, humanReadableSettingName) {
        this.$analyticsService = $analyticsService;
        this.$logger = $logger;
        this.$errors = $errors;
        this.$options = $options;
        this.$staticConfig = $staticConfig;
        this.settingName = settingName;
        this.humanReadableSettingName = humanReadableSettingName;
        this.allowedParameters = [new AnalyticsCommandParameter(this.$errors)];
        this.disableAnalyticsConsentCheck = true;
    }
    AnalyticsCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var arg = args[0] || "";
            switch (arg.toLowerCase()) {
                case "enable":
                    _this.$analyticsService.setStatus(_this.settingName, true).wait();
                    _this.$logger.info(_this.humanReadableSettingName + " is now enabled.");
                    break;
                case "disable":
                    _this.$analyticsService.setStatus(_this.settingName, false).wait();
                    _this.$logger.info(_this.humanReadableSettingName + " is now disabled.");
                    break;
                case "status":
                case "":
                    _this.$logger.out(_this.$analyticsService.getStatusMessage(_this.settingName, _this.$options.json, _this.humanReadableSettingName).wait());
                    break;
            }
        }).future()();
    };
    return AnalyticsCommand;
})();
var UsageReportingCommand = (function (_super) {
    __extends(UsageReportingCommand, _super);
    function UsageReportingCommand($analyticsService, $logger, $errors, $options, $staticConfig) {
        _super.call(this, $analyticsService, $logger, $errors, $options, $staticConfig, $staticConfig.TRACK_FEATURE_USAGE_SETTING_NAME, "Usage reporting");
    }
    return UsageReportingCommand;
})(AnalyticsCommand);
exports.UsageReportingCommand = UsageReportingCommand;
$injector.registerCommand("usage-reporting", UsageReportingCommand);
var ErrorReportingCommand = (function (_super) {
    __extends(ErrorReportingCommand, _super);
    function ErrorReportingCommand($analyticsService, $logger, $errors, $options, $staticConfig) {
        _super.call(this, $analyticsService, $logger, $errors, $options, $staticConfig, $staticConfig.ERROR_REPORT_SETTING_NAME, "Error reporting");
    }
    return ErrorReportingCommand;
})(AnalyticsCommand);
exports.ErrorReportingCommand = ErrorReportingCommand;
$injector.registerCommand("error-reporting", ErrorReportingCommand);
var AnalyticsCommandParameter = (function () {
    function AnalyticsCommandParameter($errors) {
        this.$errors = $errors;
        this.mandatory = false;
    }
    AnalyticsCommandParameter.prototype.validate = function (validationValue) {
        var _this = this;
        return (function () {
            var val = validationValue || "";
            switch (val.toLowerCase()) {
                case "enable":
                case "disable":
                case "status":
                case "":
                    return true;
                default:
                    _this.$errors.fail("The value '" + validationValue + "' is not valid. Valid values are 'enable', 'disable' and 'status'.");
            }
        }).future()();
    };
    return AnalyticsCommandParameter;
})();
exports.AnalyticsCommandParameter = AnalyticsCommandParameter;
