///<reference path="../.d.ts"/>
"use strict";
var yok_1 = require("../../yok");
var assert = require("assert");
var Future = require("fibers/future");
var sys_info_base_1 = require("../../sys-info-base");
var temp = require("temp");
var fs_1 = require("fs");
var path = require("path");
temp.track();
var toolsPackageJsonDir = temp.mkdirSync("dirWithPackageJson");
var toolsPackageJson = path.join(toolsPackageJsonDir, "package.json");
fs_1.writeFileSync(toolsPackageJson, '{ "name": "unit-testing-doctor-service", "version": "1.0.0" }');
function getResultFromChildProcess(childProcessResultDescription) {
    if (childProcessResultDescription.shouldThrowError) {
        throw new Error("This one throws error.");
    }
    return childProcessResultDescription.result;
}
function createChildProcessResults(childProcessResult) {
    return {
        "uname -a": childProcessResult.uname,
        "npm -v": childProcessResult.npmV,
        "java": childProcessResult.javaVersion,
        '"javac" -version': childProcessResult.javacVersion,
        "node-gyp -v": childProcessResult.nodeGypVersion,
        "xcodebuild -version": childProcessResult.xCodeVersion,
        "pod --version": childProcessResult.podVersion,
        '"adb" version': childProcessResult.adbVersion,
        "'adb' version": childProcessResult.adbVersion,
        'android': childProcessResult.androidInstalled,
        "mono --version": childProcessResult.monoVersion,
        "git --version": childProcessResult.gitVersion,
        "gradle -v": childProcessResult.gradleVersion
    };
}
function createTestInjector(childProcessResult, hostInfoData, itunesError) {
    var injector = new yok_1.Yok();
    var childProcessResultDictionary = createChildProcessResults(childProcessResult);
    injector.register("childProcess", {
        exec: function (command, options, execOptions) {
            return (function () {
                return getResultFromChildProcess(childProcessResultDictionary[command]);
            }).future()();
        },
        spawnFromEvent: function (command, args, event) {
            return (function () {
                return getResultFromChildProcess(childProcessResultDictionary[command]);
            }).future()();
        }
    });
    injector.register("hostInfo", {
        dotNetVersion: function () { return Future.fromResult(hostInfoData.dotNetVersion); },
        isWindows: hostInfoData.isWindows,
        isDarwin: hostInfoData.isDarwin
    });
    injector.register("iTunesValidator", {
        getError: function () { return Future.fromResult(itunesError); }
    });
    injector.register("logger", {
        trace: function (formatStr) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
        }
    });
    injector.register("winreg", {
        getRegistryValue: function (valueName, hive, key, host) { return { value: "registryKey" }; },
        registryKeys: {
            HKLM: "HKLM"
        }
    });
    injector.register("sysInfoBase", sys_info_base_1.SysInfoBase);
    return injector;
}
describe("sysInfoBase", function () {
    var originalJavaHome = process.env.JAVA_HOME;
    process.env.JAVA_HOME = '';
    after(function () { return process.env.JAVA_HOME = originalJavaHome; });
    var childProcessResult, testInjector, sysInfoBase;
    beforeEach(function () {
        childProcessResult = {
            uname: { result: "name" },
            npmV: { result: "2.14.1" },
            javaVersion: { result: { stderr: 'java version "1.8.0_60"' } },
            javacVersion: { result: { stderr: 'javac 1.8.0_60' } },
            nodeGypVersion: { result: "2.0.0" },
            xCodeVersion: { result: "6.4.0" },
            adbVersion: { result: "Android Debug Bridge version 1.0.32" },
            androidInstalled: { result: { stdout: "android" } },
            monoVersion: { result: "version 1.0.6 " },
            gradleVersion: { result: "Gradle 2.8" },
            gitVersion: { result: "git version 1.9.5" },
            podVersion: { result: "0.38.2" },
        };
        testInjector = null;
        sysInfoBase = null;
    });
    describe("getSysInfo", function () {
        describe("returns correct results when everything is installed", function () {
            var assertCommonValues = function (result) {
                assert.deepEqual(result.npmVer, childProcessResult.npmV.result);
                assert.deepEqual(result.javaVer, "1.8.0");
                assert.deepEqual(result.javacVersion, "1.8.0_60");
                assert.deepEqual(result.nodeGypVer, childProcessResult.nodeGypVersion.result);
                assert.deepEqual(result.adbVer, childProcessResult.adbVersion.result);
                assert.deepEqual(result.androidInstalled, true);
                assert.deepEqual(result.monoVer, "1.0.6");
                assert.deepEqual(result.gradleVer, "2.8");
                assert.deepEqual(result.gitVer, "1.9.5");
            };
            it("on Windows", function () {
                testInjector = createTestInjector(childProcessResult, { isWindows: true, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assertCommonValues(result);
                assert.deepEqual(result.xcodeVer, null);
                assert.deepEqual(result.cocoapodVer, null);
            });
            it("on Mac", function () {
                testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: true, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assertCommonValues(result);
                assert.deepEqual(result.xcodeVer, childProcessResult.xCodeVersion.result);
                assert.deepEqual(result.cocoapodVer, childProcessResult.podVersion.result);
            });
            it("on Linux", function () {
                testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assertCommonValues(result);
                assert.deepEqual(result.xcodeVer, null);
                assert.deepEqual(result.cocoapodVer, null);
            });
        });
        describe("cocoapods version", function () {
            it("is null when cocoapods are not installed", function () {
                childProcessResult.podVersion = { shouldThrowError: true };
                testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: true, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assert.deepEqual(result.cocoapodVer, null);
            });
            it("is null when OS is not Mac", function () {
                testInjector = createTestInjector(childProcessResult, { isWindows: true, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assert.deepEqual(result.cocoapodVer, null);
            });
            it("is correct when cocoapods output has warning after version output", function () {
                childProcessResult.podVersion = { result: "0.38.2\nWARNING:\n" };
                testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: true, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assert.deepEqual(result.cocoapodVer, "0.38.2");
            });
            it("is correct when cocoapods output has warnings before version output", function () {
                childProcessResult.podVersion = { result: "WARNING\nWARNING2\n0.38.2" };
                testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: true, dotNetVersion: "4.5.1" }, null);
                sysInfoBase = testInjector.resolve("sysInfoBase");
                var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                assert.deepEqual(result.cocoapodVer, "0.38.2");
            });
        });
        describe("returns correct results when exceptions are raised during sysInfo data collection", function () {
            beforeEach(function () {
                childProcessResult = {
                    uname: { shouldThrowError: true },
                    npmV: { shouldThrowError: true },
                    javaVersion: { shouldThrowError: true },
                    javacVersion: { shouldThrowError: true },
                    nodeGypVersion: { shouldThrowError: true },
                    xCodeVersion: { shouldThrowError: true },
                    adbVersion: { shouldThrowError: true },
                    androidInstalled: { shouldThrowError: true },
                    monoVersion: { shouldThrowError: true },
                    gradleVersion: { shouldThrowError: true },
                    gitVersion: { shouldThrowError: true },
                    podVersion: { shouldThrowError: true },
                };
            });
            describe("when android info is incorrect", function () {
                it("pathToAdb and pathToAndroid are null", function () {
                    childProcessResult.adbVersion = {
                        result: null
                    };
                    childProcessResult.androidInstalled = {
                        result: false
                    };
                    testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                    sysInfoBase = testInjector.resolve("sysInfoBase");
                    var result = sysInfoBase.getSysInfo(toolsPackageJson, { pathToAdb: null, pathToAndroid: null }).wait();
                    assert.deepEqual(result.adbVer, null);
                    assert.deepEqual(result.androidInstalled, false);
                });
            });
            describe("when all of calls throw", function () {
                var assertAllValuesAreNull = function () {
                    sysInfoBase = testInjector.resolve("sysInfoBase");
                    var result = sysInfoBase.getSysInfo(toolsPackageJson).wait();
                    assert.deepEqual(result.npmVer, null);
                    assert.deepEqual(result.javaVer, null);
                    assert.deepEqual(result.javacVersion, null);
                    assert.deepEqual(result.nodeGypVer, null);
                    assert.deepEqual(result.xcodeVer, null);
                    assert.deepEqual(result.adbVer, null);
                    assert.deepEqual(result.androidInstalled, false);
                    assert.deepEqual(result.monoVer, null);
                    assert.deepEqual(result.gradleVer, null);
                    assert.deepEqual(result.gitVer, null);
                    assert.deepEqual(result.cocoapodVer, null);
                };
                it("on Windows", function () {
                    testInjector = createTestInjector(childProcessResult, { isWindows: true, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                    assertAllValuesAreNull();
                });
                it("on Mac", function () {
                    testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: true, dotNetVersion: "4.5.1" }, null);
                    assertAllValuesAreNull();
                });
                it("on Linux", function () {
                    testInjector = createTestInjector(childProcessResult, { isWindows: false, isDarwin: false, dotNetVersion: "4.5.1" }, null);
                    assertAllValuesAreNull();
                });
            });
        });
    });
});
