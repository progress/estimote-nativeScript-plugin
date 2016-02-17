///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var bplistParser = require("bplist-parser");
var BPlistParser = (function () {
    function BPlistParser() {
    }
    BPlistParser.prototype.parseFile = function (plistFilePath) {
        var future = new Future();
        bplistParser.parseFile(plistFilePath, function (err, obj) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(obj);
            }
        });
        return future;
    };
    return BPlistParser;
})();
exports.BPlistParser = BPlistParser;
$injector.register("bplistParser", BPlistParser);
