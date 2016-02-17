///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var lockfile = require("lockfile");
var path = require("path");
var LockFile = (function () {
    function LockFile($options) {
        this.$options = $options;
        this.lockFilePath = path.join(this.$options.profileDir, ".lock");
    }
    LockFile.prototype.lock = function () {
        var future = new Future();
        lockfile.lock(this.lockFilePath, LockFile.LOCK_PARAMS, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    LockFile.prototype.unlock = function () {
        var future = new Future();
        lockfile.unlock(this.lockFilePath, function (err) {
            if (err) {
                future.throw(err);
            }
            else {
                future.return();
            }
        });
        return future;
    };
    LockFile.LOCK_EXPIRY_PERIOD_SEC = 180;
    LockFile.LOCK_PARAMS = {
        retryWait: 100,
        retries: LockFile.LOCK_EXPIRY_PERIOD_SEC * 10,
        stale: LockFile.LOCK_EXPIRY_PERIOD_SEC * 1000
    };
    return LockFile;
})();
exports.LockFile = LockFile;
$injector.register("lockfile", LockFile);
