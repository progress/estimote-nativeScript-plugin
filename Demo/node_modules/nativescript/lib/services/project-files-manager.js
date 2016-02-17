///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var util = require("util");
var ProjectFilesManager = (function () {
    function ProjectFilesManager($fs, $platformsData) {
        this.$fs = $fs;
        this.$platformsData = $platformsData;
    }
    ProjectFilesManager.prototype.processPlatformSpecificFiles = function (directoryPath, platform, excludedDirs) {
        var _this = this;
        return (function () {
            var contents = _this.$fs.readDirectory(directoryPath).wait();
            var files = [];
            _.each(contents, function (fileName) {
                var filePath = path.join(directoryPath, fileName);
                var fsStat = _this.$fs.getFsStats(filePath).wait();
                if (fsStat.isDirectory() && !_.contains(excludedDirs, fileName)) {
                    _this.processPlatformSpecificFilesCore(platform, _this.$fs.enumerateFilesInDirectorySync(filePath)).wait();
                }
                else if (fsStat.isFile()) {
                    files.push(filePath);
                }
            });
            _this.processPlatformSpecificFilesCore(platform, files).wait();
        }).future()();
    };
    ProjectFilesManager.prototype.processPlatformSpecificFilesCore = function (platform, files) {
        var _this = this;
        return (function () {
            _.each(files, function (fileName) {
                var platformInfo = ProjectFilesManager.parsePlatformSpecificFileName(path.basename(fileName), _this.$platformsData.platformsNames);
                var shouldExcludeFile = platformInfo && platformInfo.platform !== platform;
                if (shouldExcludeFile) {
                    _this.$fs.deleteFile(fileName).wait();
                }
                else if (platformInfo && platformInfo.onDeviceName) {
                    _this.$fs.rename(fileName, path.join(path.dirname(fileName), platformInfo.onDeviceName)).wait();
                }
            });
        }).future()();
    };
    ProjectFilesManager.parsePlatformSpecificFileName = function (fileName, platforms) {
        var regex = util.format("^(.+?)\\.(%s)(\\..+?)$", platforms.join("|"));
        var parsed = fileName.match(new RegExp(regex, "i"));
        if (parsed) {
            return {
                platform: parsed[2],
                onDeviceName: parsed[1] + parsed[3]
            };
        }
        return undefined;
    };
    return ProjectFilesManager;
})();
exports.ProjectFilesManager = ProjectFilesManager;
$injector.register("projectFilesManager", ProjectFilesManager);
