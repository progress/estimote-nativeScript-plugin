///<reference path=".d.ts"/>
"use strict";
var util = require("util");
var helpers = require("./helpers");
var yargs = require("yargs");
var OptionType = (function () {
    function OptionType() {
    }
    OptionType.String = "string";
    OptionType.Boolean = "boolean";
    OptionType.Number = "number";
    OptionType.Array = "array";
    OptionType.Object = "object";
    return OptionType;
})();
exports.OptionType = OptionType;
var OptionsBase = (function () {
    function OptionsBase(options, defaultProfileDir, $errors, $staticConfig) {
        this.options = options;
        this.defaultProfileDir = defaultProfileDir;
        this.$errors = $errors;
        this.$staticConfig = $staticConfig;
        this.optionsWhiteList = ["ui", "recursive", "reporter", "require", "timeout", "_", "$0"];
        _.extend(this.options, this.commonOptions, OptionsBase.GLOBAL_OPTIONS);
        this.setArgv();
    }
    Object.defineProperty(OptionsBase.prototype, "shorthands", {
        get: function () {
            var _this = this;
            var result = [];
            _.each(_.keys(this.options), function (optionName) {
                if (_this.options[optionName].alias) {
                    result.push(_this.options[optionName].alias);
                }
            });
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OptionsBase.prototype, "commonOptions", {
        get: function () {
            return {
                "json": { type: OptionType.Boolean },
                "watch": { type: OptionType.Boolean },
                "avd": { type: OptionType.String },
                "timeout": { type: OptionType.String },
                "device": { type: OptionType.String },
                "availableDevices": { type: OptionType.Boolean },
                "appid": { type: OptionType.String },
                "geny": { type: OptionType.String },
                "debugBrk": { type: OptionType.Boolean },
                "debugPort": { type: OptionType.Number },
                "getPort": { type: OptionType.Boolean },
                "start": { type: OptionType.Boolean },
                "stop": { type: OptionType.Boolean },
                "ddi": { type: OptionType.String },
                "justlaunch": { type: OptionType.Boolean },
                "file": { type: OptionType.String },
                "force": { type: OptionType.Boolean, alias: "f" },
                "companion": { type: OptionType.Boolean },
                "emulator": { type: OptionType.Boolean },
                "sdk": { type: OptionType.String },
                var: { type: OptionType.Object },
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OptionsBase.prototype, "optionNames", {
        get: function () {
            return _.keys(this.options);
        },
        enumerable: true,
        configurable: true
    });
    OptionsBase.prototype.getOptionValue = function (optionName) {
        optionName = this.getCorrectOptionName(optionName);
        return this.argv[optionName];
    };
    OptionsBase.prototype.validateOptions = function (commandSpecificDashedOptions) {
        var _this = this;
        if (commandSpecificDashedOptions) {
            this.options = OptionsBase.GLOBAL_OPTIONS;
            _.extend(this.options, commandSpecificDashedOptions);
            this.setArgv();
        }
        var parsed = Object.create(null);
        _.each(_.keys(this.argv), function (optionName) {
            parsed[optionName] = _this.getOptionValue(optionName);
        });
        _.each(parsed, function (value, originalOptionName) {
            if (value === undefined) {
                return;
            }
            var optionName = _this.getCorrectOptionName(originalOptionName);
            if (!_.contains(_this.optionsWhiteList, optionName)) {
                if (!_this.isOptionSupported(optionName)) {
                    _this.$errors.failWithoutHelp("The option '" + originalOptionName + "' is not supported. To see command's options, use '$ " + _this.$staticConfig.CLIENT_NAME.toLowerCase() + " help " + process.argv[2] + "'. To see all commands use '$ " + _this.$staticConfig.CLIENT_NAME.toLowerCase() + " help'.");
                }
                var optionType = _this.getOptionType(optionName);
                var optionValue = parsed[optionName];
                if (_.isArray(optionValue) && optionType !== OptionType.Array) {
                    _this.$errors.fail("You have set the %s option multiple times. Check the correct command syntax below and try again.", originalOptionName);
                }
                else if (optionType === OptionType.String && helpers.isNullOrWhitespace(optionValue)) {
                    _this.$errors.failWithoutHelp("The option '%s' requires non-empty value.", originalOptionName);
                }
                else if (optionType === OptionType.Array && optionValue.length === 0) {
                    _this.$errors.failWithoutHelp("The option '" + originalOptionName + "' requires one or more values, separated by a space.");
                }
            }
        });
    };
    OptionsBase.prototype.getCorrectOptionName = function (optionName) {
        var secondaryOptionName = this.getSecondaryOptionName(optionName);
        return _.contains(this.optionNames, secondaryOptionName) ? secondaryOptionName : optionName;
    };
    OptionsBase.prototype.getOptionType = function (optionName) {
        var option = this.options[optionName] || this.tryGetOptionByAliasName(optionName);
        return option ? option.type : "";
    };
    OptionsBase.prototype.tryGetOptionByAliasName = function (aliasName) {
        var option = _.find(this.options, function (opt) { return opt.alias === aliasName; });
        return option;
    };
    OptionsBase.prototype.isOptionSupported = function (option) {
        if (!this.options[option]) {
            var opt = this.tryGetOptionByAliasName(option);
            return !!opt;
        }
        return true;
    };
    OptionsBase.prototype.getSecondaryOptionName = function (optionName) {
        var matchUpperCaseLetters = optionName.match(/(.+?)([-])([a-zA-Z])(.*)/);
        if (matchUpperCaseLetters) {
            var secondaryOptionName = util.format("%s%s%s", matchUpperCaseLetters[1], matchUpperCaseLetters[3].toUpperCase(), matchUpperCaseLetters[4] || '');
            return this.getSecondaryOptionName(secondaryOptionName);
        }
        return optionName;
    };
    OptionsBase.prototype.setArgv = function () {
        this.argv = yargs(process.argv.slice(2)).options(this.options).argv;
        this.adjustDashedOptions();
    };
    OptionsBase.prototype.adjustDashedOptions = function () {
        this.argv["profileDir"] = this.argv["profileDir"] || this.defaultProfileDir;
        _.each(this.optionNames, function (optionName) {
            Object.defineProperty(OptionsBase.prototype, optionName, {
                configurable: true,
                get: function () {
                    return this.getOptionValue(optionName);
                },
                set: function (value) {
                    this.argv[optionName] = value;
                }
            });
        });
    };
    OptionsBase.GLOBAL_OPTIONS = {
        "log": { type: OptionType.String },
        "verbose": { type: OptionType.Boolean, alias: "v" },
        "version": { type: OptionType.Boolean },
        "help": { type: OptionType.Boolean, alias: "h" },
        "profileDir": { type: OptionType.String },
        "analyticsClient": { type: OptionType.String },
        "path": { type: OptionType.String, alias: "p" },
        "_": { type: OptionType.String }
    };
    return OptionsBase;
})();
exports.OptionsBase = OptionsBase;
