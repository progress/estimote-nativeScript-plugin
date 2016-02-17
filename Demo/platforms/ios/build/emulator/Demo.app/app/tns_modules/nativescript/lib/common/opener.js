///<reference path=".d.ts"/>
"use strict";
var xopen = require("open");
var Opener = (function () {
    function Opener() {
    }
    Opener.prototype.open = function (target, appname) {
        return xopen(target, appname);
    };
    return Opener;
})();
exports.Opener = Opener;
$injector.register("opener", Opener);
