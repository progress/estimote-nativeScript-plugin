///<reference path="../.d.ts"/>
"use strict";
var osenv = require("osenv");
var path = require("path");
var util = require("util");
var AutoCompletionService = (function () {
    function AutoCompletionService($fs, $childProcess, $logger, $staticConfig, $hostInfo) {
        this.$fs = $fs;
        this.$childProcess = $childProcess;
        this.$logger = $logger;
        this.$staticConfig = $staticConfig;
        this.$hostInfo = $hostInfo;
        this.scriptsOk = true;
        this.scriptsUpdated = false;
        this.disableAnalytics = true;
    }
    Object.defineProperty(AutoCompletionService.prototype, "shellProfiles", {
        get: function () {
            if (!this._shellProfiles) {
                this._shellProfiles = [];
                this._shellProfiles.push(this.getHomePath(".bash_profile"));
                this._shellProfiles.push(this.getHomePath(".bashrc"));
                this._shellProfiles.push(this.getHomePath(".zshrc"));
            }
            return this._shellProfiles;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AutoCompletionService.prototype, "cliRunCommandsFile", {
        get: function () {
            if (!this._cliRunCommandsFile) {
                this._cliRunCommandsFile = this.getHomePath(util.format(".%src", this.$staticConfig.CLIENT_NAME.toLowerCase()));
                if (this.$hostInfo.isWindows) {
                    this._cliRunCommandsFile = this._cliRunCommandsFile.replace(/\\/g, "/");
                }
            }
            return this._cliRunCommandsFile;
        },
        enumerable: true,
        configurable: true
    });
    AutoCompletionService.prototype.getTabTabObsoleteRegex = function (clientName) {
        var tabTabStartPoint = util.format(AutoCompletionService.TABTAB_COMPLETION_START_REGEX_PATTERN, clientName.toLowerCase());
        var tabTabEndPoint = util.format(AutoCompletionService.TABTAB_COMPLETION_END_REGEX_PATTERN, clientName.toLowerCase());
        var tabTabRegex = new RegExp(util.format("%s[\\s\\S]*%s", tabTabStartPoint, tabTabEndPoint));
        return tabTabRegex;
    };
    AutoCompletionService.prototype.removeObsoleteAutoCompletion = function () {
        var _this = this;
        return (function () {
            var shellProfilesToBeCleared = _this.shellProfiles;
            shellProfilesToBeCleared.push(_this.getHomePath(".profile"));
            shellProfilesToBeCleared.forEach(function (file) {
                try {
                    var text = _this.$fs.readText(file).wait();
                    var newText = text.replace(_this.getTabTabObsoleteRegex(_this.$staticConfig.CLIENT_NAME), "");
                    if (_this.$staticConfig.CLIENT_NAME_ALIAS) {
                        newText = newText.replace(_this.getTabTabObsoleteRegex(_this.$staticConfig.CLIENT_NAME_ALIAS), "");
                    }
                    if (newText !== text) {
                        _this.$logger.trace("Remove obsolete AutoCompletion from file %s.", file);
                        _this.$fs.writeFile(file, newText).wait();
                    }
                }
                catch (error) {
                    if (error.code !== "ENOENT") {
                        _this.$logger.trace("Error while trying to disable autocompletion for '%s' file. Error is:\n%s", error.toString());
                    }
                }
            });
        }).future()();
    };
    Object.defineProperty(AutoCompletionService.prototype, "completionShellScriptContent", {
        get: function () {
            if (!this._completionShellScriptContent) {
                var startText = util.format(AutoCompletionService.COMPLETION_START_COMMENT_PATTERN, this.$staticConfig.CLIENT_NAME.toLowerCase());
                var content = util.format("if [ -f %s ]; then \n    source %s \nfi", this.cliRunCommandsFile, this.cliRunCommandsFile);
                var endText = util.format(AutoCompletionService.COMPLETION_END_COMMENT_PATTERN, this.$staticConfig.CLIENT_NAME.toLowerCase());
                this._completionShellScriptContent = util.format("\n%s\n%s\n%s\n", startText, content, endText);
            }
            return this._completionShellScriptContent;
        },
        enumerable: true,
        configurable: true
    });
    AutoCompletionService.prototype.isAutoCompletionEnabled = function () {
        var _this = this;
        return (function () {
            var result = true;
            _.each(_this.shellProfiles, function (filePath) {
                result = _this.isNewAutoCompletionEnabledInFile(filePath).wait() || _this.isObsoleteAutoCompletionEnabledInFile(filePath).wait();
                if (!result) {
                    return false;
                }
            });
            return result;
        }).future()();
    };
    AutoCompletionService.prototype.disableAutoCompletion = function () {
        var _this = this;
        return (function () {
            _.each(_this.shellProfiles, function (shellFile) { return _this.removeAutoCompletionFromShellScript(shellFile).wait(); });
            _this.removeObsoleteAutoCompletion().wait();
            if (_this.scriptsOk && _this.scriptsUpdated) {
                _this.$logger.out("Restart your shell to disable command auto-completion.");
            }
        }).future()();
    };
    AutoCompletionService.prototype.enableAutoCompletion = function () {
        var _this = this;
        return (function () {
            _this.updateCLIShellScript().wait();
            _.each(_this.shellProfiles, function (shellFile) { return _this.addAutoCompletionToShellScript(shellFile).wait(); });
            _this.removeObsoleteAutoCompletion().wait();
            if (_this.scriptsOk && _this.scriptsUpdated) {
                _this.$logger.out("Restart your shell to enable command auto-completion.");
            }
        }).future()();
    };
    AutoCompletionService.prototype.isObsoleteAutoCompletionEnabled = function () {
        var _this = this;
        return (function () {
            var result = true;
            _.each(_this.shellProfiles, function (shellProfile) {
                result = _this.isObsoleteAutoCompletionEnabledInFile(shellProfile).wait();
                if (!result) {
                    return false;
                }
            });
            return result;
        }).future()();
    };
    AutoCompletionService.prototype.isNewAutoCompletionEnabledInFile = function (fileName) {
        var _this = this;
        return (function () {
            try {
                var data = _this.$fs.readText(fileName).wait();
                if (data && data.indexOf(_this.completionShellScriptContent) !== -1) {
                    return true;
                }
            }
            catch (err) {
                _this.$logger.trace("Error while checking is autocompletion enabled in file %s. Error is: '%s'", fileName, err.toString());
            }
            return false;
        }).future()();
    };
    AutoCompletionService.prototype.isObsoleteAutoCompletionEnabledInFile = function (fileName) {
        var _this = this;
        return (function () {
            try {
                var text = _this.$fs.readText(fileName).wait();
                return text.match(_this.getTabTabObsoleteRegex(_this.$staticConfig.CLIENT_NAME)) || text.match(_this.getTabTabObsoleteRegex(_this.$staticConfig.CLIENT_NAME));
            }
            catch (err) {
                _this.$logger.trace("Error while checking is obsolete autocompletion enabled in file %s. Error is: '%s'", fileName, err.toString());
            }
        }).future()();
    };
    AutoCompletionService.prototype.addAutoCompletionToShellScript = function (fileName) {
        var _this = this;
        return (function () {
            try {
                if (!_this.isNewAutoCompletionEnabledInFile(fileName).wait() || _this.isObsoleteAutoCompletionEnabledInFile(fileName).wait()) {
                    _this.$logger.trace("AutoCompletion is not enabled in %s file. Trying to enable it.", fileName);
                    _this.$fs.appendFile(fileName, _this.completionShellScriptContent).wait();
                    _this.scriptsUpdated = true;
                }
            }
            catch (err) {
                _this.$logger.out("Unable to update %s. Command-line completion might not work.", fileName);
                if ((err.code === "EPERM" || err.code === "EACCES") && !_this.$hostInfo.isWindows && process.env.SUDO_USER) {
                    _this.$logger.out("To enable command-line completion, run '$ %s autocomplete enable'.", _this.$staticConfig.CLIENT_NAME);
                }
                _this.$logger.trace(err);
                _this.scriptsOk = false;
            }
        }).future()();
    };
    AutoCompletionService.prototype.removeAutoCompletionFromShellScript = function (fileName) {
        var _this = this;
        return (function () {
            try {
                if (_this.isNewAutoCompletionEnabledInFile(fileName).wait()) {
                    _this.$logger.trace("AutoCompletion is enabled in %s file. Trying to disable it.", fileName);
                    var data = _this.$fs.readText(fileName).wait();
                    data = data.replace(_this.completionShellScriptContent, "");
                    _this.$fs.writeFile(fileName, data).wait();
                    _this.scriptsUpdated = true;
                }
            }
            catch (err) {
                if (err.code !== "ENOENT") {
                    _this.$logger.out("Failed to update %s. Auto-completion may still work or work incorrectly. ", fileName);
                    _this.$logger.out(err);
                    _this.scriptsOk = false;
                }
            }
        }).future()();
    };
    AutoCompletionService.prototype.updateCLIShellScript = function () {
        var _this = this;
        return (function () {
            var filePath = _this.cliRunCommandsFile;
            try {
                var doUpdate = true;
                if (_this.$fs.exists(filePath).wait()) {
                    var contents = _this.$fs.readText(filePath).wait();
                    var regExp = new RegExp(util.format("%s\\s+completion\\s+--\\s+", _this.$staticConfig.CLIENT_NAME.toLowerCase()));
                    var matchCondition = contents.match(regExp);
                    if (_this.$staticConfig.CLIENT_NAME_ALIAS) {
                        matchCondition = matchCondition || contents.match(new RegExp(util.format("%s\\s+completion\\s+--\\s+", _this.$staticConfig.CLIENT_NAME_ALIAS.toLowerCase())));
                    }
                    if (matchCondition) {
                        doUpdate = false;
                    }
                }
                if (doUpdate) {
                    var clientExecutableFileName = (_this.$staticConfig.CLIENT_NAME_ALIAS || _this.$staticConfig.CLIENT_NAME).toLowerCase();
                    var pathToExecutableFile = path.join(__dirname, "../../../bin/" + clientExecutableFileName + ".js");
                    _this.$childProcess.exec(process.argv[0] + " " + pathToExecutableFile + " completion >> " + filePath).wait();
                    _this.$fs.chmod(filePath, "0644").wait();
                }
            }
            catch (err) {
                _this.$logger.out("Failed to update %s. Auto-completion may not work. ", filePath);
                _this.$logger.trace(err);
                _this.scriptsOk = false;
            }
        }).future()();
    };
    AutoCompletionService.prototype.getHomePath = function (fileName) {
        return path.join(osenv.home(), fileName);
    };
    AutoCompletionService.COMPLETION_START_COMMENT_PATTERN = "###-%s-completion-start-###";
    AutoCompletionService.COMPLETION_END_COMMENT_PATTERN = "###-%s-completion-end-###";
    AutoCompletionService.TABTAB_COMPLETION_START_REGEX_PATTERN = "###-begin-%s-completion-###";
    AutoCompletionService.TABTAB_COMPLETION_END_REGEX_PATTERN = "###-end-%s-completion-###";
    return AutoCompletionService;
})();
exports.AutoCompletionService = AutoCompletionService;
$injector.register("autoCompletionService", AutoCompletionService);
