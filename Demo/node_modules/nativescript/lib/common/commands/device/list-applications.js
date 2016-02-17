///<reference path="../../.d.ts"/>
"use strict";
var os_1 = require("os");
var util = require("util");
var ListApplicationsCommand = (function () {
    function ListApplicationsCommand($devicesService, $logger, $options) {
        this.$devicesService = $devicesService;
        this.$logger = $logger;
        this.$options = $options;
        this.allowedParameters = [];
    }
    ListApplicationsCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$devicesService.initialize({ deviceId: _this.$options.device, skipInferPlatform: true }).wait();
            var output = [];
            var action = function (device) {
                return (function () {
                    var applications = device.applicationManager.getInstalledApplications().wait();
                    output.push(util.format("%s=====Installed applications on device with UDID '%s' are:", os_1.EOL, device.deviceInfo.identifier));
                    _.each(applications, function (applicationId) { return output.push(applicationId); });
                }).future()();
            };
            _this.$devicesService.execute(action).wait();
            _this.$logger.out(output.join(os_1.EOL));
        }).future()();
    };
    return ListApplicationsCommand;
})();
exports.ListApplicationsCommand = ListApplicationsCommand;
$injector.registerCommand("device|list-applications", ListApplicationsCommand);
