/**
 * Created by zhs007 on 2014/12/3.
 */

var fs = require('fs');

function csv2obj(str) {
    var obj = [];
    var head = [];

    if (typeof (str) == 'undefined' || str.length <= 0) {
        return obj;
    }

    //var str = csvinfo.toString();

    var lstLine = str.split('\r\n');
    var lines = lstLine.length;
    if (lines > 0) {
        var lstHead = lstLine[0].split(',');
        var numsHead = lstHead.length;

        for (var i = 1; i < lines; ++i) {
            var val = lstLine[i].split(',');
            var nums = val.length;
            if (nums == numsHead) {
                obj[i - 1] = {};
                for(var j = 0; j < numsHead; ++j) {
                    obj[i - 1][lstHead[j]] = val[j];
                }
            }
        }
    }

    return obj;
}

function loadCSVSync(filename) {
    var data = fs.readFileSync(filename);
    return csv2obj(data.toString());
}

exports.csv2obj = csv2obj;
exports.loadCSVSync = loadCSVSync;