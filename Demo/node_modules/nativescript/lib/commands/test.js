///<reference path="../.d.ts"/>
"use strict";
function RunTestCommandFactory(platform) {
    return function RunTestCommand($testExecutionService) {
        this.execute = function (args) { return $testExecutionService.startTestRunner(platform); };
        this.allowedParameters = [];
    };
}
$injector.registerCommand("dev-test|android", RunTestCommandFactory('android'));
$injector.registerCommand("dev-test|ios", RunTestCommandFactory('iOS'));
function RunKarmaTestCommandFactory(platform) {
    return function RunKarmaTestCommand($testExecutionService) {
        this.execute = function (args) { return $testExecutionService.startKarmaServer(platform); };
        this.allowedParameters = [];
    };
}
$injector.registerCommand("test|android", RunKarmaTestCommandFactory('android'));
$injector.registerCommand("test|ios", RunKarmaTestCommandFactory('iOS'));
