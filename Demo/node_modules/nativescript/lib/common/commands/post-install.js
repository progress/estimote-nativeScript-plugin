///<reference path="../.d.ts"/>
"use strict";
var PostInstallCommand = (function () {
    function PostInstallCommand($fs, $staticConfig, $commandsService, $htmlHelpService, $options, $doctorService) {
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
        this.$commandsService = $commandsService;
        this.$htmlHelpService = $htmlHelpService;
        this.$options = $options;
        this.$doctorService = $doctorService;
        this.disableAnalytics = true;
        this.allowedParameters = [];
    }
    PostInstallCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            if (process.platform !== "win32") {
                if (process.env.SUDO_USER) {
                    _this.$fs.setCurrentUserAsOwner(_this.$options.profileDir, process.env.SUDO_USER).wait();
                }
            }
            _this.$htmlHelpService.generateHtmlPages().wait();
            _this.$doctorService.printWarnings();
            _this.$commandsService.tryExecuteCommand("autocomplete", []).wait();
        }).future()();
    };
    return PostInstallCommand;
})();
exports.PostInstallCommand = PostInstallCommand;
$injector.registerCommand("dev-post-install", PostInstallCommand);
