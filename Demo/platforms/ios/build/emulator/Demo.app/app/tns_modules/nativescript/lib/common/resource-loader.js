///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var ResourceLoader = (function () {
    function ResourceLoader($fs, $staticConfig) {
        this.$fs = $fs;
        this.$staticConfig = $staticConfig;
    }
    ResourceLoader.prototype.resolvePath = function (resourcePath) {
        return path.join(this.$staticConfig.RESOURCE_DIR_PATH, resourcePath);
    };
    ResourceLoader.prototype.openFile = function (resourcePath) {
        return this.$fs.createReadStream(this.resolvePath(resourcePath));
    };
    ResourceLoader.prototype.readText = function (resourcePath) {
        return this.$fs.readText(this.resolvePath(resourcePath));
    };
    ResourceLoader.prototype.readJson = function (resourcePath) {
        return this.$fs.readJson(this.resolvePath(resourcePath));
    };
    ResourceLoader.prototype.getPathToAppResources = function (framework) {
        return path.join(this.resolvePath(framework), this.$staticConfig.APP_RESOURCES_DIR_NAME);
    };
    return ResourceLoader;
})();
exports.ResourceLoader = ResourceLoader;
$injector.register("resources", ResourceLoader);
