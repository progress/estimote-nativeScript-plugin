///<reference path=".d.ts"/>
"use strict";
exports.APP_FOLDER_NAME = "app";
exports.APP_RESOURCES_FOLDER_NAME = "App_Resources";
exports.PROJECT_FRAMEWORK_FOLDER_NAME = "framework";
exports.NATIVESCRIPT_KEY_NAME = "nativescript";
exports.NODE_MODULES_FOLDER_NAME = "node_modules";
exports.TNS_MODULES_FOLDER_NAME = "tns_modules";
exports.TNS_CORE_MODULES_NAME = "tns-core-modules";
exports.PACKAGE_JSON_FILE_NAME = "package.json";
exports.NODE_MODULE_CACHE_PATH_KEY_NAME = "node-modules-cache-path";
exports.DEFAULT_APP_IDENTIFIER_PREFIX = "org.nativescript";
exports.LIVESYNC_EXCLUDED_DIRECTORIES = ["app_resources"];
exports.TESTING_FRAMEWORKS = ['jasmine', 'mocha', 'qunit'];
exports.TEST_RUNNER_NAME = "nativescript-unit-test-runner";
var ReleaseType = (function () {
    function ReleaseType() {
    }
    ReleaseType.MAJOR = "major";
    ReleaseType.PREMAJOR = "premajor";
    ReleaseType.MINOR = "minor";
    ReleaseType.PREMINOR = "preminor";
    ReleaseType.PATCH = "patch";
    ReleaseType.PREPATCH = "prepatch";
    ReleaseType.PRERELEASE = "prerelease";
    return ReleaseType;
})();
exports.ReleaseType = ReleaseType;
