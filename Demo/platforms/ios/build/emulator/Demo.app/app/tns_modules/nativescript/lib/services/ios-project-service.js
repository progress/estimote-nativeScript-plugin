///<reference path="../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var shell = require("shelljs");
var util = require("util");
var os = require("os");
var semver = require("semver");
var xcode = require("xcode");
var constants = require("../constants");
var helpers = require("../common/helpers");
var projectServiceBaseLib = require("./platform-project-service-base");
var Future = require("fibers/future");
var IOSProjectService = (function (_super) {
    __extends(IOSProjectService, _super);
    function IOSProjectService($projectData, $fs, $childProcess, $errors, $logger, $iOSEmulatorServices, $options, $injector, $projectDataService, $prompter, $config) {
        _super.call(this, $fs, $projectData, $projectDataService);
        this.$childProcess = $childProcess;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$iOSEmulatorServices = $iOSEmulatorServices;
        this.$options = $options;
        this.$injector = $injector;
        this.$prompter = $prompter;
        this.$config = $config;
    }
    Object.defineProperty(IOSProjectService.prototype, "$npmInstallationManager", {
        get: function () {
            return this.$injector.resolve("npmInstallationManager");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSProjectService.prototype, "platformData", {
        get: function () {
            var projectRoot = path.join(this.$projectData.platformsDir, "ios");
            return {
                frameworkPackageName: "tns-ios",
                normalizedPlatformName: "iOS",
                appDestinationDirectoryPath: path.join(projectRoot, this.$projectData.projectName),
                platformProjectService: this,
                emulatorServices: this.$iOSEmulatorServices,
                projectRoot: projectRoot,
                deviceBuildOutputPath: path.join(projectRoot, "build", "device"),
                emulatorBuildOutputPath: path.join(projectRoot, "build", "emulator"),
                validPackageNamesForDevice: [
                    this.$projectData.projectName + ".ipa"
                ],
                validPackageNamesForEmulator: [
                    this.$projectData.projectName + ".app"
                ],
                frameworkFilesExtensions: [".a", ".framework", ".bin"],
                frameworkDirectoriesExtensions: [".framework"],
                frameworkDirectoriesNames: ["Metadata", "metadataGenerator", "NativeScript", "internal"],
                targetedOS: ['darwin'],
                configurationFileName: "Info.plist",
                configurationFilePath: path.join(projectRoot, this.$projectData.projectName, this.$projectData.projectName + "-Info.plist"),
                relativeToFrameworkConfigurationFilePath: path.join("__PROJECT_NAME__", "__PROJECT_NAME__-Info.plist"),
                mergeXmlConfig: [{ "nodename": "plist", "attrname": "*" }, { "nodename": "dict", "attrname": "*" }]
            };
        },
        enumerable: true,
        configurable: true
    });
    IOSProjectService.prototype.getAppResourcesDestinationDirectoryPath = function () {
        var _this = this;
        return (function () {
            var frameworkVersion = _this.getFrameworkVersion(_this.platformData.frameworkPackageName).wait();
            if (semver.lt(frameworkVersion, "1.3.0")) {
                return path.join(_this.platformData.projectRoot, _this.$projectData.projectName, "Resources", "icons");
            }
            return path.join(_this.platformData.projectRoot, _this.$projectData.projectName, "Resources");
        }).future()();
    };
    IOSProjectService.prototype.validate = function () {
        var _this = this;
        return (function () {
            try {
                _this.$childProcess.exec("which xcodebuild").wait();
            }
            catch (error) {
                _this.$errors.fail("Xcode is not installed. Make sure you have Xcode installed and added to your PATH");
            }
            var xcodeBuildVersion = _this.$childProcess.exec("xcodebuild -version | head -n 1 | sed -e 's/Xcode //'").wait();
            var splitedXcodeBuildVersion = xcodeBuildVersion.split(".");
            if (splitedXcodeBuildVersion.length === 3) {
                xcodeBuildVersion = util.format("%s.%s", splitedXcodeBuildVersion[0], splitedXcodeBuildVersion[1]);
            }
            if (helpers.versionCompare(xcodeBuildVersion, IOSProjectService.XCODEBUILD_MIN_VERSION) < 0) {
                _this.$errors.fail("NativeScript can only run in Xcode version %s or greater", IOSProjectService.XCODEBUILD_MIN_VERSION);
            }
        }).future()();
    };
    IOSProjectService.prototype.createProject = function (frameworkDir, frameworkVersion) {
        var _this = this;
        return (function () {
            _this.$fs.ensureDirectoryExists(path.join(_this.platformData.projectRoot, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER)).wait();
            if (_this.$options.symlink) {
                var xcodeProjectName = util.format("%s.xcodeproj", IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER);
                shell.cp("-R", path.join(frameworkDir, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER, "*"), path.join(_this.platformData.projectRoot, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER));
                shell.cp("-R", path.join(frameworkDir, xcodeProjectName), _this.platformData.projectRoot);
                var directoryContent = _this.$fs.readDirectory(frameworkDir).wait();
                var frameworkFiles = _.difference(directoryContent, [IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER, xcodeProjectName]);
                _.each(frameworkFiles, function (file) {
                    _this.$fs.symlink(path.join(frameworkDir, file), path.join(_this.platformData.projectRoot, file)).wait();
                });
            }
            else {
                shell.cp("-R", path.join(frameworkDir, "*"), _this.platformData.projectRoot);
            }
        }).future()();
    };
    IOSProjectService.prototype.interpolateData = function () {
        var _this = this;
        return (function () {
            var infoPlistFilePath = path.join(_this.platformData.projectRoot, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER, util.format("%s-%s", IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER, "Info.plist"));
            _this.interpolateConfigurationFile(infoPlistFilePath).wait();
            var projectRootFilePath = path.join(_this.platformData.projectRoot, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER);
            _this.replaceFileName("-Info.plist", projectRootFilePath).wait();
            _this.replaceFileName("-Prefix.pch", projectRootFilePath).wait();
            _this.replaceFileName(IOSProjectService.XCODE_PROJECT_EXT_NAME, _this.platformData.projectRoot).wait();
            var pbxprojFilePath = path.join(_this.platformData.projectRoot, _this.$projectData.projectName + IOSProjectService.XCODE_PROJECT_EXT_NAME, "project.pbxproj");
            _this.replaceFileContent(pbxprojFilePath).wait();
        }).future()();
    };
    IOSProjectService.prototype.interpolateConfigurationFile = function (configurationFilePath) {
        var _this = this;
        return (function () {
            shell.sed('-i', "__CFBUNDLEIDENTIFIER__", _this.$projectData.projectId, configurationFilePath || _this.platformData.configurationFilePath);
        }).future()();
    };
    IOSProjectService.prototype.afterCreateProject = function (projectRoot) {
        var _this = this;
        return (function () {
            _this.$fs.rename(path.join(projectRoot, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER), path.join(projectRoot, _this.$projectData.projectName)).wait();
        }).future()();
    };
    IOSProjectService.prototype.buildProject = function (projectRoot) {
        var _this = this;
        return (function () {
            var basicArgs = [
                "-configuration", _this.$options.release ? "Release" : "Debug",
                "build",
                'SHARED_PRECOMPS_DIR=' + path.join(projectRoot, 'build', 'sharedpch')
            ];
            var xcworkspacePath = path.join(projectRoot, _this.$projectData.projectName + ".xcworkspace");
            if (_this.$fs.exists(xcworkspacePath).wait()) {
                basicArgs.push("-workspace", xcworkspacePath);
                basicArgs.push("-scheme", _this.$projectData.projectName);
            }
            else {
                basicArgs.push("-project", path.join(projectRoot, _this.$projectData.projectName + ".xcodeproj"));
                basicArgs.push("-target", _this.$projectData.projectName);
            }
            var frameworkVersion = _this.getFrameworkVersion(_this.platformData.frameworkPackageName).wait();
            if (semver.lt(frameworkVersion, "1.4.0")) {
                basicArgs.push("-xcconfig", path.join(projectRoot, _this.$projectData.projectName, "build.xcconfig"));
            }
            var args = [];
            if (_this.$options.forDevice) {
                args = basicArgs.concat([
                    "-sdk", "iphoneos",
                    'ARCHS=armv7 arm64',
                    'VALID_ARCHS=armv7 arm64',
                    "CONFIGURATION_BUILD_DIR=" + path.join(projectRoot, "build", "device")
                ]);
            }
            else {
                args = basicArgs.concat([
                    "-sdk", "iphonesimulator",
                    "-arch", "i386",
                    "VALID_ARCHS=\"i386\"",
                    "CONFIGURATION_BUILD_DIR=" + path.join(projectRoot, "build", "emulator")
                ]);
            }
            _this.$childProcess.spawnFromEvent("xcodebuild", args, "exit", { cwd: _this.$options, stdio: 'inherit' }).wait();
            if (_this.$options.forDevice) {
                var buildOutputPath = path.join(projectRoot, "build", "device");
                var xcrunArgs = [
                    "-sdk", "iphoneos",
                    "PackageApplication",
                    "-v", path.join(buildOutputPath, _this.$projectData.projectName + ".app"),
                    "-o", path.join(buildOutputPath, _this.$projectData.projectName + ".ipa")
                ];
                _this.$childProcess.spawnFromEvent("xcrun", xcrunArgs, "exit", { cwd: _this.$options, stdio: 'inherit' }).wait();
            }
        }).future()();
    };
    IOSProjectService.prototype.isPlatformPrepared = function (projectRoot) {
        return this.$fs.exists(path.join(projectRoot, this.$projectData.projectName, constants.APP_FOLDER_NAME));
    };
    IOSProjectService.prototype.addLibrary = function (libraryPath) {
        var _this = this;
        return (function () {
            var extension = path.extname(libraryPath);
            if (extension === ".framework") {
                _this.addDynamicFramework(libraryPath).wait();
            }
            else {
                _this.$errors.failWithoutHelp("The bundle at " + libraryPath + " does not appear to be a dynamic framework package.");
            }
        }).future()();
    };
    IOSProjectService.prototype.deploy = function (deviceIdentifier) {
        return Future.fromResult();
    };
    IOSProjectService.prototype.addDynamicFramework = function (frameworkPath) {
        var _this = this;
        return (function () {
            _this.validateFramework(frameworkPath).wait();
            var targetPath = path.join("lib", _this.platformData.normalizedPlatformName);
            var fullTargetPath = path.join(_this.$projectData.projectDir, targetPath);
            _this.$fs.ensureDirectoryExists(fullTargetPath).wait();
            shell.cp("-R", frameworkPath, fullTargetPath);
            var project = _this.createPbxProj();
            var frameworkName = path.basename(frameworkPath, path.extname(frameworkPath));
            var frameworkBinaryPath = path.join(frameworkPath, frameworkName);
            var isDynamic = _.contains(_this.$childProcess.exec("otool -Vh " + frameworkBinaryPath).wait(), " DYLIB ");
            var frameworkAddOptions = { customFramework: true };
            if (isDynamic) {
                frameworkAddOptions["embed"] = true;
                project.updateBuildProperty("IPHONEOS_DEPLOYMENT_TARGET", "8.0");
                _this.$logger.info("The iOS Deployment Target is now 8.0 in order to support Cocoa Touch Frameworks.");
            }
            var frameworkRelativePath = _this.getLibSubpathRelativeToProjectPath(path.basename(frameworkPath));
            project.addFramework(frameworkRelativePath, frameworkAddOptions);
            _this.savePbxProj(project).wait();
        }).future()();
    };
    IOSProjectService.prototype.addStaticLibrary = function (staticLibPath) {
        var _this = this;
        return (function () {
            _this.validateStaticLibrary(staticLibPath).wait();
            var libraryName = path.basename(staticLibPath, ".a");
            var libDestinationPath = path.join(_this.$projectData.projectDir, path.join("lib", _this.platformData.normalizedPlatformName));
            var headersSubpath = path.join("include", libraryName);
            _this.$fs.ensureDirectoryExists(path.join(libDestinationPath, headersSubpath)).wait();
            shell.cp("-Rf", staticLibPath, libDestinationPath);
            shell.cp("-Rf", path.join(path.dirname(staticLibPath), headersSubpath), path.join(libDestinationPath, "include"));
            var project = _this.createPbxProj();
            var relativeStaticLibPath = _this.getLibSubpathRelativeToProjectPath(path.basename(staticLibPath));
            project.addFramework(relativeStaticLibPath);
            var relativeHeaderSearchPath = path.join(_this.getLibSubpathRelativeToProjectPath(headersSubpath));
            project.addToHeaderSearchPaths({ relativePath: relativeHeaderSearchPath });
            _this.generateMobulemap(path.join(libDestinationPath, headersSubpath), libraryName);
            _this.savePbxProj(project).wait();
        }).future()();
    };
    IOSProjectService.prototype.canUpdatePlatform = function (currentVersion, newVersion) {
        var _this = this;
        return (function () {
            var currentXcodeProjectFile = _this.buildPathToXcodeProjectFile(currentVersion);
            var currentXcodeProjectFileContent = _this.$fs.readFile(currentXcodeProjectFile).wait();
            var newXcodeProjectFile = _this.buildPathToXcodeProjectFile(newVersion);
            var newXcodeProjectFileContent = _this.$fs.readFile(newXcodeProjectFile).wait();
            return currentXcodeProjectFileContent === newXcodeProjectFileContent;
        }).future()();
    };
    IOSProjectService.prototype.updatePlatform = function (currentVersion, newVersion, canUpdate) {
        var _this = this;
        return (function () {
            if (!canUpdate) {
                var isUpdateConfirmed = _this.$prompter.confirm("We need to override xcodeproj file. The old one will be saved at " + _this.$options.profileDir + ". Are you sure?", function () { return true; }).wait();
                if (isUpdateConfirmed) {
                    var sourceDir = path.join(_this.platformData.projectRoot, _this.$projectData.projectName + ".xcodeproj");
                    var destinationDir = path.join(_this.$options.profileDir, "xcodeproj");
                    _this.$fs.deleteDirectory(destinationDir).wait();
                    shell.cp("-R", path.join(sourceDir, "*"), destinationDir);
                    _this.$logger.info("Backup file " + sourceDir + " at location " + destinationDir);
                    _this.$fs.deleteDirectory(sourceDir).wait();
                    var cachedPackagePath = path.join(_this.$npmInstallationManager.getCachedPackagePath(_this.platformData.frameworkPackageName, newVersion), constants.PROJECT_FRAMEWORK_FOLDER_NAME, util.format("%s.xcodeproj", IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER));
                    shell.cp("-R", path.join(cachedPackagePath, "*"), sourceDir);
                    _this.$logger.info("Copied from " + cachedPackagePath + " at " + _this.platformData.projectRoot + ".");
                    var pbxprojFilePath = path.join(_this.platformData.projectRoot, _this.$projectData.projectName + IOSProjectService.XCODE_PROJECT_EXT_NAME, "project.pbxproj");
                    _this.replaceFileContent(pbxprojFilePath).wait();
                }
                return isUpdateConfirmed;
            }
            return true;
        }).future()();
    };
    IOSProjectService.prototype.prepareProject = function () {
        var _this = this;
        return (function () {
            var project = _this.createPbxProj();
            var resources = project.pbxGroupByName("Resources");
            if (resources) {
                var references = project.pbxFileReferenceSection();
                var xcodeProjectImages = _.map(resources.children, function (resource) { return _this.replace(references[resource.value].name); });
                _this.$logger.trace("Images from Xcode project");
                _this.$logger.trace(xcodeProjectImages);
                var appResourcesImages = _this.$fs.readDirectory(_this.getAppResourcesDestinationDirectoryPath().wait()).wait();
                _this.$logger.trace("Current images from App_Resources");
                _this.$logger.trace(appResourcesImages);
                var imagesToAdd = _.difference(appResourcesImages, xcodeProjectImages);
                _this.$logger.trace("New images to add into xcode project: " + imagesToAdd.join(", "));
                _.each(imagesToAdd, function (image) { return project.addResourceFile(path.relative(_this.platformData.projectRoot, path.join(_this.getAppResourcesDestinationDirectoryPath().wait(), image))); });
                var imagesToRemove = _.difference(xcodeProjectImages, appResourcesImages);
                _this.$logger.trace("Images to remove from xcode project: " + imagesToRemove.join(", "));
                _.each(imagesToRemove, function (image) { return project.removeResourceFile(path.join(_this.getAppResourcesDestinationDirectoryPath().wait(), image)); });
                _this.savePbxProj(project).wait();
            }
        }).future()();
    };
    IOSProjectService.prototype.prepareAppResources = function (appResourcesDirectoryPath) {
        var _this = this;
        return (function () {
            _this.$fs.deleteDirectory(_this.getAppResourcesDestinationDirectoryPath().wait()).wait();
        }).future()();
    };
    IOSProjectService.prototype.processConfigurationFilesFromAppResources = function () {
        return Future.fromResult();
    };
    Object.defineProperty(IOSProjectService.prototype, "projectPodFilePath", {
        get: function () {
            return path.join(this.platformData.projectRoot, "Podfile");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSProjectService.prototype, "pluginsDebugXcconfigFilePath", {
        get: function () {
            return path.join(this.platformData.projectRoot, "plugins-debug.xcconfig");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSProjectService.prototype, "pluginsReleaseXcconfigFilePath", {
        get: function () {
            return path.join(this.platformData.projectRoot, "plugins-release.xcconfig");
        },
        enumerable: true,
        configurable: true
    });
    IOSProjectService.prototype.replace = function (name) {
        if (_.startsWith(name, '"')) {
            name = name.substr(1, name.length - 2);
        }
        return name.replace(/\\\"/g, "\"");
    };
    IOSProjectService.prototype.getLibSubpathRelativeToProjectPath = function (subPath) {
        var targetPath = path.join("lib", this.platformData.normalizedPlatformName);
        var frameworkPath = path.relative("platforms/ios", path.join(targetPath, subPath));
        return frameworkPath;
    };
    Object.defineProperty(IOSProjectService.prototype, "pbxProjPath", {
        get: function () {
            return path.join(this.platformData.projectRoot, this.$projectData.projectName + ".xcodeproj", "project.pbxproj");
        },
        enumerable: true,
        configurable: true
    });
    IOSProjectService.prototype.createPbxProj = function () {
        var project = new xcode.project(this.pbxProjPath);
        project.parseSync();
        return project;
    };
    IOSProjectService.prototype.savePbxProj = function (project) {
        return this.$fs.writeFile(this.pbxProjPath, project.writeSync());
    };
    IOSProjectService.prototype.preparePluginNativeCode = function (pluginData, opts) {
        var _this = this;
        return (function () {
            var pluginPlatformsFolderPath = pluginData.pluginPlatformsFolderPath(IOSProjectService.IOS_PLATFORM_NAME);
            _this.prepareFrameworks(pluginPlatformsFolderPath, pluginData).wait();
            _this.prepareStaticLibs(pluginPlatformsFolderPath, pluginData).wait();
            _this.prepareCocoapods(pluginPlatformsFolderPath).wait();
        }).future()();
    };
    IOSProjectService.prototype.removePluginNativeCode = function (pluginData) {
        var _this = this;
        return (function () {
            var pluginPlatformsFolderPath = pluginData.pluginPlatformsFolderPath(IOSProjectService.IOS_PLATFORM_NAME);
            _this.removeFrameworks(pluginPlatformsFolderPath, pluginData).wait();
            _this.removeStaticLibs(pluginPlatformsFolderPath, pluginData).wait();
            _this.removeCocoapods(pluginPlatformsFolderPath).wait();
        }).future()();
    };
    IOSProjectService.prototype.afterPrepareAllPlugins = function () {
        var _this = this;
        return (function () {
            if (_this.$fs.exists(_this.projectPodFilePath).wait()) {
                var projectPodfileContent = _this.$fs.readText(_this.projectPodFilePath).wait();
                _this.$logger.trace("Project Podfile content");
                _this.$logger.trace(projectPodfileContent);
                var firstPostInstallIndex = projectPodfileContent.indexOf(IOSProjectService.PODFILE_POST_INSTALL_SECTION_NAME);
                if (firstPostInstallIndex !== -1 && firstPostInstallIndex !== projectPodfileContent.lastIndexOf(IOSProjectService.PODFILE_POST_INSTALL_SECTION_NAME)) {
                    _this.$logger.warn("Podfile contains more than one post_install sections. You need to open " + _this.projectPodFilePath + " file and manually resolve this issue.");
                }
                var pbxprojFilePath = path.join(_this.platformData.projectRoot, _this.$projectData.projectName + IOSProjectService.XCODE_PROJECT_EXT_NAME, "xcuserdata");
                if (!_this.$fs.exists(pbxprojFilePath).wait()) {
                    _this.$logger.info("Creating project scheme...");
                    var createSchemeRubyScript = "ruby -e \"require 'xcodeproj'; xcproj = Xcodeproj::Project.open('" + _this.$projectData.projectName + ".xcodeproj'); xcproj.recreate_user_schemes; xcproj.save\"";
                    _this.$childProcess.exec(createSchemeRubyScript, { cwd: _this.platformData.projectRoot }).wait();
                }
                _this.executePodInstall().wait();
            }
            _this.regeneratePluginsXcconfigFile().wait();
        }).future()();
    };
    IOSProjectService.prototype.getAllLibsForPluginWithFileExtension = function (pluginData, fileExtension) {
        var filterCallback = function (fileName, pluginPlatformsFolderPath) { return path.extname(fileName) === fileExtension; };
        return this.getAllNativeLibrariesForPlugin(pluginData, IOSProjectService.IOS_PLATFORM_NAME, filterCallback);
    };
    ;
    IOSProjectService.prototype.buildPathToXcodeProjectFile = function (version) {
        return path.join(this.$npmInstallationManager.getCachedPackagePath(this.platformData.frameworkPackageName, version), constants.PROJECT_FRAMEWORK_FOLDER_NAME, util.format("%s.xcodeproj", IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER), "project.pbxproj");
    };
    IOSProjectService.prototype.validateFramework = function (libraryPath) {
        var _this = this;
        return (function () {
            var infoPlistPath = path.join(libraryPath, "Info.plist");
            if (!_this.$fs.exists(infoPlistPath).wait()) {
                _this.$errors.failWithoutHelp("The bundle at %s does not contain an Info.plist file.", libraryPath);
            }
            var packageType = _this.$childProcess.exec("/usr/libexec/PlistBuddy -c \"Print :CFBundlePackageType\" \"" + infoPlistPath + "\"").wait().trim();
            if (packageType !== "FMWK") {
                _this.$errors.failWithoutHelp("The bundle at %s does not appear to be a dynamic framework.", libraryPath);
            }
        }).future()();
    };
    IOSProjectService.prototype.validateStaticLibrary = function (libraryPath) {
        var _this = this;
        return (function () {
            if (path.extname(libraryPath) !== ".a") {
                _this.$errors.failWithoutHelp("The bundle at " + libraryPath + " does not contain a valid static library in the '.a' file format.");
            }
            var expectedArchs = ["armv7", "arm64", "i386"];
            var archsInTheFatFile = _this.$childProcess.exec("lipo -i " + libraryPath).wait();
            expectedArchs.forEach(function (expectedArch) {
                if (archsInTheFatFile.indexOf(expectedArch) < 0) {
                    _this.$errors.failWithoutHelp("The static library at " + libraryPath + " is not built for one or more of the following required architectures: " + expectedArchs.join(", ") + ". The static library must be built for all required architectures.");
                }
            });
        }).future()();
    };
    IOSProjectService.prototype.replaceFileContent = function (file) {
        var _this = this;
        return (function () {
            var fileContent = _this.$fs.readText(file).wait();
            var replacedContent = helpers.stringReplaceAll(fileContent, IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER, _this.$projectData.projectName);
            _this.$fs.writeFile(file, replacedContent).wait();
        }).future()();
    };
    IOSProjectService.prototype.replaceFileName = function (fileNamePart, fileRootLocation) {
        var _this = this;
        return (function () {
            var oldFileName = IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER + fileNamePart;
            var newFileName = _this.$projectData.projectName + fileNamePart;
            _this.$fs.rename(path.join(fileRootLocation, oldFileName), path.join(fileRootLocation, newFileName)).wait();
        }).future()();
    };
    IOSProjectService.prototype.executePodInstall = function () {
        var _this = this;
        return (function () {
            try {
                _this.$childProcess.exec("gem which cocoapods").wait();
                _this.$childProcess.exec("gem which xcodeproj").wait();
            }
            catch (e) {
                _this.$errors.failWithoutHelp("CocoaPods or ruby gem 'xcodeproj' is not installed. Run `sudo gem install cocoapods` and try again.");
            }
            _this.$logger.info("Installing pods...");
            var podTool = _this.$config.USE_POD_SANDBOX ? "sandbox-pod" : "pod";
            var childProcess = _this.$childProcess.spawnFromEvent(podTool, ["install"], "close", { cwd: _this.platformData.projectRoot, stdio: ['pipe', process.stdout, 'pipe'] }).wait();
            if (childProcess.stderr) {
                var warnings = childProcess.stderr.match(/(\u001b\[(?:\d*;){0,5}\d*m[\s\S]+?\u001b\[(?:\d*;){0,5}\d*m)|(\[!\].*?\n)|(.*?warning.*)/gi);
                _.each(warnings, function (warning) {
                    _this.$logger.warnWithLabel(warning.replace("\n", ""));
                });
                var errors = childProcess.stderr;
                _.each(warnings, function (warning) {
                    errors = errors.replace(warning, "");
                });
                if (errors.trim()) {
                    _this.$errors.failWithoutHelp("Pod install command failed. Error output: " + errors);
                }
            }
            return childProcess;
        }).future()();
    };
    IOSProjectService.prototype.prepareFrameworks = function (pluginPlatformsFolderPath, pluginData) {
        var _this = this;
        return (function () {
            _.each(_this.getAllLibsForPluginWithFileExtension(pluginData, ".framework").wait(), function (fileName) { return _this.addDynamicFramework(path.join(pluginPlatformsFolderPath, fileName)).wait(); });
        }).future()();
    };
    IOSProjectService.prototype.prepareStaticLibs = function (pluginPlatformsFolderPath, pluginData) {
        var _this = this;
        return (function () {
            _.each(_this.getAllLibsForPluginWithFileExtension(pluginData, ".a").wait(), function (fileName) { return _this.addStaticLibrary(path.join(pluginPlatformsFolderPath, fileName)).wait(); });
        }).future()();
    };
    IOSProjectService.prototype.prepareCocoapods = function (pluginPlatformsFolderPath, opts) {
        var _this = this;
        return (function () {
            var pluginPodFilePath = path.join(pluginPlatformsFolderPath, "Podfile");
            if (_this.$fs.exists(pluginPodFilePath).wait()) {
                if (!_this.$fs.exists(_this.projectPodFilePath).wait()) {
                    _this.$fs.writeFile(_this.projectPodFilePath, "use_frameworks!\n").wait();
                }
                var pluginPodFileContent = _this.$fs.readText(pluginPodFilePath).wait();
                var contentToWrite = _this.buildPodfileContent(pluginPodFilePath, pluginPodFileContent);
                _this.$fs.appendFile(_this.projectPodFilePath, contentToWrite).wait();
                var project = _this.createPbxProj();
                project.updateBuildProperty("IPHONEOS_DEPLOYMENT_TARGET", "8.0");
                _this.$logger.info("The iOS Deployment Target is now 8.0 in order to support Cocoa Touch Frameworks in CocoaPods.");
                _this.savePbxProj(project).wait();
            }
            if (opts && opts.executePodInstall && _this.$fs.exists(pluginPodFilePath).wait()) {
                _this.executePodInstall().wait();
            }
        }).future()();
    };
    IOSProjectService.prototype.removeFrameworks = function (pluginPlatformsFolderPath, pluginData) {
        var _this = this;
        return (function () {
            var project = _this.createPbxProj();
            _.each(_this.getAllLibsForPluginWithFileExtension(pluginData, ".framework").wait(), function (fileName) {
                var relativeFrameworkPath = _this.getLibSubpathRelativeToProjectPath(fileName);
                project.removeFramework(relativeFrameworkPath, { customFramework: true, embed: true });
            });
            _this.savePbxProj(project).wait();
        }).future()();
    };
    IOSProjectService.prototype.removeStaticLibs = function (pluginPlatformsFolderPath, pluginData) {
        var _this = this;
        return (function () {
            var project = _this.createPbxProj();
            _.each(_this.getAllLibsForPluginWithFileExtension(pluginData, ".a").wait(), function (fileName) {
                var staticLibPath = path.join(pluginPlatformsFolderPath, fileName);
                var relativeStaticLibPath = _this.getLibSubpathRelativeToProjectPath(path.basename(staticLibPath));
                project.removeFramework(relativeStaticLibPath);
                var headersSubpath = path.join("include", path.basename(staticLibPath, ".a"));
                var relativeHeaderSearchPath = path.join(_this.getLibSubpathRelativeToProjectPath(headersSubpath));
                project.removeFromHeaderSearchPaths({ relativePath: relativeHeaderSearchPath });
            });
            _this.savePbxProj(project).wait();
        }).future()();
    };
    IOSProjectService.prototype.removeCocoapods = function (pluginPlatformsFolderPath) {
        var _this = this;
        return (function () {
            var pluginPodFilePath = path.join(pluginPlatformsFolderPath, "Podfile");
            if (_this.$fs.exists(pluginPodFilePath).wait() && _this.$fs.exists(_this.projectPodFilePath).wait()) {
                var pluginPodFileContent = _this.$fs.readText(pluginPodFilePath).wait();
                var projectPodFileContent = _this.$fs.readText(_this.projectPodFilePath).wait();
                var contentToRemove = _this.buildPodfileContent(pluginPodFilePath, pluginPodFileContent);
                projectPodFileContent = helpers.stringReplaceAll(projectPodFileContent, contentToRemove, "");
                if (projectPodFileContent.trim() === "use_frameworks!") {
                    _this.$fs.deleteFile(_this.projectPodFilePath).wait();
                }
                else {
                    _this.$fs.writeFile(_this.projectPodFilePath, projectPodFileContent).wait();
                }
            }
        }).future()();
    };
    IOSProjectService.prototype.buildPodfileContent = function (pluginPodFilePath, pluginPodFileContent) {
        return "# Begin Podfile - " + pluginPodFilePath + " " + os.EOL + " " + pluginPodFileContent + " " + os.EOL + " # End Podfile " + os.EOL;
    };
    IOSProjectService.prototype.generateMobulemap = function (headersFolderPath, libraryName) {
        var _this = this;
        var headersFilter = function (fileName, containingFolderPath) { return (path.extname(fileName) === ".h" && _this.$fs.getFsStats(path.join(containingFolderPath, fileName)).wait().isFile()); };
        var headersFolderContents = this.$fs.readDirectory(headersFolderPath).wait();
        var headers = _(headersFolderContents).filter(function (item) { return headersFilter(item, headersFolderPath); }).value();
        if (!headers.length) {
            this.$fs.deleteFile(path.join(headersFolderPath, "module.modulemap")).wait();
            return;
        }
        headers = _.map(headers, function (value) { return ("header \"" + value + "\""); });
        var modulemap = "module " + libraryName + " { explicit module " + libraryName + " { " + headers.join(" ") + " } }";
        this.$fs.writeFile(path.join(headersFolderPath, "module.modulemap"), modulemap).wait();
    };
    IOSProjectService.prototype.mergeXcconfigFiles = function (pluginFile, projectFile) {
        var _this = this;
        return (function () {
            if (!_this.$fs.exists(projectFile).wait()) {
                _this.$fs.writeFile(projectFile, "").wait();
            }
            var mergeScript = "require 'xcodeproj'; Xcodeproj::Config.new('" + projectFile + "').merge(Xcodeproj::Config.new('" + pluginFile + "')).save_as(Pathname.new('" + projectFile + "'))";
            _this.$childProcess.exec("ruby -e \"" + mergeScript + "\"").wait();
        }).future()();
    };
    IOSProjectService.prototype.regeneratePluginsXcconfigFile = function () {
        var _this = this;
        return (function () {
            _this.$fs.deleteFile(_this.pluginsDebugXcconfigFilePath).wait();
            _this.$fs.deleteFile(_this.pluginsReleaseXcconfigFilePath).wait();
            var allPlugins = _this.$injector.resolve("pluginsService").getAllInstalledPlugins().wait();
            for (var _i = 0; _i < allPlugins.length; _i++) {
                var plugin = allPlugins[_i];
                var pluginPlatformsFolderPath = plugin.pluginPlatformsFolderPath(IOSProjectService.IOS_PLATFORM_NAME);
                var pluginXcconfigFilePath = path.join(pluginPlatformsFolderPath, "build.xcconfig");
                if (_this.$fs.exists(pluginXcconfigFilePath).wait()) {
                    _this.mergeXcconfigFiles(pluginXcconfigFilePath, _this.pluginsDebugXcconfigFilePath).wait();
                    _this.mergeXcconfigFiles(pluginXcconfigFilePath, _this.pluginsReleaseXcconfigFilePath).wait();
                }
            }
            var podFolder = path.join(_this.platformData.projectRoot, "Pods/Target Support Files/Pods/");
            if (_this.$fs.exists(podFolder).wait()) {
                _this.mergeXcconfigFiles(path.join(_this.platformData.projectRoot, "Pods/Target Support Files/Pods/Pods.debug.xcconfig"), _this.pluginsDebugXcconfigFilePath).wait();
                _this.mergeXcconfigFiles(path.join(_this.platformData.projectRoot, "Pods/Target Support Files/Pods/Pods.release.xcconfig"), _this.pluginsReleaseXcconfigFilePath).wait();
            }
        }).future()();
    };
    IOSProjectService.XCODE_PROJECT_EXT_NAME = ".xcodeproj";
    IOSProjectService.XCODEBUILD_MIN_VERSION = "6.0";
    IOSProjectService.IOS_PROJECT_NAME_PLACEHOLDER = "__PROJECT_NAME__";
    IOSProjectService.IOS_PLATFORM_NAME = "ios";
    IOSProjectService.PODFILE_POST_INSTALL_SECTION_NAME = "post_install";
    return IOSProjectService;
})(projectServiceBaseLib.PlatformProjectServiceBase);
exports.IOSProjectService = IOSProjectService;
$injector.register("iOSProjectService", IOSProjectService);
