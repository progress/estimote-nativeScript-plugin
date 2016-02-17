///<reference path="../.d.ts"/>
"use strict";
var util = require("util");
var CommonLoggerStub = (function () {
    function CommonLoggerStub() {
        this.output = "";
    }
    CommonLoggerStub.prototype.setLevel = function (level) { };
    CommonLoggerStub.prototype.getLevel = function () { return undefined; };
    CommonLoggerStub.prototype.fatal = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.warnWithLabel = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.out = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.output += util.format.apply(util, args) + "\n";
    };
    CommonLoggerStub.prototype.write = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
    };
    CommonLoggerStub.prototype.prepare = function (item) {
        return "";
    };
    CommonLoggerStub.prototype.printInfoMessageOnSameLine = function (message) { };
    CommonLoggerStub.prototype.printMsgWithTimeout = function (message, timeout) {
        return null;
    };
    CommonLoggerStub.prototype.printMarkdown = function (message) { };
    return CommonLoggerStub;
})();
exports.CommonLoggerStub = CommonLoggerStub;
