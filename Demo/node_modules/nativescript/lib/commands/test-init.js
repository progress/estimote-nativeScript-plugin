///<reference path="../.d.ts"/>
"use strict";
var path = require('path');
var util = require('util');
var constants_1 = require('../constants');
var TestInitCommand = (function () {
    function TestInitCommand($npm, $projectData, $errors, $options, $prompter, $fs, $resources, $pluginsService, $logger) {
        this.$npm = $npm;
        this.$projectData = $projectData;
        this.$errors = $errors;
        this.$options = $options;
        this.$prompter = $prompter;
        this.$fs = $fs;
        this.$resources = $resources;
        this.$pluginsService = $pluginsService;
        this.$logger = $logger;
        this.frameworkDependencies = {
            mocha: ['chai'],
        };
        this.allowedParameters = [];
    }
    TestInitCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var projectDir = _this.$projectData.projectDir;
            var frameworkToInstall = _this.$options.framework
                || _this.$prompter.promptForChoice('Select testing framework:', constants_1.TESTING_FRAMEWORKS).wait();
            if (constants_1.TESTING_FRAMEWORKS.indexOf(frameworkToInstall) === -1) {
                _this.$errors.fail("Unknown or unsupported unit testing framework: " + frameworkToInstall);
            }
            var dependencies = _this.frameworkDependencies[frameworkToInstall] || [];
            ['karma', 'karma-' + frameworkToInstall, 'karma-nativescript-launcher']
                .concat(dependencies.map(function (f) { return 'karma-' + f; }))
                .forEach(function (mod) {
                _this.$npm.install(mod, projectDir, {
                    'save-dev': true,
                    optional: false,
                }).wait();
            });
            _this.$pluginsService.add('nativescript-unit-test-runner').wait();
            var testsDir = path.join(projectDir, 'app/tests');
            var shouldCreateSampleTests = true;
            if (_this.$fs.exists(testsDir).wait()) {
                _this.$logger.info('app/tests/ directory already exists, will not create an example test project.');
                shouldCreateSampleTests = false;
            }
            _this.$fs.ensureDirectoryExists(testsDir).wait();
            var karmaConfTemplate = _this.$resources.readText('test/karma.conf.js').wait();
            var karmaConf = _.template(karmaConfTemplate)({
                frameworks: [frameworkToInstall].concat(dependencies)
                    .map(function (fw) { return ("'" + fw + "'"); })
                    .join(', ')
            });
            _this.$fs.writeFile(path.join(projectDir, 'karma.conf.js'), karmaConf).wait();
            var exampleFilePath = _this.$resources.resolvePath(util.format('test/example.%s.js', frameworkToInstall));
            if (shouldCreateSampleTests && _this.$fs.exists(exampleFilePath).wait()) {
                _this.$fs.copyFile(exampleFilePath, path.join(testsDir, 'example.js')).wait();
                _this.$logger.info('\nExample test file created in app/tests/'.yellow);
            }
            else {
                _this.$logger.info('\nPlace your test files under app/tests/'.yellow);
            }
            _this.$logger.info('Run your tests using the "$ tns test <platform>" command.'.yellow);
        }).future()();
    };
    return TestInitCommand;
})();
$injector.registerCommand("test|init", TestInitCommand);
