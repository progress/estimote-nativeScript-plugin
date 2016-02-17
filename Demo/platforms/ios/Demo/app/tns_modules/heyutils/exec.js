/**
 * Created by zhs007 on 2014/12/1.
 */

var spawn = require('child_process').spawn;
var console = require('console');
var fs = require('fs');
var path = require('path');
var strutils = require('./stringutils');
var fileutils = require('./fileutils');

function runSpawn(cmd, param, dir, endfunc) {
    scmd = spawn(cmd, param, { cwd: dir });

    var strcmd = buildCmd(cmd, param);
    console.log(strcmd + ' at ' + dir + '--->');

    scmd.stdout.on('data', function (data) {
        console.log('>' + data);
    });

    scmd.stderr.on('data', function (data) {
        console.log('>err:' + data);
    });

    scmd.on('close', function (code) {
        console.log('<-------' + code);

        endfunc();
    });
}

function cmd_heycp(param, dir, callback) {
    var max = param.length;
    if (max != 2) {
        console.log('heycp need src and dest params.');

        callback();

        return ;
    }

    var srcpath = path.join(dir, param[0]);
    var destpath = path.join(dir, param[1]);
    if (strutils.hasWildcard(srcpath)) {
        fileutils.readdirWildcard(srcpath, function (err, files) {
            if (err) {
                callback();

                return ;
            }

            var maxi = files.length;
            for (var i = 0; i < maxi; ++i) {
                if (!fileutils.isDirectory(files[i])) {
                    var curdestpath = path.join(dir, param[1]);
                    fileutils.copyfile(files[i], curdestpath, callback);
                }
            }
        });
    }
    else {
        var srcstat = fs.lstatSync(srcpath);
        if (srcstat.isDirectory()) {
            fileutils.readdirWildcard(srcpath, function (err, files) {
                if (err) {
                    callback();

                    return ;
                }

                var maxi = files.length;
                for (var i = 0; i < maxi; ++i) {
                    if (!fileutils.isDirectory(files[i])) {
                        var destpath = path.join(dir, param[1]);
                        fileutils.copyfile(srcpath, destpath, callback);
                    }
                }
            });
        }
        else {
            var destpath = path.join(dir, param[1]);
            fileutils.copyfile(srcpath, destpath, callback);
        }
    }
}

function cmd_heyrm(param, dir, callback) {
    var max = param.length;
    if (max != 1) {
        console.log('heyrm need dest params.');

        callback();

        return ;
    }

    var srcpath = path.join(dir, param[0]);
    fileutils.delFileOrDirSync(srcpath);
    
    //if (strutils.hasWildcard(srcpath)) {
    //    fileutils.readdirWildcard(srcpath, function (err, files) {
    //        if (err) {
    //            callback();
    //
    //            return ;
    //        }
    //
    //        var maxi = files.length;
    //        for (var i = 0; i < maxi; ++i) {
    //            if (!fileutils.isDirectory(files[i])) {
    //                var destpath = path.join(dir, param[1]);
    //                fileutils.copyfile(files[i], destpath, callback);
    //            }
    //        }
    //    });
    //}
    //else {
    //    var srcstat = fs.lstatSync(srcpath);
    //    if (srcstat.isDirectory()) {
    //        fileutils.readdirWildcard(srcpath, function (err, files) {
    //            if (err) {
    //                callback();
    //
    //                return ;
    //            }
    //
    //            var maxi = files.length;
    //            for (var i = 0; i < maxi; ++i) {
    //                if (!fileutils.isDirectory(files[i])) {
    //                    var destpath = path.join(dir, param[1]);
    //                    fileutils.copyfile(srcpath, destpath, callback);
    //                }
    //            }
    //        });
    //    }
    //    else {
    //        var destpath = path.join(dir, param[1]);
    //        fileutils.copyfile(srcpath, destpath, callback);
    //    }
    //}
}

var heycmd = [
    {cmd: 'heycp', func:cmd_heycp},
    {cmd: 'heyrm', func:cmd_heyrm}
];

function buildCmd(cmd, param) {
    var str = cmd;
    var max = param.length;

    for(var i = 0; i < max; ++i) {
        str = str + ' ' + param[i];
    }

    return str;
}

function run(cmd, param, dir, endfunc) {
    var max = heycmd.length;
    for (var i = 0; i < max; ++i) {
        if (heycmd[i].cmd == cmd) {
            heycmd[i].func(param, dir, endfunc);

            return ;
        }
    }

    runSpawn(cmd, param, dir, endfunc);
}

function runQueue(lst, index) {
    var max = lst.length;
    if(index >= max) {
        return ;
    }

    run(lst[index]['cmd'], lst[index]['param'], lst[index]['dir'], function () {
        runQueue(lst, index + 1);
    })
}

function addCmd(lst, cmd, param, dir) {
    var max = lst.length;
    lst[max] = { cmd: cmd, param: param, dir: dir };
}

function addCmdEx(lst, cmd, dir) {
    var arr = strutils.splitCmd(cmd);
    var param = [];
    var first = arr[0];

    var max = arr.length;
    for(var i = 1; i < max; ++i) {
        param[i - 1] = arr[i];
    }

    var max = lst.length;
    lst[max] = { cmd: first, param: param, dir: dir };
}

exports.run = run;
exports.runQueue = runQueue;
exports.addCmd = addCmd;
exports.addCmdEx = addCmdEx;

//exports.checkPlatform = checkPlatform;