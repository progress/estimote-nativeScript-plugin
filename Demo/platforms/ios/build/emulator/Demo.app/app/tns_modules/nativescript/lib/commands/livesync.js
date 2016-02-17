///<reference path="../.d.ts"/>
"use strict";
var LivesyncCommand = (function () {
    function LivesyncCommand($logger, $usbLiveSyncService, $mobileHelper, $options, $errors) {
        this.$logger = $logger;
        this.$usbLiveSyncService = $usbLiveSyncService;
        this.$mobileHelper = $mobileHelper;
        this.$options = $options;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    LivesyncCommand.prototype.execute = function (args) {
        return this.$usbLiveSyncService.liveSync(args[0]);
    };
    LivesyncCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (args.length >= 2) {
                _this.$errors.fail("Invalid number of arguments.");
            }
            var platform = args[0];
            if (platform) {
                return _.contains(_this.$mobileHelper.platformNames, _this.$mobileHelper.normalizePlatformName(platform));
            }
            return true;
        }).future()();
    };
    return LivesyncCommand;
})();
exports.LivesyncCommand = LivesyncCommand;
$injector.registerCommand("livesync", LivesyncCommand);
