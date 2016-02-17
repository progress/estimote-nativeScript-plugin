/**
 * Created by zhs007 on 15/2/9.
 */

var console = require('console');
var fileutils = require('../fileutils');

var srcpath = '/Users/zhs007/work/heysdk/gameengine/newprojcc3/proj.android';
var destpath = '/Users/zhs007/work/heysdk/gameengine/newprojcc3/proj.android.heysdk';

fileutils.copyFileOrDir(srcpath, destpath, function (src, dest, isok) {
    console.log('copy callback ' + src + ' ' + dest + ' ' + isok);
});