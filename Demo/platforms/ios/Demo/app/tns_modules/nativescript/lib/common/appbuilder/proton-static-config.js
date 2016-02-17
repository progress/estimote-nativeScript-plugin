///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var static_config_base_1 = require("../static-config-base");
var path = require("path");
var ProtonStaticConfig = (function (_super) {
    __extends(ProtonStaticConfig, _super);
    function ProtonStaticConfig($injector) {
        _super.call(this, $injector);
        this.START_PACKAGE_ACTIVITY_NAME = ".TelerikCallbackActivity";
        this.disableAnalytics = true;
    }
    ProtonStaticConfig.prototype.getAdbFilePath = function () {
        var _this = this;
        return (function () {
            var value = _super.prototype.getAdbFilePath.call(_this).wait();
            return value.replace("app.asar", "app.asar.unpacked");
        }).future()();
    };
    Object.defineProperty(ProtonStaticConfig.prototype, "PATH_TO_BOOTSTRAP", {
        get: function () {
            return path.join(__dirname, "proton-bootstrap");
        },
        enumerable: true,
        configurable: true
    });
    return ProtonStaticConfig;
})(static_config_base_1.StaticConfigBase);
exports.ProtonStaticConfig = ProtonStaticConfig;
$injector.register("staticConfig", ProtonStaticConfig);
