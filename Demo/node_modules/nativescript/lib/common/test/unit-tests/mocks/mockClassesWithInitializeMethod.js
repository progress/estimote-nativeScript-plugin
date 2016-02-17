///<reference path="../../.d.ts"/>
"use strict";
var ClassWithFuturizedInitializeMethod = (function () {
    function ClassWithFuturizedInitializeMethod() {
        this.isInitializedCalled = false;
    }
    ClassWithFuturizedInitializeMethod.prototype.initialize = function () {
        var _this = this;
        return (function () {
            _this.isInitializedCalled = true;
        }).future()();
    };
    return ClassWithFuturizedInitializeMethod;
})();
exports.ClassWithFuturizedInitializeMethod = ClassWithFuturizedInitializeMethod;
var ClassWithInitializeMethod = (function () {
    function ClassWithInitializeMethod() {
        this.isInitializedCalled = false;
    }
    ClassWithInitializeMethod.prototype.initialize = function () {
        this.isInitializedCalled = true;
    };
    return ClassWithInitializeMethod;
})();
exports.ClassWithInitializeMethod = ClassWithInitializeMethod;
