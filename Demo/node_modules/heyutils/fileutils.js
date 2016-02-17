/**
 * Created by zhs007 on 2015/1/3.
 */

var fs = require('fs');
var path = require('path');
var strutils = require('./stringutils');

function isDirectory(filename) {
    if (fs.existsSync(filename)) {
        var lstat = fs.lstatSync(filename);
        return lstat.isDirectory();
    }

    return false;
}

function createDirectory(dir) {
    if (!fs.existsSync(dir)) {
        var arr = strutils.splitPath(dir);
        var max = arr.length;
        if (max > 1) {
            var destdir = strutils.makePath(arr, 0, max - 1);

            createDirectory(destdir);
        }

        fs.mkdirSync(dir);
    }
}

function copyfile(src, dest, callback) {
    console.log('copyfile ' + src + ' ' + dest);

    if (strutils.hasWildcard(src) || strutils.hasWildcard(dest)) {
        callback();

        return ;
    }

    if (isDirectory(src)) {
        callback();

        return ;
    }

    var destmax = dest.length;
    if (dest.charAt(destmax - 1) == '/' || dest.charAt(destmax - 1) == '\\') {
        createDirectory(dest);
    }
    else {
        var destarr = strutils.splitPath(dest);
        var destdir = strutils.makePath(destarr, 0, destarr.length - 1);
        if (destdir.length > 0) {
            createDirectory(destdir);
        }
    }

    var destpath = dest;
    if (isDirectory(dest)) {
        var srcfilename = strutils.getFilename(src);
        var destpath = path.join(dest, srcfilename);
    }

    var reads = fs.createReadStream(src);
    var writes = fs.createWriteStream(destpath);
    reads.on("end", function () {
        writes.end();
        callback();
    });
    reads.on("error", function (err) {
        callback();
    });
    reads.pipe(writes);
}

// callback(err, files)
// files is fullpath
function readdirWildcard(destpath, callback) {
    if (!strutils.hasWildcard(destpath)) {
        fs.readdir(destpath, function (err, files) {
            if (err) {
                callback(err, []);

                return ;
            }

            var max = files.length;
            for (var i = 0; i < max; ++i) {
                files[i] = path.join(destpath, files[i]);
            }

            callback(err, files);
        });
    }
    else {
        var arr = strutils.splitPath(destpath);
        var max = arr.length;
        for (var i = 0; i < max; ++i) {
            if (strutils.hasWildcard(arr[i])) {
                var curwildcard = arr[i];
                var curpath = strutils.makePath(arr, 0, i);

                if (i == max - 1) {

                    fs.readdir(curpath, function (err, files) {
                        if (err) {
                            callback(err, []);

                            return ;
                        }

                        var destfiles = [];
                        var maxj = files.length;
                        for (var j = 0; j < maxj; ++j) {
                            if (strutils.equWildcard(files[j], curwildcard)) {
                                destfiles.push(path.join(curpath, files[j]));
                            }
                        }

                        callback(err, destfiles);
                    });
                }
                else {
                    fs.readdir(curpath, function (err, files) {
                        if (err) {
                            callback(err, []);

                            return ;
                        }

                        var maxj = files.length;
                        for (var j = 0; j < maxj; ++j) {
                            if (strutils.equWildcard(files[j], curwildcard)) {
                                var destfile = path.join(curpath, files[j]);
                                if (isDirectory(destfile)) {
                                    var curdestpath = strutils.makePathEx(destfile, arr, i + 1, max - i - 1);
                                    readdirWildcard(curdestpath, callback);
                                }
                            }
                        }
                    });
                }
            }
        }
    }
}

function writeFile(filename, data, callback) {
    var arr = strutils.splitPath(filename);
    var max = arr.length;
    if (max > 1) {
        var destdir = strutils.makePath(arr, 0, max - 1);
        createDirectory(destdir);
    }

    fs.writeFile(filename, data, callback);
}

function delFileOrDirSync(strpath) {
    if (fs.existsSync(strpath)) {
        if (isDirectory(strpath)) {
            fs.readdirSync(strpath).forEach(function (file, index) {
                var curdir = path.join(strpath, file);
                if (isDirectory(curdir)) {
                    delFileOrDirSync(curdir);
                }
                else {
                    fs.unlinkSync(curdir);
                }
            });
            fs.rmdirSync(strpath);
        }
        else {
            fs.unlinkSync(strpath);
        }
    }
}

// callback(srcpath, destpath, isok)
function copyFileOrDir(srcpath, destpath, callback) {
    console.log('copyFileOrDir ' + srcpath + ' ' + destpath);
    if (strutils.hasWildcard(srcpath)) {
        readdirWildcard(srcpath, function (err, files) {
            if (err) {
                callback(srcpath, destpath, false);

                return ;
            }

            var maxi = files.length;
            for (var i = 0; i < maxi; ++i) {
                if (!isDirectory(files[i])) {
                    copyfile(files[i], destpath, function () {
                        if (i == maxi - 1) {
                            callback(srcpath, destpath, true);
                        }
                    });
                }
            }
        });
    }
    else {
        if (isDirectory(srcpath)) {
            createDirectory(destpath);

            var files = fs.readdirSync(srcpath);
            if (files.length == 0) {
                callback(srcpath, destpath, true);

                return ;
            }

            files.forEach(function (file, index) {
                if (file == '.DS_Store') {
                    if (files.length == 1) {
                        callback(srcpath, destpath, true);

                        return ;
                    }

                    return ;
                }

                var cursrcpath = path.join(srcpath, file);
                var curdestpath = path.join(destpath, file);
                if (isDirectory(cursrcpath)) {
                    copyFileOrDir(cursrcpath, curdestpath, function (src, dest, isok) {
                        if (index == files.length - 1) {
                            callback(srcpath, destpath, true);
                        }
                    });
                }
                else {
                    copyfile(cursrcpath, curdestpath, function () {
                        if (index == files.length - 1) {
                            callback(srcpath, destpath, true);
                        }
                    });
                }
            });
        }
        else {
            copyfile(srcpath, destpath, function () {
                callback(srcpath, destpath, true);
            });
        }
    }
}

exports.isDirectory = isDirectory;
exports.createDirectory = createDirectory;

exports.copyfile = copyfile;

exports.readdirWildcard = readdirWildcard;

exports.writeFile = writeFile;

exports.delFileOrDirSync = delFileOrDirSync;

exports.copyFileOrDir = copyFileOrDir;
