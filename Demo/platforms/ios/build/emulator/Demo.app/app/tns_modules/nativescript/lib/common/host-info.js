///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var HostInfo = (function () {
    function HostInfo($errors) {
        this.$errors = $errors;
    }
    Object.defineProperty(HostInfo.prototype, "isWindows", {
        get: function () {
            return process.platform === HostInfo.WIN32_NAME;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HostInfo.prototype, "isWindows64", {
        get: function () {
            return this.isWindows && (process.arch === "x64" || process.env.hasOwnProperty(HostInfo.PROCESSOR_ARCHITEW6432));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HostInfo.prototype, "isWindows32", {
        get: function () {
            return this.isWindows && !this.isWindows64;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HostInfo.prototype, "isDarwin", {
        get: function () {
            return process.platform === HostInfo.DARWIN_OS_NAME;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HostInfo.prototype, "isLinux", {
        get: function () {
            return process.platform === HostInfo.LINUX_OS_NAME;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HostInfo.prototype, "isLinux64", {
        get: function () {
            return this.isLinux && process.config.variables.host_arch === "x64";
        },
        enumerable: true,
        configurable: true
    });
    HostInfo.prototype.dotNetVersion = function () {
        if (this.isWindows) {
            var result = new Future();
            var Winreg = require("winreg");
            var regKey = new Winreg({
                hive: Winreg.HKLM,
                key: HostInfo.DOT_NET_REGISTRY_PATH
            });
            regKey.get("Version", function (err, value) {
                if (err) {
                    result.throw(err);
                }
                else {
                    result.return(value.value);
                }
            });
            return result;
        }
        else {
            return Future.fromResult(null);
        }
    };
    HostInfo.prototype.isDotNet40Installed = function (message) {
        var _this = this;
        return (function () {
            if (_this.isWindows) {
                try {
                    _this.dotNetVersion().wait();
                    return true;
                }
                catch (e) {
                    _this.$errors.failWithoutHelp(message || "An error occurred while reading the registry.");
                }
            }
            else {
                return false;
            }
        }).future()();
    };
    HostInfo.WIN32_NAME = "win32";
    HostInfo.PROCESSOR_ARCHITEW6432 = "PROCESSOR_ARCHITEW6432";
    HostInfo.DARWIN_OS_NAME = "darwin";
    HostInfo.LINUX_OS_NAME = "linux";
    HostInfo.DOT_NET_REGISTRY_PATH = "\\Software\\Microsoft\\NET Framework Setup\\NDP\\v4\\Client";
    return HostInfo;
})();
exports.HostInfo = HostInfo;
$injector.register("hostInfo", HostInfo);
