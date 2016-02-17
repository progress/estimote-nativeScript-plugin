///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var os = require("os");
var util = require("util");
var temp = require("temp");
temp.track();
var TypeScriptCompilationService = (function () {
    function TypeScriptCompilationService($childProcess, $fs, $logger, $config) {
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$config = $config;
    }
    TypeScriptCompilationService.prototype.initialize = function (typeScriptFiles, definitionFiles) {
        this.typeScriptFiles = typeScriptFiles;
        this.definitionFiles = definitionFiles || [];
    };
    TypeScriptCompilationService.prototype.compileAllFiles = function () {
        var _this = this;
        return (function () {
            if (_this.typeScriptFiles.length > 0) {
                var typeScriptCommandsFilePath = path.join(temp.mkdirSync("typeScript-compilation"), "tscommand.txt");
                var typeScriptCompilerOptions = _this.getTypeScriptCompilerOptions().wait();
                var typeScriptDefinitionsFiles = _this.getTypeScriptDefinitionsFiles().wait();
                _this.$fs.writeFile(typeScriptCommandsFilePath, _this.typeScriptFiles.concat(typeScriptDefinitionsFiles).concat(typeScriptCompilerOptions).join(' ')).wait();
                var typeScriptModuleFilePath = require.resolve("typescript");
                var typeScriptModuleDirPath = path.dirname(typeScriptModuleFilePath);
                var typeScriptCompilerPath = path.join(typeScriptModuleDirPath, "tsc");
                var typeScriptCompilerVersion = _this.$fs.readJson(path.join(typeScriptModuleDirPath, "../", "package.json")).wait().version;
                _this.$logger.out("Compiling...".yellow);
                _.each(_this.typeScriptFiles, function (file) {
                    _this.$logger.out(util.format("### Compile ", file).cyan);
                });
                _this.$logger.out(util.format("Using tsc version ", typeScriptCompilerVersion).cyan);
                _this.runCompilation(typeScriptCompilerPath, typeScriptCommandsFilePath).wait();
            }
        }).future()();
    };
    TypeScriptCompilationService.prototype.runCompilation = function (typeScriptCompilerPath, typeScriptCommandsFilePath) {
        var _this = this;
        return (function () {
            var startTime = new Date().getTime();
            var output = _this.$childProcess.spawnFromEvent("node", [typeScriptCompilerPath, "@" + typeScriptCommandsFilePath], "close", undefined, { throwError: false }).wait();
            if (output.exitCode === 0) {
                var endTime = new Date().getTime();
                var time = (endTime - startTime) / 1000;
                _this.$logger.out(util.format("\n Success: %ss for %s typeScript files \n Done without errors.", time.toFixed(2), _this.typeScriptFiles.length).green);
            }
            else {
                var compilerOutput = output.stderr || output.stdout;
                var compilerMessages = _this.getCompilerMessages(compilerOutput);
                _this.logCompilerMessages(compilerMessages, compilerOutput);
            }
        }).future()();
    };
    TypeScriptCompilationService.prototype.getCompilerMessages = function (compilerOutput) {
        // Assumptions:
        //   Level 1 errors = syntax errors - prevent JS emit.
        //   Level 2 errors = semantic errors - *not* prevents JS emit.
        //   Level 5 errors = compiler flag misuse - prevents JS emit.
        var level1ErrorCount = 0, level5ErrorCount = 0, nonEmitPreventingWarningCount = 0;
        var hasPreventEmitErrors = _.reduce(compilerOutput.split("\n"), function (memo, errorMsg) {
            var isPreventEmitError = false;
            if (errorMsg.search(/error TS1\d+:/) >= 0) {
                level1ErrorCount += 1;
                isPreventEmitError = true;
            }
            else if (errorMsg.search(/error TS5\d+:/) >= 0) {
                level5ErrorCount += 1;
                isPreventEmitError = true;
            }
            else if (errorMsg.search(/error TS\d+:/) >= 0) {
                nonEmitPreventingWarningCount += 1;
            }
            return memo || isPreventEmitError;
        }, false) || false;
        return {
            "level1ErrorCount": level1ErrorCount,
            "level5ErrorCount": level5ErrorCount,
            "nonEmitPreventingWarningCount": nonEmitPreventingWarningCount,
            "hasPreventEmitErrors": hasPreventEmitErrors
        };
    };
    TypeScriptCompilationService.prototype.logCompilerMessages = function (compilerMessages, errorMessage) {
        var level1ErrorCount = compilerMessages.level1ErrorCount, level5ErrorCount = compilerMessages.level5ErrorCount, nonEmitPreventingWarningCount = compilerMessages.nonEmitPreventingWarningCount, hasPreventEmitErrors = compilerMessages.hasPreventEmitErrors;
        if (level1ErrorCount + level5ErrorCount + nonEmitPreventingWarningCount > 0) {
            var colorizedMessage = (level1ErrorCount + level5ErrorCount > 0) ? ">>>".red : ">>>".green;
            this.$logger.out(colorizedMessage);
            var errorTitle = "";
            if (level5ErrorCount > 0) {
                errorTitle = this.composeErrorTitle(level5ErrorCount, "compiler flag error");
            }
            if (level1ErrorCount > 0) {
                errorTitle = this.composeErrorTitle(level1ErrorCount, "syntax error");
            }
            if (nonEmitPreventingWarningCount > 0) {
                errorTitle = this.composeErrorTitle(nonEmitPreventingWarningCount, "non-emit-preventing type warning");
            }
            if (hasPreventEmitErrors) {
                process.stderr.write(os.EOL + errorTitle);
                process.stderr.write(errorMessage.red + os.EOL + '>>> '.red);
                process.exit(1);
            }
            else {
                this.$logger.out(errorTitle);
                this.$logger.warn(errorMessage);
                this.$logger.out(('>>>').green);
            }
        }
    };
    TypeScriptCompilationService.prototype.composeErrorTitle = function (count, title) {
        return util.format("%d %s%s %s", count, title, (count === 1) ? '' : 's', os.EOL);
    };
    TypeScriptCompilationService.prototype.getTypeScriptCompilerOptions = function () {
        var _this = this;
        return (function () {
            var compilerOptions = [];
            var options = _this.$config.TYPESCRIPT_COMPILER_OPTIONS;
            if (options) {
                if (options.targetVersion) {
                    compilerOptions.push("--target " + options.targetVersion.toUpperCase());
                }
                if (options.module) {
                    compilerOptions.push("--module " + options.module.toLowerCase());
                }
                if (options.declaration) {
                    compilerOptions.push("--declaration");
                }
                if (options.noImplicitAny) {
                    compilerOptions.push("--noImplicitAny");
                }
                if (options.sourceMap) {
                    compilerOptions.push("--sourcemap");
                }
                if (options.removeComments) {
                    compilerOptions.push("--removeComments");
                }
                if (options.out) {
                    compilerOptions.push("--out ", options.out);
                }
                if (options.outDir) {
                    if (options.out) {
                        _this.$logger.warn("WARNING: Option out and outDir should not be used together".magenta);
                    }
                    compilerOptions.push("--outDir ", options.outDir);
                }
                if (options.sourceRoot) {
                    compilerOptions.push("--sourceRoot ", options.sourceRoot);
                }
                if (options.mapRoot) {
                    compilerOptions.push("--mapRoot ", options.mapRoot);
                }
            }
            return compilerOptions;
        }).future()();
    };
    TypeScriptCompilationService.prototype.getTypeScriptDefinitionsFiles = function () {
        var _this = this;
        return (function () {
            var defaultTypeScriptDefinitionsFilesPath = path.join(__dirname, "../../../resources/typescript-definitions-files");
            var defaultDefinitionsFiles = _this.$fs.readDirectory(defaultTypeScriptDefinitionsFilesPath).wait();
            var remainingDefaultDefinitionFiles = _.filter(defaultDefinitionsFiles, function (defFile) { return !_.any(_this.definitionFiles, function (f) { return path.basename(f) === defFile; }); });
            return _.map(remainingDefaultDefinitionFiles, function (definitionFilePath) {
                return path.join(defaultTypeScriptDefinitionsFilesPath, definitionFilePath);
            }).concat(_this.definitionFiles);
        }).future()();
    };
    return TypeScriptCompilationService;
})();
exports.TypeScriptCompilationService = TypeScriptCompilationService;
$injector.register("typeScriptCompilationService", TypeScriptCompilationService);
