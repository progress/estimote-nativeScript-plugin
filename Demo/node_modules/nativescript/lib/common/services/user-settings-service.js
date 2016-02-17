///<reference path="../.d.ts"/>
"use strict";
var UserSettingsServiceBase = (function () {
    function UserSettingsServiceBase(userSettingsFilePath, $fs) {
        this.$fs = $fs;
        this.userSettingsFilePath = null;
        this.userSettingsData = null;
        this.userSettingsFilePath = userSettingsFilePath;
    }
    UserSettingsServiceBase.prototype.getSettingValue = function (settingName) {
        var _this = this;
        return (function () {
            _this.loadUserSettingsFile().wait();
            return _this.userSettingsData ? _this.userSettingsData[settingName] : null;
        }).future()();
    };
    UserSettingsServiceBase.prototype.saveSetting = function (key, value) {
        var settingObject = {};
        settingObject[key] = value;
        return this.saveSettings(settingObject);
    };
    UserSettingsServiceBase.prototype.saveSettings = function (data) {
        var _this = this;
        return (function () {
            _this.loadUserSettingsFile().wait();
            _this.userSettingsData = _this.userSettingsData || {};
            Object.keys(data).forEach(function (propertyName) {
                _this.userSettingsData[propertyName] = data[propertyName];
            });
            _this.$fs.writeJson(_this.userSettingsFilePath, _this.userSettingsData, "\t").wait();
        }).future()();
    };
    UserSettingsServiceBase.prototype.loadUserSettingsFile = function () {
        var _this = this;
        return (function () {
            if (!_this.userSettingsData) {
                if (!_this.$fs.exists(_this.userSettingsFilePath).wait()) {
                    _this.$fs.writeFile(_this.userSettingsFilePath, null).wait();
                }
                _this.userSettingsData = _this.$fs.readJson(_this.userSettingsFilePath).wait();
            }
        }).future()();
    };
    return UserSettingsServiceBase;
})();
exports.UserSettingsServiceBase = UserSettingsServiceBase;
