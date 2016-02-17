///<reference path=".d.ts"/>
"use strict";
var Promise = require("bluebird");
var fiberBootstrap = require("./fiber-bootstrap");
var assert = require("assert");
var helpers_1 = require("./helpers");
function exportedPromise(moduleName) {
    return function (target, propertyKey, descriptor) {
        $injector.publicApi.__modules__[moduleName] = $injector.publicApi.__modules__[moduleName] || {};
        $injector.publicApi.__modules__[moduleName][propertyKey] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var originalModule = $injector.resolve(moduleName);
            var originalMethod = originalModule[propertyKey];
            var result;
            try {
                result = originalMethod.apply(originalModule, args);
            }
            catch (err) {
                var promise = new Promise(function (onFulfilled, onRejected) {
                    onRejected(err);
                });
                return promise;
            }
            var types = _(result)
                .groupBy(function (f) { return typeof f; })
                .keys()
                .value();
            if (_.isArray(result) && types.length === 1 && helpers_1.isFuture(_.first(result))) {
                return _.map(result, function (future) { return getPromise(future); });
            }
            else {
                return getPromise(result);
            }
        };
        return descriptor;
    };
}
exports.exportedPromise = exportedPromise;
function getPromise(originalValue) {
    return new Promise(function (onFulfilled, onRejected) {
        if (helpers_1.isFuture(originalValue)) {
            fiberBootstrap.run(function () {
                try {
                    var realResult = originalValue.wait();
                    onFulfilled(realResult);
                }
                catch (err) {
                    onRejected(err);
                }
            });
        }
        else {
            onFulfilled(originalValue);
        }
    });
}
function exported(moduleName) {
    return function (target, propertyKey, descriptor) {
        $injector.publicApi.__modules__[moduleName] = $injector.publicApi.__modules__[moduleName] || {};
        $injector.publicApi.__modules__[moduleName][propertyKey] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var originalModule = $injector.resolve(moduleName);
            var originalMethod = target[propertyKey];
            var result = originalMethod.apply(originalModule, args);
            assert.strictEqual(helpers_1.isFuture(result), false, "Cannot use exported decorator with function returning IFuture<T>.");
            return result;
        };
        return descriptor;
    };
}
exports.exported = exported;
