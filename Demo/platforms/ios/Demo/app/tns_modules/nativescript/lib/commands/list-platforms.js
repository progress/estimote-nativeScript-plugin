///<reference path="../.d.ts"/>
"use strict";
var helpers = require("../common/helpers");
var ListPlatformsCommand = (function () {
    function ListPlatformsCommand($platformService, $logger) {
        this.$platformService = $platformService;
        this.$logger = $logger;
        this.allowedParameters = [];
    }
    ListPlatformsCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var installedPlatforms = _this.$platformService.getInstalledPlatforms().wait();
            if (installedPlatforms.length > 0) {
                var preparedPlatforms = _this.$platformService.getPreparedPlatforms().wait();
                if (preparedPlatforms.length > 0) {
                    _this.$logger.out("The project is prepared for: ", helpers.formatListOfNames(preparedPlatforms, "and"));
                }
                else {
                    _this.$logger.out("The project is not prepared for any platform");
                }
                _this.$logger.out("Installed platforms: ", helpers.formatListOfNames(installedPlatforms, "and"));
            }
            else {
                var formattedPlatformsList = helpers.formatListOfNames(_this.$platformService.getAvailablePlatforms().wait(), "and");
                _this.$logger.out("Available platforms for this OS: ", formattedPlatformsList);
                _this.$logger.out("No installed platforms found. Use $ tns platform add");
            }
        }).future()();
    };
    return ListPlatformsCommand;
})();
exports.ListPlatformsCommand = ListPlatformsCommand;
$injector.registerCommand("platform|*list", ListPlatformsCommand);
