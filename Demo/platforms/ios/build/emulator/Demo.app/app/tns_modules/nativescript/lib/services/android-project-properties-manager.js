///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var AndroidProjectPropertiesManager = (function () {
    function AndroidProjectPropertiesManager($propertiesParser, $fs, $logger, directoryPath) {
        this.$propertiesParser = $propertiesParser;
        this.$fs = $fs;
        this.$logger = $logger;
        this._editor = null;
        this.filePath = null;
        this.dirty = false;
        this.filePath = path.join(directoryPath, "project.properties");
    }
    AndroidProjectPropertiesManager.prototype.getProjectReferences = function () {
        var _this = this;
        return (function () {
            if (!_this.projectReferences || _this.dirty) {
                var allProjectProperties = _this.getAllProjectProperties().wait();
                var allProjectPropertiesKeys = _.keys(allProjectProperties);
                _this.projectReferences = _(allProjectPropertiesKeys)
                    .filter(function (key) { return _.startsWith(key, "android.library.reference."); })
                    .map(function (key) { return _this.createLibraryReference(key, allProjectProperties[key]); })
                    .value();
            }
            return _this.projectReferences;
        }).future()();
    };
    AndroidProjectPropertiesManager.prototype.addProjectReference = function (referencePath) {
        var _this = this;
        return (function () {
            var references = _this.getProjectReferences().wait();
            var libRefExists = _.any(references, function (r) { return path.normalize(r.path) === path.normalize(referencePath); });
            if (!libRefExists) {
                _this.addToPropertyList("android.library.reference", referencePath).wait();
            }
        }).future()();
    };
    AndroidProjectPropertiesManager.prototype.removeProjectReference = function (referencePath) {
        var _this = this;
        return (function () {
            var references = _this.getProjectReferences().wait();
            var libRefExists = _.any(references, function (r) { return path.normalize(r.path) === path.normalize(referencePath); });
            if (libRefExists) {
                _this.removeFromPropertyList("android.library.reference", referencePath).wait();
            }
            else {
                _this.$logger.error("Could not find " + referencePath + ".");
            }
        }).future()();
    };
    AndroidProjectPropertiesManager.prototype.createEditor = function () {
        var _this = this;
        return (function () {
            return _this._editor || _this.$propertiesParser.createEditor(_this.filePath).wait();
        }).future()();
    };
    AndroidProjectPropertiesManager.prototype.buildKeyName = function (key, index) {
        return key + "." + index;
    };
    AndroidProjectPropertiesManager.prototype.getAllProjectProperties = function () {
        return this.$propertiesParser.read(this.filePath);
    };
    AndroidProjectPropertiesManager.prototype.createLibraryReference = function (referenceName, referencePath) {
        return {
            idx: parseInt(referenceName.split("android.library.reference.")[1]),
            key: referenceName,
            path: referencePath,
            adjustedPath: path.join(path.dirname(this.filePath), referencePath)
        };
    };
    AndroidProjectPropertiesManager.prototype.addToPropertyList = function (key, value) {
        var _this = this;
        return (function () {
            var editor = _this.createEditor().wait();
            var i = 1;
            while (editor.get(_this.buildKeyName(key, i))) {
                i++;
            }
            editor.set(_this.buildKeyName(key, i), value);
            _this.$propertiesParser.saveEditor().wait();
            _this.dirty = true;
        }).future()();
    };
    AndroidProjectPropertiesManager.prototype.removeFromPropertyList = function (key, value) {
        var _this = this;
        return (function () {
            var editor = _this.createEditor().wait();
            var valueLowerCase = value.toLowerCase();
            var i = 1;
            var currentValue;
            while (currentValue = editor.get(_this.buildKeyName(key, i))) {
                if (currentValue.toLowerCase() === valueLowerCase) {
                    while (currentValue = editor.get(_this.buildKeyName(key, i + 1))) {
                        editor.set(_this.buildKeyName(key, i), currentValue);
                        i++;
                    }
                    editor.set(_this.buildKeyName(key, i));
                    break;
                }
                i++;
            }
            _this.$propertiesParser.saveEditor().wait();
            _this.dirty = true;
        }).future()();
    };
    return AndroidProjectPropertiesManager;
})();
exports.AndroidProjectPropertiesManager = AndroidProjectPropertiesManager;
