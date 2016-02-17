///<reference path="../.d.ts"/>
"use strict";
var chai_1 = require("chai");
var yok_1 = require("../../yok");
var path = require("path");
var fs = require("fs");
var rimraf = require("rimraf");
var classesWithInitMethod = require("./mocks/mockClassesWithInitializeMethod");
var MyClass = (function () {
    function MyClass(x, y) {
        this.x = x;
        this.y = y;
    }
    MyClass.prototype.checkX = function () {
        chai_1.assert.strictEqual(this.x, "foo");
    };
    return MyClass;
})();
describe("yok", function () {
    it("resolves pre-constructed singleton", function () {
        var injector = new yok_1.Yok();
        var obj = {};
        injector.register("foo", obj);
        var resolved = injector.resolve("foo");
        chai_1.assert.strictEqual(obj, resolved);
    });
    it("resolves given constructor", function () {
        var injector = new yok_1.Yok();
        var obj;
        injector.register("foo", function () {
            obj = { foo: "foo" };
            return obj;
        });
        var resolved = injector.resolve("foo");
        chai_1.assert.strictEqual(resolved, obj);
    });
    it("resolves constructed singleton", function () {
        var injector = new yok_1.Yok();
        injector.register("foo", { foo: "foo" });
        var r1 = injector.resolve("foo");
        var r2 = injector.resolve("foo");
        chai_1.assert.strictEqual(r1, r2);
    });
    it("injects directly into passed constructor", function () {
        var injector = new yok_1.Yok();
        var obj = {};
        injector.register("foo", obj);
        function Test(foo) {
            this.foo = foo;
        }
        var result = injector.resolve(Test);
        chai_1.assert.strictEqual(obj, result.foo);
    });
    it("inject dependency into registered constructor", function () {
        var injector = new yok_1.Yok();
        var obj = {};
        injector.register("foo", obj);
        function Test(foo) {
            this.foo = foo;
        }
        injector.register("test", Test);
        var result = injector.resolve("test");
        chai_1.assert.strictEqual(obj, result.foo);
    });
    it("inject dependency with $ prefix", function () {
        var injector = new yok_1.Yok();
        var obj = {};
        injector.register("foo", obj);
        function Test($foo) {
            this.foo = $foo;
        }
        var result = injector.resolve(Test);
        chai_1.assert.strictEqual(obj, result.foo);
    });
    it("inject into TS constructor", function () {
        var injector = new yok_1.Yok();
        injector.register("x", "foo");
        injector.register("y", 123);
        var result = injector.resolve(MyClass);
        chai_1.assert.strictEqual(result.y, 123);
        result.checkX();
    });
    it("resolves a parameterless constructor", function () {
        var injector = new yok_1.Yok();
        function Test() {
            this.foo = "foo";
        }
        var result = injector.resolve(Test);
        chai_1.assert.equal(result.foo, "foo");
    });
    it("returns null when it can't resolve a command", function () {
        var injector = new yok_1.Yok();
        var command = injector.resolveCommand("command");
        chai_1.assert.isNull(command);
    });
    it("throws when it can't resolve a registered command", function () {
        var injector = new yok_1.Yok();
        function Command(whatever) { }
        injector.registerCommand("command", Command);
        chai_1.assert.throws(function () { return injector.resolveCommand("command"); });
    });
    it("disposes", function () {
        var injector = new yok_1.Yok();
        function Thing() { }
        Thing.prototype.dispose = function () {
            this.disposed = true;
        };
        injector.register("thing", Thing);
        var thing = injector.resolve("thing");
        injector.dispose();
        chai_1.assert.isTrue(thing.disposed);
    });
    it("throws error when module is required more than once", function () {
        var injector = new yok_1.Yok();
        injector.require("foo", "test");
        chai_1.assert.throws(function () { return injector.require("foo", "test2"); });
    });
    it("adds module to public api when requirePublic is used", function () {
        var injector = new yok_1.Yok();
        injector.requirePublic("foo", "test");
        chai_1.assert.isTrue(_.contains(Object.getOwnPropertyNames(injector.publicApi), "foo"));
    });
    describe("buildHierarchicalCommand", function () {
        var injector;
        beforeEach(function () {
            injector = new yok_1.Yok();
        });
        describe("returns undefined", function () {
            it("when there's no valid hierarchical command", function () {
                injector.requireCommand("sample|command", "sampleFileName");
                chai_1.assert.isUndefined(injector.buildHierarchicalCommand("command", ["subCommand"]), "When there's no matching subcommand, buildHierarchicalCommand should return undefined.");
            });
            it("when there's no hierarchical commands required", function () {
                chai_1.assert.isUndefined(injector.buildHierarchicalCommand("command", ["subCommand"]), "When there's no hierarchical commands required, buildHierarchicalCommand should return undefined.");
            });
            it("when only one argument is passed", function () {
                chai_1.assert.isUndefined(injector.buildHierarchicalCommand("command", []), "When when only one argument is passed, buildHierarchicalCommand should return undefined.");
            });
            it("when there's matching command, but it is not hierarchical command", function () {
                injector.requireCommand("command", "sampleFileName");
                chai_1.assert.isUndefined(injector.buildHierarchicalCommand("command", []), "When there's matching command, but it is not hierarchical command, buildHierarchicalCommand should return undefined.");
            });
        });
        describe("returns correct command and arguments when command name has one pipe (|)", function () {
            it("when only command is passed, no arguments are returned", function () {
                var commandName = "sample|command";
                injector.requireCommand(commandName, "sampleFileName");
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"]);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
            });
            it("when command is passed, correct arguments are returned", function () {
                var commandName = "sample|command";
                injector.requireCommand(commandName, "sampleFileName");
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"].concat(sampleArguments));
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except first one should be returned.");
            });
            it("when command is passed, correct arguments are returned when command argument has uppercase letters", function () {
                var commandName = "sample|command";
                injector.requireCommand(commandName, "sampleFileName");
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["CoMmanD"].concat(sampleArguments));
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except first one should be returned.");
            });
            it("when only default command is passed, no arguments are returned", function () {
                var commandName = "sample|*command";
                injector.requireCommand(commandName, "sampleFileName");
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"]);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
            });
            it("when default command is passed, correct arguments are returned", function () {
                var commandName = "sample|*command";
                injector.requireCommand(commandName, "sampleFileName");
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"].concat(sampleArguments));
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except first one should be returned.");
            });
        });
        describe("returns correct command and arguments when command name has more than one pipe (|)", function () {
            it("when only command is passed, no arguments are returned", function () {
                var commandName = "sample|command|with|more|pipes";
                injector.requireCommand(commandName, "sampleFileName");
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "with", "more", "pipes"]);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
            });
            it("when command is passed, correct arguments are returned", function () {
                var commandName = "sample|command|pipes";
                injector.requireCommand(commandName, "sampleFileName");
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "pipes"].concat(sampleArguments));
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except the ones used for commandName should be returned.");
            });
            it("when only default command is passed, no arguments are returned", function () {
                var commandName = "sample|*command|pipes";
                injector.requireCommand(commandName, "sampleFileName");
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "pipes"]);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
            });
            it("when default command is passed, correct arguments are returned", function () {
                var commandName = "sample|*command|pipes";
                injector.requireCommand(commandName, "sampleFileName");
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "pipes"].concat(sampleArguments));
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except the ones used for commandName should be returned.");
            });
            describe("returns most applicable hierarchical command", function () {
                var sampleArguments = ["sample", "arguments", "passed", "to", "command"];
                beforeEach(function () {
                    injector.requireCommand("sample|command", "sampleFileName");
                    injector.requireCommand("sample|command|with", "sampleFileName");
                    injector.requireCommand("sample|command|with|more", "sampleFileName");
                    injector.requireCommand("sample|command|with|more|pipes", "sampleFileName");
                });
                it("when subcommand of subcommand is called", function () {
                    var commandName = "sample|command|with|more|pipes";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "with", "more", "pipes"]);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
                });
                it("and correct arguments, when subcommand of subcommand is called", function () {
                    var commandName = "sample|command|with|more|pipes";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "with", "more", "pipes"].concat(sampleArguments));
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except the ones used for commandName should be returned.");
                });
                it("when top subcommand is called and it has its own subcommand", function () {
                    var commandName = "sample|command";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"]);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
                });
                it("and correct arguments, when top subcommand is called and it has its own subcommand", function () {
                    var commandName = "sample|command";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command"].concat(sampleArguments));
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except the ones used for commandName should be returned.");
                });
                it("when subcommand of subcommand is called and it has its own subcommand", function () {
                    var commandName = "sample|command|with";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "with"]);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, [], "There shouldn't be any arguments left.");
                });
                it("and correct arguments, when subcommand of subcommand is called and it has its own subcommand", function () {
                    var commandName = "sample|command|with";
                    var buildHierarchicalCommandResult = injector.buildHierarchicalCommand("sample", ["command", "with"].concat(sampleArguments));
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.commandName, commandName, "The expected command name is " + commandName);
                    chai_1.assert.deepEqual(buildHierarchicalCommandResult.remainingArguments, sampleArguments, "All arguments except the ones used for commandName should be returned.");
                });
            });
        });
    });
    it("adds whole class to public api when requirePublicClass is used", function () {
        var injector = new yok_1.Yok();
        var dataObject = {
            a: "testA",
            b: {
                c: "testC"
            }
        };
        var filepath = path.join(__dirname, "..", "..", "temp.js");
        fs.writeFileSync(filepath, "");
        injector.requirePublicClass("foo", "./temp");
        injector.register("foo", dataObject);
        var resultFooObject = injector.publicApi.foo;
        rimraf(filepath, function (err) {
            if (err) {
                console.log("Unable to delete file used for tests: " + filepath + ".");
            }
        });
        chai_1.assert.isTrue(_.contains(Object.getOwnPropertyNames(injector.publicApi), "foo"));
        chai_1.assert.deepEqual(resultFooObject, dataObject);
    });
    it("automatically calls initialize method of a class when initialize returns IFuture", function () {
        var injector = new yok_1.Yok();
        injector.requirePublicClass("classWithInitMethod", "./test/unit-tests/mocks/mockClassesWithInitializeMethod");
        injector.register("classWithInitMethod", classesWithInitMethod.ClassWithFuturizedInitializeMethod);
        var resultClassWithInitMethod = injector.publicApi.classWithInitMethod;
        chai_1.assert.isTrue(_.contains(Object.getOwnPropertyNames(injector.publicApi), "classWithInitMethod"));
        chai_1.assert.isTrue(resultClassWithInitMethod.isInitializedCalled, "isInitalizedCalled is not set to true, so method had not been called");
    });
    it("automatically calls initialize method of a class when initialize does NOT return IFuture", function () {
        var injector = new yok_1.Yok();
        injector.requirePublicClass("classWithInitMethod", "./test/unit-tests/mocks/mockClassesWithInitializeMethod");
        injector.register("classWithInitMethod", classesWithInitMethod.ClassWithInitializeMethod);
        var resultClassWithInitMethod = injector.publicApi.classWithInitMethod;
        chai_1.assert.isTrue(_.contains(Object.getOwnPropertyNames(injector.publicApi), "classWithInitMethod"));
        chai_1.assert.isTrue(resultClassWithInitMethod.isInitializedCalled, "isInitalizedCalled is not set to true, so method had not been called");
    });
});
