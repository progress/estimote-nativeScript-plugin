///<reference path=".d.ts"/>
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var fs = require("fs");
var Future = require("fibers/future");
var path = require("path");
var rimraf = require("rimraf");
var minimatch = require("minimatch");
var decorators = require("./decorators");
var injector = require("./yok");
var crypto = require("crypto");
var FileSystem = (function () {
    function FileSystem($injector, $hostInfo) {
        this.$injector = $injector;
        this.$hostInfo = $hostInfo;
    }
    FileSystem.prototype.zipFiles = function (zipFile, files, zipPathCallback) {
        var $logger = this.$injector.resolve("logger");
        var zipstream = require("zipstream");
        var zip = zipstream.createZip({ level: 9 });
        var outFile = fs.createWriteStream(zipFile);
        zip.pipe(outFile);
        var result = new Future();
        outFile.on("error", function (err) { return result.throw(err); });
        var fileIdx = -1;
        var zipCallback = function () {
            fileIdx++;
            if (fileIdx < files.length) {
                var file = files[fileIdx];
                var relativePath = zipPathCallback(file);
                relativePath = relativePath.replace(/\\/g, "/");
                $logger.trace("zipping as '%s' file '%s'", relativePath, file);
                zip.addFile(fs.createReadStream(file), { name: relativePath }, zipCallback);
            }
            else {
                outFile.on("finish", function () { return result.return(); });
                zip.finalize(function (bytesWritten) {
                    $logger.debug("zipstream: %d bytes written", bytesWritten);
                    outFile.end();
                });
            }
        };
        zipCallback();
        return result;
    };
    FileSystem.prototype.unzip = function (zipFile, destinationDir, options, fileFilters) {
        var _this = this;
        return (function () {
            var shouldOverwriteFiles = !(options && options.overwriteExisitingFiles === false);
            var isCaseSensitive = !(options && options.caseSensitive === false);
            _this.createDirectory(destinationDir).wait();
            var proc;
            if (_this.$hostInfo.isWindows) {
                proc = path.join(__dirname, "resources/platform-tools/unzip/win32/unzip");
            }
            else if (_this.$hostInfo.isDarwin) {
                proc = "unzip";
            }
            else if (_this.$hostInfo.isLinux) {
                proc = "unzip";
            }
            if (!isCaseSensitive) {
                zipFile = _this.findFileCaseInsensitive(zipFile);
            }
            var args = _.flatten(["-b",
                shouldOverwriteFiles ? "-o" : "-n",
                isCaseSensitive ? [] : "-C",
                zipFile,
                fileFilters || [],
                "-d",
                destinationDir]);
            var $childProcess = _this.$injector.resolve("childProcess");
            $childProcess.spawnFromEvent(proc, args, "close", { stdio: "ignore", detached: true }).wait();
        }).future()();
    };
    FileSystem.prototype.findFileCaseInsensitive = function (file) {
        var dir = path.dirname(file);
        var basename = path.basename(file);
        var entries = this.readDirectory(dir).wait();
        var match = minimatch.match(entries, basename, { nocase: true, nonegate: true, nonull: true })[0];
        var result = path.join(dir, match);
        return result;
    };
    FileSystem.prototype.exists = function (path) {
        var future = new Future();
        fs.exists(path, function (exists) { return future.return(exists); });
        return future;
    };
    FileSystem.prototype.tryExecuteFileOperation = function (path, operation, enoentErrorMessage) {
        var _this = this;
        return (function () {
            try {
                operation().wait();
            }
            catch (e) {
                _this.$injector.resolve("$logger").trace("tryExecuteFileOperation failed with error %s.", e);
                if (enoentErrorMessage) {
                    var message = (e.code === "ENOENT") ? enoentErrorMessage : e.message;
                    _this.$injector.resolve("$errors").failWithoutHelp(message);
                }
            }
        }).future()();
    };
    FileSystem.prototype.deleteFile = function (path) {
        var future = new Future();
        fs.unlink(path, function (err) {
            if (err && err.code !== "ENOENT") {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.deleteDirectory = function (directory) {
        var future = new Future();
        rimraf(directory, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.getFileSize = function (path) {
        var _this = this;
        return (function () {
            var stat = _this.getFsStats(path).wait();
            return stat.size;
        }).future()();
    };
    FileSystem.prototype.futureFromEvent = function (eventEmitter, event) {
        var future = new Future();
        eventEmitter.once(event, function () {
            var args = _.toArray(arguments);
            if (event === "error") {
                var err = args[0];
                future.throw(err);
                return;
            }
            switch (args.length) {
                case 0:
                    future.return();
                    break;
                case 1:
                    future.return(args[0]);
                    break;
                default:
                    future.return(args);
                    break;
            }
        });
        return future;
    };
    FileSystem.prototype.createDirectory = function (path) {
        var future = new Future();
        require("mkdirp")(path, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.readDirectory = function (path) {
        var future = new Future();
        fs.readdir(path, function (err, files) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(files);
            }
        });
        return future;
    };
    FileSystem.prototype.readFile = function (filename) {
        var future = new Future();
        fs.readFile(filename, function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(data);
            }
        });
        return future;
    };
    FileSystem.prototype.readText = function (filename, options) {
        options = options || { encoding: "utf8" };
        if (_.isString(options)) {
            options = { encoding: options };
        }
        if (!options.encoding) {
            options.encoding = "utf8";
        }
        var future = new Future();
        fs.readFile(filename, options, function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(data);
            }
        });
        return future;
    };
    FileSystem.prototype.readJson = function (filename, encoding) {
        var _this = this;
        return (function () {
            var data = _this.readText(filename, encoding).wait();
            if (data) {
                return JSON.parse(data.replace(/^\uFEFF/, ""));
            }
            return null;
        }).future()();
    };
    FileSystem.prototype.writeFile = function (filename, data, encoding) {
        var _this = this;
        return (function () {
            _this.createDirectory(path.dirname(filename)).wait();
            var future = new Future();
            fs.writeFile(filename, data, { encoding: encoding }, function (err) {
                if (err) {
                    future.throw(err);
                }
                else {
                    future.return();
                }
            });
            future.wait();
        }).future()();
    };
    FileSystem.prototype.appendFile = function (filename, data, encoding) {
        var future = new Future();
        fs.appendFile(filename, data, { encoding: encoding }, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.writeJson = function (filename, data, space, encoding) {
        if (space === void 0) { space = "\t"; }
        return this.writeFile(filename, JSON.stringify(data, null, space), encoding);
    };
    FileSystem.prototype.copyFile = function (sourceFileName, destinationFileName) {
        if (path.resolve(sourceFileName) === path.resolve(destinationFileName)) {
            return Future.fromResult();
        }
        var res = new Future();
        this.createDirectory(path.dirname(destinationFileName)).wait();
        var source = this.createReadStream(sourceFileName);
        var target = this.createWriteStream(destinationFileName);
        source.on("error", function (e) {
            if (!res.isResolved()) {
                res.throw(e);
            }
        });
        target.on("finish", function () {
            if (!res.isResolved()) {
                res.return();
            }
        })
            .on("error", function (e) {
            if (!res.isResolved()) {
                res.throw(e);
            }
        });
        source.pipe(target);
        return res;
    };
    FileSystem.prototype.createReadStream = function (path, options) {
        return fs.createReadStream(path, options);
    };
    FileSystem.prototype.createWriteStream = function (path, options) {
        return fs.createWriteStream(path, options);
    };
    FileSystem.prototype.chmod = function (path, mode) {
        var future = new Future();
        fs.chmod(path, mode, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.getFsStats = function (path) {
        var future = new Future();
        fs.stat(path, function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return(data);
            }
        });
        return future;
    };
    FileSystem.prototype.getUniqueFileName = function (baseName) {
        var _this = this;
        return (function () {
            if (!_this.exists(baseName).wait()) {
                return baseName;
            }
            var extension = path.extname(baseName);
            var prefix = path.basename(baseName, extension);
            for (var i = 2;; ++i) {
                var numberedName = prefix + i + extension;
                if (!_this.exists(numberedName).wait()) {
                    return numberedName;
                }
            }
        }).future()();
    };
    FileSystem.prototype.isEmptyDir = function (directoryPath) {
        var _this = this;
        return (function () {
            var directoryContent = _this.readDirectory(directoryPath).wait();
            return directoryContent.length === 0;
        }).future()();
    };
    FileSystem.prototype.isRelativePath = function (p) {
        var normal = path.normalize(p);
        var absolute = path.resolve(p);
        return normal !== absolute;
    };
    FileSystem.prototype.ensureDirectoryExists = function (directoryPath) {
        var _this = this;
        return (function () {
            if (!_this.exists(directoryPath).wait()) {
                _this.createDirectory(directoryPath).wait();
            }
        }).future()();
    };
    FileSystem.prototype.rename = function (oldPath, newPath) {
        var future = new Future();
        fs.rename(oldPath, newPath, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.renameIfExists = function (oldPath, newPath) {
        var _this = this;
        return (function () {
            try {
                _this.rename(oldPath, newPath).wait();
                return true;
            }
            catch (e) {
                if (e.code === "ENOENT") {
                    return false;
                }
                throw e;
            }
        }).future()();
    };
    FileSystem.prototype.symlink = function (sourcePath, destinationPath, type) {
        var future = new Future();
        fs.symlink(sourcePath, destinationPath, type, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.closeStream = function (stream) {
        var future = new Future();
        stream.close(function (err, data) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    FileSystem.prototype.setCurrentUserAsOwner = function (path, owner) {
        var _this = this;
        return (function () {
            var $childProcess = _this.$injector.resolve("childProcess");
            if (!_this.$hostInfo.isWindows) {
                var chown = $childProcess.spawn("chown", ["-R", owner, path], { stdio: "ignore", detached: true });
                _this.futureFromEvent(chown, "close").wait();
            }
        }).future()();
    };
    FileSystem.prototype.enumerateFilesInDirectorySync = function (directoryPath, filterCallback, opts, foundFiles) {
        foundFiles = foundFiles || [];
        var contents = this.readDirectory(directoryPath).wait();
        for (var i = 0; i < contents.length; ++i) {
            var file = path.join(directoryPath, contents[i]);
            var stat = this.getFsStats(file).wait();
            if (filterCallback && !filterCallback(file, stat)) {
                continue;
            }
            if (stat.isDirectory()) {
                if (opts && opts.enumerateDirectories) {
                    foundFiles.push(file);
                }
                if (opts && opts.includeEmptyDirectories && this.readDirectory(file).wait().length === 0) {
                    foundFiles.push(file);
                }
                this.enumerateFilesInDirectorySync(file, filterCallback, opts, foundFiles);
            }
            else {
                foundFiles.push(file);
            }
        }
        return foundFiles;
    };
    FileSystem.prototype.getFileShasum = function (fileName, encoding) {
        var future = new Future();
        encoding = encoding || "sha1";
        var logger = this.$injector.resolve("$logger");
        var shasumData = crypto.createHash(encoding);
        var fileStream = this.createReadStream(fileName);
        fileStream.on("data", function (data) {
            shasumData.update(data);
        });
        fileStream.on("end", function () {
            var shasum = shasumData.digest("hex");
            logger.trace("Shasum of file " + fileName + " is " + shasum);
            future.return(shasum);
        });
        fileStream.on("error", function (err) {
            future.throw(err);
        });
        return future;
    };
    FileSystem.prototype.readStdin = function () {
        var future = new Future();
        var buffer = '';
        process.stdin.on('data', function (data) { return buffer += data; });
        process.stdin.on('end', function () { return future.return(buffer); });
        return future;
    };
    Object.defineProperty(FileSystem.prototype, "getFileSize",
        __decorate([
            decorators.exportedPromise("fs")
        ], FileSystem.prototype, "getFileSize", Object.getOwnPropertyDescriptor(FileSystem.prototype, "getFileSize")));
    FileSystem = __decorate([
        injector.register("fs")
    ], FileSystem);
    return FileSystem;
})();
exports.FileSystem = FileSystem;
