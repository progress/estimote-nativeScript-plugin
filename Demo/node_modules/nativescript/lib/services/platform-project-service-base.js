///<reference path="../.d.ts"/>
"use strict";
var PlatformProjectServiceBase = (function () {
    function PlatformProjectServiceBase($fs, $projectData, $projectDataService) {
        this.$fs = $fs;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
    }
    PlatformProjectServiceBase.prototype.getPluginPlatformsFolderPath = function (pluginData, platform) {
        return pluginData.pluginPlatformsFolderPath(platform);
    };
    PlatformProjectServiceBase.prototype.getAllNativeLibrariesForPlugin = function (pluginData, platform, filter) {
        var _this = this;
        return (function () {
            var pluginPlatformsFolderPath = _this.getPluginPlatformsFolderPath(pluginData, platform), nativeLibraries = [];
            if (pluginPlatformsFolderPath && _this.$fs.exists(pluginPlatformsFolderPath).wait()) {
                var platformsContents = _this.$fs.readDirectory(pluginPlatformsFolderPath).wait();
                nativeLibraries = _(platformsContents)
                    .filter(function (platformItemName) { return filter(platformItemName, pluginPlatformsFolderPath); })
                    .value();
            }
            return nativeLibraries;
        }).future()();
    };
    PlatformProjectServiceBase.prototype.getFrameworkVersion = function (runtimePackageName) {
        var _this = this;
        return (function () {
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var frameworkVersion = _this.$projectDataService.getValue(runtimePackageName).wait().version;
            return frameworkVersion;
        }).future()();
    };
    return PlatformProjectServiceBase;
})();
exports.PlatformProjectServiceBase = PlatformProjectServiceBase;
