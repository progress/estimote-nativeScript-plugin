///<reference path="../.d.ts"/>
"use strict";
var constants = require("../constants");
var path = require('path');
var Future = require('fibers/future');
var os = require('os');
var fiberBootstrap = require("../common/fiber-bootstrap");
var TestExecutionService = (function () {
    function TestExecutionService($injector, $projectData, $platformService, $platformsData, $usbLiveSyncServiceBase, $androidUsbLiveSyncServiceLocator, $iosUsbLiveSyncServiceLocator, $devicePlatformsConstants, $resources, $httpClient, $config, $logger, $fs, $options, $pluginsService, $errors) {
        this.$injector = $injector;
        this.$projectData = $projectData;
        this.$platformService = $platformService;
        this.$platformsData = $platformsData;
        this.$usbLiveSyncServiceBase = $usbLiveSyncServiceBase;
        this.$androidUsbLiveSyncServiceLocator = $androidUsbLiveSyncServiceLocator;
        this.$iosUsbLiveSyncServiceLocator = $iosUsbLiveSyncServiceLocator;
        this.$devicePlatformsConstants = $devicePlatformsConstants;
        this.$resources = $resources;
        this.$httpClient = $httpClient;
        this.$config = $config;
        this.$logger = $logger;
        this.$fs = $fs;
        this.$options = $options;
        this.$pluginsService = $pluginsService;
        this.$errors = $errors;
        this.allowedParameters = [];
    }
    TestExecutionService.prototype.startTestRunner = function (platform) {
        var _this = this;
        return (function () {
            _this.$options.justlaunch = true;
            var blockingOperationFuture = new Future();
            process.on('message', function (launcherConfig) {
                fiberBootstrap.run(function () {
                    try {
                        var platformData = _this.$platformsData.getPlatformData(platform.toLowerCase());
                        var projectDir = _this.$projectData.projectDir;
                        var projectFilesPath = path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME);
                        var configOptions = JSON.parse(launcherConfig);
                        _this.$options.debugBrk = configOptions.debugBrk;
                        _this.$options.debugTransport = configOptions.debugTransport;
                        var configJs = _this.generateConfig(configOptions);
                        _this.$fs.writeFile(path.join(projectDir, TestExecutionService.CONFIG_FILE_NAME), configJs).wait();
                        var socketIoJsUrl = "http://localhost:" + _this.$options.port + "/socket.io/socket.io.js";
                        var socketIoJs = _this.$httpClient.httpRequest(socketIoJsUrl).wait().body;
                        _this.$fs.writeFile(path.join(projectDir, TestExecutionService.SOCKETIO_JS_FILE_NAME), socketIoJs).wait();
                        if (!_this.$platformService.preparePlatform(platform).wait()) {
                            _this.$errors.failWithoutHelp("Verify that listed files are well-formed and try again the operation.");
                        }
                        _this.detourEntryPoint(projectFilesPath).wait();
                        var watchGlob = path.join(projectDir, constants.APP_FOLDER_NAME);
                        var platformSpecificLiveSyncServices = {
                            android: function (_device, $injector) {
                                return $injector.resolve(_this.$androidUsbLiveSyncServiceLocator.factory, { _device: _device });
                            },
                            ios: function (_device, $injector) {
                                return $injector.resolve(_this.$iosUsbLiveSyncServiceLocator.factory, { _device: _device });
                            }
                        };
                        var notInstalledAppOnDeviceAction = function (device) {
                            return (function () {
                                _this.$platformService.installOnDevice(platform).wait();
                                _this.detourEntryPoint(projectFilesPath).wait();
                            }).future()();
                        };
                        var notRunningiOSSimulatorAction = function () {
                            return (function () {
                                _this.$platformService.deployOnEmulator(_this.$devicePlatformsConstants.iOS.toLowerCase()).wait();
                                _this.detourEntryPoint(projectFilesPath).wait();
                            }).future()();
                        };
                        var beforeBatchLiveSyncAction = function (filePath) {
                            return (function () {
                                if (!_this.$platformService.preparePlatform(platform).wait()) {
                                    _this.$logger.out("Verify that listed files are well-formed and try again the operation.");
                                    return;
                                }
                                return path.join(projectFilesPath, path.relative(path.join(_this.$projectData.projectDir, constants.APP_FOLDER_NAME), filePath));
                            }).future()();
                        };
                        var localProjectRootPath = platform.toLowerCase() === "ios" ? platformData.appDestinationDirectoryPath : null;
                        var getApplicationPathForiOSSimulatorAction = function () {
                            return (function () {
                                return _this.$platformService.getLatestApplicationPackageForEmulator(platformData).wait().packageName;
                            }).future()();
                        };
                        var liveSyncData = {
                            platform: platform,
                            appIdentifier: _this.$projectData.projectId,
                            projectFilesPath: projectFilesPath,
                            excludedProjectDirsAndFiles: constants.LIVESYNC_EXCLUDED_DIRECTORIES,
                            watchGlob: watchGlob,
                            platformSpecificLiveSyncServices: platformSpecificLiveSyncServices,
                            notInstalledAppOnDeviceAction: notInstalledAppOnDeviceAction,
                            notRunningiOSSimulatorAction: notRunningiOSSimulatorAction,
                            getApplicationPathForiOSSimulatorAction: getApplicationPathForiOSSimulatorAction,
                            localProjectRootPath: localProjectRootPath,
                            beforeBatchLiveSyncAction: beforeBatchLiveSyncAction,
                            shouldRestartApplication: function (localToDevicePaths) { return Future.fromResult(!_this.$options.debugBrk); },
                            canExecuteFastLiveSync: function (filePath) { return false; },
                        };
                        _this.$usbLiveSyncServiceBase.sync(liveSyncData).wait();
                        if (_this.$options.debugBrk) {
                            _this.$logger.info('Starting debugger...');
                            var debugService = _this.$injector.resolve(platform + "DebugService");
                            debugService.debugStart().wait();
                        }
                        blockingOperationFuture.return();
                    }
                    catch (err) {
                        blockingOperationFuture.throw(err);
                    }
                });
            });
            process.send("ready");
            blockingOperationFuture.wait();
        }).future()();
    };
    TestExecutionService.prototype.startKarmaServer = function (platform) {
        var _this = this;
        return (function () {
            platform = platform.toLowerCase();
            _this.$pluginsService.ensureAllDependenciesAreInstalled().wait();
            var pathToKarma = path.join(_this.$projectData.projectDir, 'node_modules/karma');
            var KarmaServer = require(path.join(pathToKarma, 'lib/server'));
            if (platform === 'ios' && _this.$options.emulator) {
                platform = 'ios_simulator';
            }
            var karmaConfig = {
                browsers: [platform],
                configFile: path.join(_this.$projectData.projectDir, 'karma.conf.js'),
                _NS: {
                    log: _this.$logger.getLevel(),
                    path: _this.$options.path,
                    tns: process.argv[1],
                    node: process.execPath,
                    options: {
                        debugTransport: _this.$options.debugTransport,
                        debugBrk: _this.$options.debugBrk,
                    }
                },
            };
            if (_this.$config.DEBUG || _this.$logger.getLevel() === 'TRACE') {
                karmaConfig.logLevel = 'DEBUG';
            }
            if (!_this.$options.watch) {
                karmaConfig.singleRun = true;
            }
            if (_this.$options.debugBrk) {
                karmaConfig.browserNoActivityTimeout = 1000000000;
            }
            _this.$logger.debug(JSON.stringify(karmaConfig, null, 4));
            new KarmaServer(karmaConfig).start();
        }).future()();
    };
    TestExecutionService.prototype.detourEntryPoint = function (projectFilesPath) {
        var _this = this;
        return (function () {
            var packageJsonPath = path.join(projectFilesPath, 'package.json');
            var packageJson = _this.$fs.readJson(packageJsonPath).wait();
            packageJson.main = TestExecutionService.MAIN_APP_NAME;
            _this.$fs.writeJson(packageJsonPath, packageJson).wait();
        }).future()();
    };
    TestExecutionService.prototype.generateConfig = function (options) {
        var port = this.$options.port;
        var nics = os.networkInterfaces();
        var ips = Object.keys(nics)
            .map(function (nicName) { return nics[nicName].filter(function (binding) { return binding.family === 'IPv4' && !binding.internal; })[0]; })
            .filter(function (binding) { return binding; })
            .map(function (binding) { return binding.address; });
        var config = {
            port: port,
            ips: ips,
            options: options,
        };
        return 'module.exports = ' + JSON.stringify(config);
    };
    TestExecutionService.MAIN_APP_NAME = "./tns_modules/" + constants.TEST_RUNNER_NAME + "/app.js";
    TestExecutionService.CONFIG_FILE_NAME = "node_modules/" + constants.TEST_RUNNER_NAME + "/config.js";
    TestExecutionService.SOCKETIO_JS_FILE_NAME = "node_modules/" + constants.TEST_RUNNER_NAME + "/socket.io.js";
    return TestExecutionService;
})();
$injector.register('testExecutionService', TestExecutionService);
