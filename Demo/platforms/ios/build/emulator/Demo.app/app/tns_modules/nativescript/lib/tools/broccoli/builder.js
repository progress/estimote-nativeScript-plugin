///<reference path="../../.d.ts"/>
"use strict";
var constants = require("../../../lib/constants");
var path = require("path");
var Future = require("fibers/future");
var destCopyLib = require("./node-modules-dest-copy");
var gulp = require("gulp");
var vinylFilterSince = require("vinyl-filter-since");
var through = require("through2");
var Builder = (function () {
    function Builder($fs, $nodeModulesTree, $projectData, $projectDataService, $injector, $logger) {
        this.$fs = $fs;
        this.$nodeModulesTree = $nodeModulesTree;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
        this.$injector = $injector;
        this.$logger = $logger;
    }
    Builder.prototype.getChangedNodeModules = function (absoluteOutputPath, platform, lastModifiedTime) {
        var _this = this;
        return (function () {
            var projectDir = _this.$projectData.projectDir;
            var isNodeModulesModified = false;
            var nodeModulesPath = path.join(projectDir, constants.NODE_MODULES_FOLDER_NAME);
            var nodeModules = {};
            if (lastModifiedTime) {
                var pipeline = gulp.src(path.join(projectDir, "node_modules/**"))
                    .pipe(vinylFilterSince(lastModifiedTime))
                    .pipe(through.obj(function (chunk, enc, cb) {
                    if (chunk.path === nodeModulesPath) {
                        isNodeModulesModified = true;
                    }
                    if (!isNodeModulesModified) {
                        var rootModuleName = chunk.path.split(nodeModulesPath)[1].split(path.sep)[1];
                        var rootModuleFullPath = path.join(nodeModulesPath, rootModuleName);
                        nodeModules[rootModuleFullPath] = rootModuleFullPath;
                    }
                    cb(null);
                }))
                    .pipe(gulp.dest(absoluteOutputPath));
                var future = new Future();
                pipeline.on('end', function (err, data) {
                    if (err) {
                        future.throw(err);
                    }
                    else {
                        future.return();
                    }
                });
                future.wait();
            }
            if (isNodeModulesModified && _this.$fs.exists(absoluteOutputPath).wait()) {
                var currentPreparedTnsModules = _this.$fs.readDirectory(absoluteOutputPath).wait();
                var tnsModulesPath = path.join(projectDir, constants.APP_FOLDER_NAME, constants.TNS_MODULES_FOLDER_NAME);
                if (!_this.$fs.exists(tnsModulesPath).wait()) {
                    tnsModulesPath = path.join(projectDir, constants.NODE_MODULES_FOLDER_NAME, constants.TNS_CORE_MODULES_NAME);
                }
                var tnsModulesInApp = _this.$fs.readDirectory(tnsModulesPath).wait();
                var modulesToDelete = _.difference(currentPreparedTnsModules, tnsModulesInApp);
                _.each(modulesToDelete, function (moduleName) { return _this.$fs.deleteDirectory(path.join(absoluteOutputPath, moduleName)).wait(); });
            }
            if (!lastModifiedTime || isNodeModulesModified) {
                _this.listModules(nodeModulesPath, nodeModules);
            }
            return nodeModules;
        }).future()();
    };
    Builder.prototype.listModules = function (nodeModulesPath, nodeModules) {
        var _this = this;
        var nodeModulesDirectories = this.$fs.exists(nodeModulesPath).wait() ? this.$fs.readDirectory(nodeModulesPath).wait() : [];
        _.each(nodeModulesDirectories, function (nodeModuleDirectoryName) {
            var isNpmScope = /^@/.test(nodeModuleDirectoryName);
            var nodeModuleFullPath = path.join(nodeModulesPath, nodeModuleDirectoryName);
            if (isNpmScope) {
                _this.listModules(nodeModuleFullPath, nodeModules);
            }
            else {
                nodeModules[nodeModuleFullPath] = nodeModuleFullPath;
            }
        });
    };
    Builder.prototype.prepareNodeModules = function (absoluteOutputPath, platform, lastModifiedTime) {
        var _this = this;
        return (function () {
            var nodeModules = _this.getChangedNodeModules(absoluteOutputPath, platform, lastModifiedTime).wait();
            var destCopy = _this.$injector.resolve(destCopyLib.DestCopy, {
                inputPath: _this.$projectData.projectDir,
                cachePath: "",
                outputRoot: absoluteOutputPath,
                projectDir: _this.$projectData.projectDir,
                platform: platform
            });
            destCopy.rebuildChangedDirectories(_.keys(nodeModules), platform);
        }).future()();
    };
    return Builder;
})();
exports.Builder = Builder;
$injector.register("broccoliBuilder", Builder);
