///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var ITunesValidator = (function () {
    function ITunesValidator($fs, $hostInfo) {
        this.$fs = $fs;
        this.$hostInfo = $hostInfo;
    }
    ITunesValidator.prototype.getError = function () {
        var _this = this;
        return (function () {
            if (_this.$hostInfo.isWindows) {
                var commonProgramFiles = "";
                var isNode64 = process.arch === "x64";
                if (isNode64) {
                    commonProgramFiles = process.env.CommonProgramFiles;
                    if (_this.isiTunesInstalledOnWindows(process.env["CommonProgramFiles(x86)"]).wait() && !_this.isiTunesInstalledOnWindows(commonProgramFiles).wait()) {
                        return ITunesValidator.BITNESS_MISMATCH_ERROR_MESSAGE;
                    }
                }
                else {
                    if (_this.$hostInfo.isWindows32) {
                        commonProgramFiles = process.env.CommonProgramFiles;
                    }
                    else {
                        commonProgramFiles = process.env["CommonProgramFiles(x86)"];
                        if (_this.isiTunesInstalledOnWindows(process.env.CommonProgramFiles).wait() && !_this.isiTunesInstalledOnWindows(commonProgramFiles).wait()) {
                            return ITunesValidator.BITNESS_MISMATCH_ERROR_MESSAGE;
                        }
                    }
                }
                if (!_this.isiTunesInstalledOnWindows(commonProgramFiles).wait()) {
                    return ITunesValidator.NOT_INSTALLED_iTUNES_ERROR_MESSAGE;
                }
                return null;
            }
            else if (_this.$hostInfo.isDarwin) {
                var coreFoundationDir = "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation";
                var mobileDeviceDir = "/System/Library/PrivateFrameworks/MobileDevice.framework/MobileDevice";
                if (!_this.isiTunesInstalledCore(coreFoundationDir, mobileDeviceDir).wait()) {
                    return ITunesValidator.NOT_INSTALLED_iTUNES_ERROR_MESSAGE;
                }
                return null;
            }
            return ITunesValidator.UNSUPPORTED_OS_ERROR_MESSAGE;
        }).future()();
    };
    ITunesValidator.prototype.isiTunesInstalledOnWindows = function (commonProgramFiles) {
        var coreFoundationDir = path.join(commonProgramFiles, "Apple", "Apple Application Support");
        var mobileDeviceDir = path.join(commonProgramFiles, "Apple", "Mobile Device Support");
        return this.isiTunesInstalledCore(coreFoundationDir, mobileDeviceDir);
    };
    ITunesValidator.prototype.isiTunesInstalledCore = function (coreFoundationDir, mobileDeviceDir) {
        var _this = this;
        return (function () {
            return _this.$fs.exists(coreFoundationDir).wait() && _this.$fs.exists(mobileDeviceDir).wait();
        }).future()();
    };
    ITunesValidator.NOT_INSTALLED_iTUNES_ERROR_MESSAGE = "iTunes is not installed. Install it on your system and run this command again.";
    ITunesValidator.BITNESS_MISMATCH_ERROR_MESSAGE = "The bitness of Node.js and iTunes must match. Verify that both Node.js and iTunes are 32-bit or 64-bit and try again.";
    ITunesValidator.UNSUPPORTED_OS_ERROR_MESSAGE = "iTunes is not available for this operating system. You will not be able to work with connected iOS devices.";
    return ITunesValidator;
})();
exports.ITunesValidator = ITunesValidator;
$injector.register("iTunesValidator", ITunesValidator);
