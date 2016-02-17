///<reference path="../.d.ts"/>
"use strict";
var decoratorsLib = require("../../decorators");
var yokLib = require("../../yok");
var chai_1 = require("chai");
var Future = require("fibers/future");
var originalInjector = {};
_.extend(originalInjector, $injector);
describe("decorators", function () {
    afterEach(function () {
        $injector = originalInjector;
        $injector.publicApi = { __modules__: {} };
    });
    describe("exportedPromise", function () {
        it("returns function", function () {
            var result = decoratorsLib.exportedPromise("test");
            chai_1.assert.equal(typeof (result), "function");
        });
        it("does not change original method", function () {
            var promisifiedResult = decoratorsLib.exportedPromise("moduleName");
            var expectedResult = { "originalObject": "originalValue" };
            var actualResult = promisifiedResult({}, "myTest1", expectedResult);
            chai_1.assert.deepEqual(actualResult, expectedResult);
        });
        it("adds method to public api", function () {
            chai_1.assert.deepEqual($injector.publicApi.__modules__["moduleName"], undefined);
            var promisifiedResult = decoratorsLib.exportedPromise("moduleName");
            promisifiedResult({}, "propertyName", {});
            chai_1.assert.deepEqual(typeof ($injector.publicApi.__modules__["moduleName"]["propertyName"]), "function");
        });
        it("returns Promise", function () {
            $injector = new yokLib.Yok();
            var expectedResult = "result";
            $injector.register("moduleName", { propertyName: function () { return expectedResult; } });
            chai_1.assert.deepEqual($injector.publicApi.__modules__["moduleName"], undefined);
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            chai_1.assert.equal(typeof (promise.then), "function");
            promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedResult);
            });
        });
        it("returns Promise, which is resolved to correct value (function without arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedResult = "result";
            $injector.register("moduleName", { propertyName: function () { return expectedResult; } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedResult);
            });
        });
        it("returns Promise, which is resolved to correct value (function with arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedArgs = ["result", "result1", "result2"];
            $injector.register("moduleName", { propertyName: function (functionArgs) { return functionArgs; } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"](expectedArgs);
            promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedArgs);
            });
        });
        it("returns Promise, which is resolved to correct value (function returning IFuture without arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedResult = "result";
            $injector.register("moduleName", { propertyName: function () { return Future.fromResult(expectedResult); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedResult);
            });
        });
        it("returns Promise, which is resolved to correct value (function returning IFuture with arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedArgs = ["result", "result1", "result2"];
            $injector.register("moduleName", { propertyName: function (args) { return Future.fromResult(args); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"](expectedArgs);
            promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedArgs);
            });
        });
        it("rejects Promise, which is resolved to correct error (function without arguments throws)", function () {
            $injector = new yokLib.Yok();
            var expectedError = new Error("Test msg");
            $injector.register("moduleName", { propertyName: function () { throw expectedError; } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            promise.then(function (result) {
                throw new Error("Then method MUST not be called when promise is rejected!");
            }, function (err) {
                chai_1.assert.deepEqual(err, expectedError);
            });
        });
        it("rejects Promise, which is resolved to correct error (function returning IFuture without arguments throws)", function () {
            $injector = new yokLib.Yok();
            var expectedError = new Error("Test msg");
            $injector.register("moduleName", { propertyName: function () { return (function () { throw expectedError; }).future()(); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promise = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            promise.then(function (result) {
                throw new Error("Then method MUST not be called when promise is rejected!");
            }, function (err) {
                chai_1.assert.deepEqual(err.message, expectedError.message);
            });
        });
        it("returns Promises, which are resolved to correct value (function returning IFuture<T>[] without arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedResults = ["result1", "result2", "result3"];
            $injector.register("moduleName", { propertyName: function () { return _.map(expectedResults, function (expectedResult) { return Future.fromResult(expectedResult); }); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promises = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            _.each(promises, function (promise, index) { return promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedResults[index]);
            }); });
        });
        it("rejects Promises, which are resolved to correct error (function returning IFuture<T>[] without arguments throws)", function () {
            $injector = new yokLib.Yok();
            var expectedErrors = [new Error("result1"), new Error("result2"), new Error("result3")];
            $injector.register("moduleName", { propertyName: function () { return _.map(expectedErrors, function (expectedError) { return (function () { throw expectedError; }).future()(); }); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promises = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            _.each(promises, function (promise, index) { return promise.then(function (result) {
                throw new Error("Then method MUST not be called when promise is rejected!");
            }, function (err) {
                chai_1.assert.deepEqual(err.message, expectedErrors[index].message);
            }); });
        });
        it("rejects only Promises which throw, resolves the others correctly (function returning IFuture<T>[] without arguments)", function () {
            $injector = new yokLib.Yok();
            var expectedResults = ["result1", new Error("result2")];
            $injector.register("moduleName", { propertyName: function () { return _.map(expectedResults, function (expectedResult) { return Future.fromResult(expectedResult); }); } });
            var promisifiedResultFunction = decoratorsLib.exportedPromise("moduleName");
            promisifiedResultFunction({}, "propertyName", {});
            var promises = $injector.publicApi.__modules__["moduleName"]["propertyName"]();
            _.each(promises, function (promise, index) { return promise.then(function (val) {
                chai_1.assert.deepEqual(val, expectedResults[index]);
            }, function (err) {
                chai_1.assert.deepEqual(err.message, expectedResults[index].message);
            }); });
        });
    });
});
