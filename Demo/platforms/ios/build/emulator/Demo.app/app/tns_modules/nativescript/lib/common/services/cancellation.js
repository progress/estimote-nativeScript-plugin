///<reference path="../.d.ts"/>
"use strict";
var gaze = require("gaze");
var path = require("path");
var os = require("os");
var Future = require("fibers/future");
var hostInfo = $injector.resolve("hostInfo");
var CancellationService = (function () {
    function CancellationService($fs, $logger) {
        this.$fs = $fs;
        this.$logger = $logger;
        this.watches = {};
        this.$fs.createDirectory(CancellationService.killSwitchDir).wait();
        this.$fs.chmod(CancellationService.killSwitchDir, "0777").wait();
    }
    CancellationService.prototype.begin = function (name) {
        var _this = this;
        return (function () {
            var triggerFile = CancellationService.makeKillSwitchFileName(name);
            if (!_this.$fs.exists(triggerFile).wait()) {
                var stream = _this.$fs.createWriteStream(triggerFile);
                var streamEnd = _this.$fs.futureFromEvent(stream, "finish");
                stream.end();
                streamEnd.wait();
                _this.$fs.chmod(triggerFile, "0777").wait();
            }
            _this.$logger.trace("Starting watch on killswitch %s", triggerFile);
            var watcherInitialized = new Future();
            gaze(triggerFile, function (err, watcher) {
                this.on("deleted", function (filePath) { return process.exit(); });
                if (err) {
                    watcherInitialized.throw(err);
                }
                else {
                    watcherInitialized.return(watcher);
                }
            });
            var watcher = watcherInitialized.wait();
            if (watcher) {
                _this.watches[name] = watcher;
            }
        }).future()();
    };
    CancellationService.prototype.end = function (name) {
        var watcher = this.watches[name];
        delete this.watches[name];
        watcher.close();
    };
    CancellationService.prototype.dispose = function () {
        var _this = this;
        _(this.watches).keys().each(function (name) { return _this.end(name); }).value();
    };
    Object.defineProperty(CancellationService, "killSwitchDir", {
        get: function () {
            return path.join(os.tmpdir(), process.env.SUDO_USER || process.env.USER || process.env.USERNAME || '', "KillSwitches");
        },
        enumerable: true,
        configurable: true
    });
    CancellationService.makeKillSwitchFileName = function (name) {
        return path.join(CancellationService.killSwitchDir, name);
    };
    return CancellationService;
})();
var CancellationServiceDummy = (function () {
    function CancellationServiceDummy() {
    }
    CancellationServiceDummy.prototype.dispose = function () {
    };
    CancellationServiceDummy.prototype.begin = function (name) {
        return Future.fromResult();
    };
    CancellationServiceDummy.prototype.end = function (name) {
    };
    return CancellationServiceDummy;
})();
if (hostInfo.isWindows) {
    $injector.register("cancellation", CancellationService);
}
else {
    $injector.register("cancellation", CancellationServiceDummy);
}
