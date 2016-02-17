///<reference path=".d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var sys_info_base_1 = require("./common/sys-info-base");
var path = require("path");
var SysInfo = (function (_super) {
    __extends(SysInfo, _super);
    function SysInfo($childProcess, $hostInfo, $iTunesValidator, $logger, $winreg, $androidToolsInfo) {
        _super.call(this, $childProcess, $hostInfo, $iTunesValidator, $logger, $winreg);
        this.$childProcess = $childProcess;
        this.$hostInfo = $hostInfo;
        this.$iTunesValidator = $iTunesValidator;
        this.$logger = $logger;
        this.$winreg = $winreg;
        this.$androidToolsInfo = $androidToolsInfo;
    }
    SysInfo.prototype.getSysInfo = function (pathToPackageJson, androidToolsInfo) {
        var _this = this;
        return (function () {
            var defaultAndroidToolsInfo = {
                pathToAdb: _this.$androidToolsInfo.getPathToAdbFromAndroidHome().wait(),
                pathToAndroid: _this.$androidToolsInfo.getPathToAndroidExecutable().wait()
            };
            return _super.prototype.getSysInfo.call(_this, pathToPackageJson || path.join(__dirname, "..", "package.json"), androidToolsInfo || defaultAndroidToolsInfo).wait();
        }).future()();
    };
    return SysInfo;
})(sys_info_base_1.SysInfoBase);
exports.SysInfo = SysInfo;
$injector.register("sysInfo", SysInfo);
