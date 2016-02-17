///<reference path=".d.ts"/>
"use strict";
var path = require("path");
var ConfigBase = (function () {
    function ConfigBase($fs) {
        this.$fs = $fs;
    }
    ConfigBase.prototype.loadConfig = function (name) {
        var configFileName = this.getConfigPath(name);
        return this.$fs.readJson(configFileName);
    };
    ConfigBase.prototype.getConfigPath = function (filename) {
        return path.join(__dirname, "../../config/", filename + ".json");
    };
    return ConfigBase;
})();
exports.ConfigBase = ConfigBase;
