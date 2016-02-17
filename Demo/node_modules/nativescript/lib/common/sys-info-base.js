///<reference path=".d.ts"/>
"use strict";
var os = require("os");
var osenv = require("osenv");
var path = require("path");
var helpers_1 = require("./helpers");
var SysInfoBase = (function () {
    function SysInfoBase($childProcess, $hostInfo, $iTunesValidator, $logger, $winreg) {
        this.$childProcess = $childProcess;
        this.$hostInfo = $hostInfo;
        this.$iTunesValidator = $iTunesValidator;
        this.$logger = $logger;
        this.$winreg = $winreg;
        this.monoVerRegExp = /version (\d+[.]\d+[.]\d+) /gm;
        this.sysInfoCache = undefined;
    }
    SysInfoBase.prototype.getSysInfo = function (pathToPackageJson, androidToolsInfo) {
        var _this = this;
        return (function () {
            if (!_this.sysInfoCache) {
                var res = Object.create(null);
                var procOutput;
                var packageJson = require(pathToPackageJson);
                res.procInfo = packageJson.name + "/" + packageJson.version;
                res.platform = os.platform();
                res.os = _this.$hostInfo.isWindows ? _this.winVer() : _this.unixVer();
                res.shell = osenv.shell();
                try {
                    res.dotNetVer = _this.$hostInfo.dotNetVersion().wait();
                }
                catch (err) {
                    res.dotNetVer = ".Net is not installed.";
                }
                res.procArch = process.arch;
                res.nodeVer = process.version;
                procOutput = _this.exec("npm -v");
                res.npmVer = procOutput ? procOutput.split("\n")[0] : null;
                try {
                    var output = _this.$childProcess.spawnFromEvent("java", ["-version"], "exit").wait().stderr;
                    res.javaVer = /(?:openjdk|java) version \"((?:\d+\.)+(?:\d+))/i.exec(output)[1];
                }
                catch (e) {
                    res.javaVer = null;
                }
                res.nodeGypVer = _this.exec("node-gyp -v");
                res.xcodeVer = _this.$hostInfo.isDarwin ? _this.exec("xcodebuild -version") : null;
                res.itunesInstalled = _this.$iTunesValidator.getError().wait() === null;
                res.cocoapodVer = _this.getCocoapodVersion();
                var pathToAdb = androidToolsInfo ? androidToolsInfo.pathToAdb : "adb";
                var pathToAndroid = androidToolsInfo ? androidToolsInfo.pathToAndroid : "android";
                if (!androidToolsInfo) {
                    _this.$logger.trace("'adb' and 'android' will be checked from PATH environment variable.");
                }
                procOutput = _this.exec(helpers_1.quoteString(pathToAdb) + " version");
                res.adbVer = procOutput ? procOutput.split(os.EOL)[0] : null;
                res.androidInstalled = _this.checkAndroid(pathToAndroid).wait();
                procOutput = _this.exec("mono --version");
                if (!!procOutput) {
                    var match = _this.monoVerRegExp.exec(procOutput);
                    res.monoVer = match ? match[1] : null;
                }
                else {
                    res.monoVer = null;
                }
                procOutput = _this.exec("git --version");
                res.gitVer = procOutput ? /^git version (.*)/.exec(procOutput)[1] : null;
                procOutput = _this.exec("gradle -v");
                res.gradleVer = procOutput ? /Gradle (.*)/i.exec(procOutput)[1] : null;
                res.javacVersion = _this.getJavaCompilerVersion().wait();
                _this.sysInfoCache = res;
            }
            return _this.sysInfoCache;
        }).future()();
    };
    SysInfoBase.prototype.exec = function (cmd, execOptions) {
        try {
            if (cmd) {
                return this.$childProcess.exec(cmd, null, execOptions).wait();
            }
        }
        catch (e) {
        }
        return null;
    };
    SysInfoBase.prototype.checkAndroid = function (pathToAndroid) {
        var _this = this;
        return (function () {
            var result = false;
            try {
                if (pathToAndroid) {
                    var androidChildProcess = _this.$childProcess.spawnFromEvent(pathToAndroid, ["-h"], "close", {}, { throwError: false }).wait();
                    result = androidChildProcess && androidChildProcess.stdout && _.contains(androidChildProcess.stdout, "android");
                }
            }
            catch (err) {
                _this.$logger.trace("Error while checking is " + pathToAndroid + " installed. Error is: " + err.messge);
            }
            return result;
        }).future()();
    };
    SysInfoBase.prototype.winVer = function () {
        try {
            return this.readRegistryValue("ProductName").wait() + " " +
                this.readRegistryValue("CurrentVersion").wait() + "." +
                this.readRegistryValue("CurrentBuild").wait();
        }
        catch (err) {
            this.$logger.trace(err);
        }
        return null;
    };
    SysInfoBase.prototype.readRegistryValue = function (valueName) {
        var _this = this;
        return (function () {
            return _this.$winreg.getRegistryValue(valueName, _this.$winreg.registryKeys.HKLM, '\\Software\\Microsoft\\Windows NT\\CurrentVersion').wait().value;
        }).future()();
    };
    SysInfoBase.prototype.unixVer = function () {
        return this.exec("uname -a");
    };
    SysInfoBase.prototype.getJavaCompilerVersion = function () {
        var _this = this;
        return (function () {
            var javaCompileExecutableName = "javac";
            var javaHome = process.env.JAVA_HOME;
            var pathToJavaCompilerExecutable = javaHome ? path.join(javaHome, "bin", javaCompileExecutableName) : javaCompileExecutableName;
            var output = _this.exec("\"" + pathToJavaCompilerExecutable + "\" -version", { showStderr: true });
            return output ? /javac (.*)/i.exec(output.stderr)[1] : null;
        }).future()();
    };
    SysInfoBase.prototype.getCocoapodVersion = function () {
        if (this.$hostInfo.isDarwin) {
            var cocoapodVersion = this.exec("pod --version");
            if (cocoapodVersion) {
                var cocoapodVersionMatch = cocoapodVersion.match(/^((?:\d+\.){2}\d+.*?)$/gm);
                if (cocoapodVersionMatch && cocoapodVersionMatch[0]) {
                    cocoapodVersion = cocoapodVersionMatch[0].trim();
                }
                return cocoapodVersion;
            }
        }
        return null;
    };
    return SysInfoBase;
})();
exports.SysInfoBase = SysInfoBase;
$injector.register("sysInfoBase", SysInfoBase);
