///<reference path="../../../.d.ts"/>
"use strict";
var Funnel = require("broccoli-funnel");
var node_modules_dest_copy_1 = require("../node-modules-dest-copy");
var NodeModulesTree = (function () {
    function NodeModulesTree() {
    }
    NodeModulesTree.prototype.makeNodeModulesTree = function (absoluteOutputPath, projectDir) {
        var nodeModulesFunnel = new Funnel(projectDir, { include: ["node_modules/**"] });
        var result = node_modules_dest_copy_1.default(nodeModulesFunnel, absoluteOutputPath, "node_modules", projectDir);
        return result;
    };
    return NodeModulesTree;
})();
exports.NodeModulesTree = NodeModulesTree;
$injector.register("nodeModulesTree", NodeModulesTree);
