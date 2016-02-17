///<reference path="../.d.ts"/>
"use strict";
var path = require("path");
var AddLibraryCommand = (function () {
    function AddLibraryCommand($platformService, $errors, $logger, $fs) {
        this.$platformService = $platformService;
        this.$errors = $errors;
        this.$logger = $logger;
        this.$fs = $fs;
        this.allowedParameters = [];
    }
    AddLibraryCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            _this.$logger.warn("IMPORTANT: The `tns library add` command is deprecated and will be removed in a future release. Use the plugin set of commands instead. For more information, run `tns help plugin`.");
            var platform = args[0];
            var libraryPath = path.resolve(args[1]);
            _this.$platformService.addLibrary(platform, libraryPath).wait();
            _this.$logger.info("Library " + libraryPath + " was successfully added for " + platform + " platform.");
        }).future()();
    };
    AddLibraryCommand.prototype.canExecute = function (args) {
        var _this = this;
        return (function () {
            if (args.length !== 2) {
                _this.$errors.fail("This command needs two parameters.");
            }
            var platform = args[0];
            var platformLowerCase = platform.toLowerCase();
            var libraryPath = path.resolve(args[1]);
            if (platformLowerCase === "android") {
                if (!_this.$fs.exists(path.join(libraryPath, "project.properties")).wait()) {
                    var files = _this.$fs.enumerateFilesInDirectorySync(libraryPath);
                    if (!_.any(files, function (file) { return path.extname(file) === ".jar"; })) {
                        _this.$errors.failWithoutHelp("Invalid library path. Ensure that the library path is the file path to a directory " +
                            "containing one or more `*.jar` files or to a directory containing the `project.properties` files.");
                    }
                }
            }
            else if (platformLowerCase === "ios") {
                if (path.extname(libraryPath) !== ".framework") {
                    _this.$errors.failWithoutHelp("Invalid library path. Ensure that the library path is a Cocoa Touch Framework with " +
                        "all build architectures enabled.");
                }
            }
            _this.$platformService.validatePlatformInstalled(args[0]);
            return true;
        }).future()();
    };
    return AddLibraryCommand;
})();
exports.AddLibraryCommand = AddLibraryCommand;
$injector.registerCommand("library|add", AddLibraryCommand);
