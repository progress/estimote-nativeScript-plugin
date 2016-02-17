///<reference path="../.d.ts"/>
"use strict";
var AnalyticsSettingsService = (function () {
    function AnalyticsSettingsService($userSettingsService, $staticConfig) {
        this.$userSettingsService = $userSettingsService;
        this.$staticConfig = $staticConfig;
    }
    AnalyticsSettingsService.prototype.canDoRequest = function () {
        return (function () { return true; }).future()();
    };
    AnalyticsSettingsService.prototype.getUserId = function () {
        return this.$userSettingsService.getSettingValue(this.$staticConfig.ANALYTICS_INSTALLATION_ID_SETTING_NAME);
    };
    AnalyticsSettingsService.prototype.getClientName = function () {
        return "" + this.$staticConfig.CLIENT_NAME_ALIAS.cyan.bold;
    };
    AnalyticsSettingsService.prototype.getPrivacyPolicyLink = function () {
        return "http://www.telerik.com/company/privacy-policy";
    };
    return AnalyticsSettingsService;
})();
$injector.register("analyticsSettingsService", AnalyticsSettingsService);
