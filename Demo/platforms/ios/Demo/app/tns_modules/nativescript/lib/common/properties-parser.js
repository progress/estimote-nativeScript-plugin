///<reference path=".d.ts"/>
"use strict";
var propertiesParser = require("properties-parser");
var Future = require("fibers/future");
var assert = require("assert");
var PropertiesParser = (function () {
    function PropertiesParser() {
        this._editor = null;
    }
    PropertiesParser.prototype.parse = function (text) {
        return propertiesParser.parse(text);
    };
    PropertiesParser.prototype.read = function (filePath) {
        var future = new Future();
        propertiesParser.read(filePath, function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(data);
            }
        });
        return future;
    };
    PropertiesParser.prototype.createEditor = function (filePath) {
        var _this = this;
        var future = new Future();
        propertiesParser.createEditor(filePath, function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                _this._editor = data;
                future.return(_this._editor);
            }
        });
        return future;
    };
    PropertiesParser.prototype.saveEditor = function () {
        assert.ok(this._editor, "Editor is undefied. Ensure that createEditor is called.");
        var future = new Future();
        this._editor.save(function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    return PropertiesParser;
})();
exports.PropertiesParser = PropertiesParser;
$injector.register("propertiesParser", PropertiesParser);
