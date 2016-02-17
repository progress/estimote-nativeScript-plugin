///<reference path="../.d.ts"/>
"use strict";
var yok_1 = require("../../yok");
var path = require("path");
var temp = require("temp");
var hostInfoLib = require("../../host-info");
var chai_1 = require("chai");
var fileSystemFile = require("../../file-system");
var childProcessLib = require("../../child-process");
var stubs_1 = require("./stubs");
var sampleZipFileTest = path.join(__dirname, "../resources/sampleZipFileTest.zip");
var unzippedFileName = "sampleZipFileTest.txt";
var sampleZipFileTestIncorrectName = path.join(__dirname, "../resources/sampleZipfileTest.zip");
function isOsCaseSensitive(testInjector) {
    var hostInfo = testInjector.resolve("hostInfo");
    return hostInfo.isLinux;
}
;
temp.track();
function createTestInjector() {
    var testInjector = new yok_1.Yok();
    testInjector.register("fs", fileSystemFile.FileSystem);
    testInjector.register("errors", {
        fail: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            throw new Error(args[0]);
        }
    });
    testInjector.register("logger", stubs_1.CommonLoggerStub);
    testInjector.register("childProcess", childProcessLib.ChildProcess);
    testInjector.register("staticConfig", {
        disableAnalytics: true
    });
    testInjector.register("hostInfo", hostInfoLib.HostInfo);
    testInjector.register("injector", testInjector);
    return testInjector;
}
describe("FileSystem", function () {
    describe("unzip", function () {
        describe("overwriting files tests", function () {
            var testInjector, tempDir, fs, file, msg = "data";
            beforeEach(function () {
                testInjector = createTestInjector();
                tempDir = temp.mkdirSync("projectToUnzip");
                fs = testInjector.resolve("fs");
                file = path.join(tempDir, unzippedFileName);
                fs.writeFile(file, msg).wait();
            });
            it("does not overwrite files when overwriteExisitingFiles is false", function () {
                fs.unzip(sampleZipFileTest, tempDir, { overwriteExisitingFiles: false }, [unzippedFileName]).wait();
                var data = fs.readFile(file).wait();
                chai_1.assert.strictEqual(msg, data.toString(), "When overwriteExistingFiles is false, we should not ovewrite files.");
            });
            it("overwrites files when overwriteExisitingFiles is true", function () {
                fs.unzip(sampleZipFileTest, tempDir, { overwriteExisitingFiles: true }, [unzippedFileName]).wait();
                var data = fs.readFile(file).wait();
                chai_1.assert.notEqual(msg, data.toString(), "We must overwrite files when overwriteExisitingFiles is true.");
            });
            it("overwrites files when overwriteExisitingFiles is not set", function () {
                fs.unzip(sampleZipFileTest, tempDir, {}, [unzippedFileName]).wait();
                var data = fs.readFile(file).wait();
                chai_1.assert.notEqual(msg, data.toString(), "We must overwrite files when overwriteExisitingFiles is not set.");
            });
            it("overwrites files when options is not set", function () {
                fs.unzip(sampleZipFileTest, tempDir, undefined, [unzippedFileName]).wait();
                var data = fs.readFile(file).wait();
                chai_1.assert.notEqual(msg, data.toString(), "We must overwrite files when options is not defined.");
            });
        });
        describe("case sensitive tests", function () {
            it("is case sensitive when options is not defined", function () {
                var testInjector = createTestInjector();
                var tempDir = temp.mkdirSync("projectToUnzip");
                var fs = testInjector.resolve("fs");
                if (isOsCaseSensitive(testInjector)) {
                    chai_1.assert.throws(function () { return fs.unzip(sampleZipFileTestIncorrectName, tempDir, undefined, [unzippedFileName]).wait(); });
                }
            });
            it("is case sensitive when caseSensitive option is not defined", function () {
                var testInjector = createTestInjector();
                var tempDir = temp.mkdirSync("projectToUnzip");
                var fs = testInjector.resolve("fs");
                if (isOsCaseSensitive(testInjector)) {
                    chai_1.assert.throws(function () { return fs.unzip(sampleZipFileTestIncorrectName, tempDir, {}, [unzippedFileName]).wait(); });
                }
            });
            it("is case sensitive when caseSensitive option is true", function () {
                var testInjector = createTestInjector();
                var tempDir = temp.mkdirSync("projectToUnzip");
                var fs = testInjector.resolve("fs");
                if (isOsCaseSensitive(testInjector)) {
                    chai_1.assert.throws(function () { return fs.unzip(sampleZipFileTestIncorrectName, tempDir, { caseSensitive: true }, [unzippedFileName]).wait(); });
                }
            });
            it("is case insensitive when caseSensitive option is false", function () {
                var testInjector = createTestInjector();
                var tempDir = temp.mkdirSync("projectToUnzip");
                var fs = testInjector.resolve("fs");
                var file = path.join(tempDir, unzippedFileName);
                fs.unzip(sampleZipFileTestIncorrectName, tempDir, { caseSensitive: false }, [unzippedFileName]).wait();
                fs.readFile(file).wait();
            });
        });
    });
    describe("renameIfExists", function () {
        it("returns true when file is renamed", function () {
            var testInjector = createTestInjector();
            var tempDir = temp.mkdirSync("renameIfExists");
            var testFileName = path.join(tempDir, "testRenameIfExistsMethod");
            var newFileName = path.join(tempDir, "newfilename");
            var fs = testInjector.resolve("fs");
            fs.writeFile(testFileName, "data").wait();
            var result = fs.renameIfExists(testFileName, newFileName).wait();
            chai_1.assert.isTrue(result, "On successfull rename, result must be true.");
            chai_1.assert.isTrue(fs.exists(newFileName).wait(), "Renamed file should exists.");
            chai_1.assert.isFalse(fs.exists(testFileName).wait(), "Original file should not exist.");
        });
        it("returns false when file does not exist", function () {
            var testInjector = createTestInjector();
            var fs = testInjector.resolve("fs");
            var newName = "tempDir2";
            var result = fs.renameIfExists("tempDir", newName).wait();
            chai_1.assert.isFalse(result, "When file does not exist, result must be false.");
            chai_1.assert.isFalse(fs.exists(newName).wait(), "New file should not exist.");
        });
    });
    describe("copyFile", function () {
        var testInjector, tempDir, testFileName, newFileName, fileContent = "data", fs;
        beforeEach(function () {
            testInjector = createTestInjector();
            tempDir = temp.mkdirSync("copyFile");
            testFileName = path.join(tempDir, "testCopyFile");
            newFileName = path.join(tempDir, "newfilename");
            fs = testInjector.resolve("fs");
            fs.writeFile(testFileName, fileContent).wait();
        });
        it("correctly copies file to the same directory", function () {
            fs.copyFile(testFileName, newFileName).wait();
            chai_1.assert.isTrue(fs.exists(newFileName).wait(), "Renamed file should exists.");
            chai_1.assert.isTrue(fs.exists(testFileName).wait(), "Original file should exist.");
            chai_1.assert.deepEqual(fs.getFsStats(testFileName).wait().size, fs.getFsStats(testFileName).wait().size, "Original file and copied file must have the same size.");
        });
        it("copies file to non-existent directory", function () {
            var newFileNameInSubDir = path.join(tempDir, "subDir", "newfilename");
            chai_1.assert.isFalse(fs.exists(newFileNameInSubDir).wait());
            fs.copyFile(testFileName, newFileNameInSubDir).wait();
            chai_1.assert.isTrue(fs.exists(newFileNameInSubDir).wait(), "Renamed file should exists.");
            chai_1.assert.isTrue(fs.exists(testFileName).wait(), "Original file should exist.");
            chai_1.assert.deepEqual(fs.getFsStats(testFileName).wait().size, fs.getFsStats(testFileName).wait().size, "Original file and copied file must have the same size.");
        });
        it("produces correct file when source and target file are the same", function () {
            var originalSize = fs.getFsStats(testFileName).wait().size;
            fs.copyFile(testFileName, testFileName).wait();
            chai_1.assert.isTrue(fs.exists(testFileName).wait(), "Original file should exist.");
            chai_1.assert.deepEqual(fs.getFsStats(testFileName).wait().size, originalSize, "Original file and copied file must have the same size.");
            chai_1.assert.deepEqual(fs.readText(testFileName).wait(), fileContent, "File content should not be changed.");
        });
    });
});
