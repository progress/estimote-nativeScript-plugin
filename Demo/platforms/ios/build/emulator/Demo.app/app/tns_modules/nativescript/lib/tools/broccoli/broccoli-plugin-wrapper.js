///<reference path="../../.d.ts"/>
"use strict";
var tree_differ_1 = require('./tree-differ');
var BroccoliPluginWrapper = (function () {
    function BroccoliPluginWrapper(pluginClass, wrappedPluginArguments) {
        this.pluginClass = pluginClass;
        this.wrappedPlugin = null;
        this.inputTree = null;
        this.description = null;
        this.absoluteOutputPath = null;
        this.treeRootDirName = null;
        this.projectDir = null;
        this.$injector = null;
        this.inputPath = null;
        this.cachePath = null;
        this.outputPath = null;
        this.inputTree = wrappedPluginArguments[0];
        this.description = this.pluginClass.name;
        this.absoluteOutputPath = wrappedPluginArguments[1];
        this.treeRootDirName = wrappedPluginArguments[2];
        this.projectDir = wrappedPluginArguments[3];
        this.$injector = $injector.resolve("injector");
    }
    BroccoliPluginWrapper.prototype.rebuild = function () {
        try {
            this.init();
            var diffResult = this.treeDiffer.diffTree(this.absoluteOutputPath, this.treeRootDirName);
            this.wrappedPlugin.rebuild(diffResult);
        }
        catch (e) {
            e.message = "[" + this.description + "]: " + e.message;
            throw e;
        }
    };
    BroccoliPluginWrapper.prototype.init = function () {
        this.treeDiffer = new tree_differ_1.TreeDiffer(this.inputPath);
        this.wrappedPlugin = this.$injector.resolve(this.pluginClass, { inputPath: this.inputPath,
            cachePath: this.cachePath,
            outputRoot: this.absoluteOutputPath,
            projectDir: this.projectDir });
    };
    BroccoliPluginWrapper.prototype.cleanup = function () {
        if (this.wrappedPlugin.cleanup) {
            this.wrappedPlugin.cleanup();
        }
    };
    return BroccoliPluginWrapper;
})();
exports.BroccoliPluginWrapper = BroccoliPluginWrapper;
