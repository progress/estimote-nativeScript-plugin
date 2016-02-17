///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var Queue = (function () {
    function Queue(items) {
        if (items === void 0) { items = []; }
        this.items = items;
    }
    Queue.prototype.enqueue = function (item) {
        this.items.unshift(item);
        if (this.future) {
            this.future.return();
        }
    };
    Queue.prototype.dequeue = function () {
        var _this = this;
        return (function () {
            if (!_this.items.length) {
                _this.future = new Future();
                _this.future.wait();
                _this.future = null;
            }
            return _this.items.pop();
        }).future()();
    };
    return Queue;
})();
exports.Queue = Queue;
