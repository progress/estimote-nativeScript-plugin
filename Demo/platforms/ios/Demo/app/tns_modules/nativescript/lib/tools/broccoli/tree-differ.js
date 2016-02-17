///<reference path="../../.d.ts"/>
"use strict";
var fs = require("fs");
var path = require("path");
var TreeDiffer = (function () {
    function TreeDiffer(rootPath) {
        this.rootPath = rootPath;
        this.rootDirName = path.basename(rootPath);
    }
    TreeDiffer.prototype.diffTree = function (absoluteOutputPath, treeRootDirName) {
        var rootDir = treeRootDirName ? path.join(this.rootPath, treeRootDirName) : this.rootPath;
        var result = this.dirtyCheckPath(absoluteOutputPath, rootDir);
        return result;
    };
    TreeDiffer.prototype.dirtyCheckPath = function (absoluteOutputPath, rootDir) {
        var result = new DirtyCheckingDiffResult();
        var cachedDirectories = fs.existsSync(rootDir) ? fs.readdirSync(rootDir) : [];
        var currentDirectories = fs.existsSync(absoluteOutputPath) ? fs.readdirSync(absoluteOutputPath) : [];
        result.changedDirectories = _.difference(cachedDirectories, currentDirectories);
        result.removedDirectories = _.difference(currentDirectories, cachedDirectories);
        return result;
    };
    return TreeDiffer;
})();
exports.TreeDiffer = TreeDiffer;
var DirtyCheckingDiffResult = (function () {
    function DirtyCheckingDiffResult() {
        this.changedDirectories = [];
        this.removedDirectories = [];
    }
    return DirtyCheckingDiffResult;
})();
