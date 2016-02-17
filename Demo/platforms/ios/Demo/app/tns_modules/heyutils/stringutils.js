/**
 * Created by zhs007 on 2015/1/3.
 */

var path = require('path');

function hasWildcard(str) {
    return str.indexOf('*') >= 0;
}

function equWildcard(dest, wildcard) {
    var arr = wildcard.split('*');
    var max = arr.length;
    if (max > 0) {
        var begin = -1;
        for (var i = 0; i < max; ++i) {
            var cur = dest.indexOf(arr[i]);
            if (cur < 0 || cur < begin) {
                return false;
            }
        }

        return true;
    }

    return dest == wildcard;
}

function isCmdSpace(char) {
    if (' ' == char) {  // space
        return true;
    }
    else if ('  ' == char) {    // tab
        return true;
    }

    return false;
}

function isCmdQuotes(char) {
    if ('"' == char) {
        return true;
    }

    return false;
}

function splitCmd(str) {
    var max = str.length;
    var arr = [];
    var curstr = '';
    var isquotes = false;
    var isspace = true;
    for (var i = 0; i < max; ++i) {
        var curchar = str.charAt(i);

        if (isCmdQuotes(curchar)) {
            isquotes = !isquotes;

            continue ;
        }

        if (isquotes) {
            curstr += curchar;

            continue ;
        }

        if (!isCmdSpace(curchar)) {
            isspace = false;

            curstr += curchar;
        }
        else if (!isspace) {
            isspace = true;

            arr.push(curstr);
            curstr = '';
        }
    }

    if (curstr.length > 0) {
        arr.push(curstr);
    }

    return arr;
}

function splitPath(str) {
    var max = str.length;
    var arr = [];
    var curstr = '';

    for (var i = 0; i < max; ++i) {
        var curchar = str.charAt(i);
        if (curchar == '/' || curchar == '\\') {
            arr.push(curstr);
            curstr = '';
        }
        else {
            curstr += curchar;
        }
    }

    if (curstr.length > 0) {
        arr.push(curstr);
    }

    return arr;
}

function getFilename(str) {
    var arr = splitPath(str);
    var max = arr.length;
    if (max > 0) {
        return arr[max - 1];
    }

    return arr;
}

function makePath(arr, begin, nums) {
    var max = arr.length;
    if (begin < 0) {
        begin = 0;
    }

    if (nums + begin >= max) {
        nums = max - begin;
    }

    if (nums <= 0 || begin >= max) {
        return '';
    }

    var curpath = arr[begin];
    if (curpath.length == 0) {
        curpath = '/';
    }

    for (var i = 1; i < nums; ++i) {
        curpath = path.join(curpath, arr[begin + i]);
    }

    return curpath;
}

function makePathEx(basepath, arr, begin, nums) {
    var max = arr.length;
    if (begin < 0) {
        begin = 0;
    }

    if (nums + begin >= max) {
        nums = max - begin;
    }

    var curpath = basepath;
    for (var i = 0; i < nums; ++i) {
        curpath = path.join(curpath, arr[begin + i]);
    }

    return curpath;
}

function readLine(str) {
    var output = '';
    var max = str.length;
    var isline = false;
    var i = 0;
    for (; i < max; ++i) {
        var cc = str.charAt(i);
        if (cc != '\r' && cc != '\n') {
            if (isline) {
                break;
            }

            output += cc;
        }
        else {
            isline = true;
        }
    }

    if (isline) {
        return {line: output, off: i};
    }

    return null;
}

function trim(str) {
    return str.replace(/(^\s*)|(\s*$)/g, "");
}

function ltrim(str) {
    return str.replace(/(^\s*)/g, "");
}

function rtrim(str) {
    return str.replace(/(\s*$)/g, "");
}

//function isInArray(arr, str) {
//    var max = arr.length;
//    for (var i = 0; i < max; ++i) {
//        if (str == arr[i]) {
//            return true;
//        }
//    }
//
//    return false;
//}

function trimex(str, pattern) {
    if (pattern == undefined) {
        pattern = getPattern_trimex();
    }

    var maxlength = str.length;
    var begin = 0;
    var end = maxlength;

    for(; begin < maxlength; ++begin) {
        if (pattern.indexOf(str.charAt(begin)) < 0) {
            break;
        }
    }

    for(; end > 0; --end) {
        if (pattern.indexOf(str.charAt(end - 1)) < 0) {
            break;
        }
    }

    if (begin > end) {
        return '';
    }

    return str.slice(begin, end);
}

function ltrimex(str, pattern) {
    if (pattern == undefined) {
        pattern = getPattern_trimex();
    }

    var maxlength = str.length;
    var begin = 0;
    var end = maxlength;

    for(; begin < maxlength; ++begin) {
        if (pattern.indexOf(str.charAt(begin)) < 0) {
            break;
        }
    }

    //for(; end > 0; --end) {
    //    if (pattern.indexOf(str.charAt(end - 1)) < 0) {
    //        break;
    //    }
    //}

    if (begin > end) {
        return '';
    }

    return str.slice(begin, end);
}

function rtrimex(str, pattern) {
    if (pattern == undefined) {
        pattern = getPattern_trimex();
    }

    var maxlength = str.length;
    var begin = 0;
    var end = maxlength;

    //for(; begin < maxlength; ++begin) {
    //    if (pattern.indexOf(str.charAt(begin)) < 0) {
    //        break;
    //    }
    //}

    for(; end > 0; --end) {
        if (pattern.indexOf(str.charAt(end - 1)) < 0) {
            break;
        }
    }

    if (begin > end) {
        return '';
    }

    return str.slice(begin, end);
}

function getPattern_trimex() {
    return ' \r\n\t';
}

function getPattern_word() {
    return 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
}

function canUsedWord(c, pattern) {
    if (pattern == undefined) {
        pattern = getPattern_word();
    }

    return pattern.indexOf(c) >= 0;
}

function isWord(str, pattern) {
    if (pattern == undefined) {
        pattern = getPattern_word();
    }

    var word = trimex(str);
    var max = word.length;
    for (var i = 0; i < max; ++i) {
        if (!canUsedWord(word.charAt(i), pattern)) {
            return false;
        }
    }

    return word.length > 0;
}

// str is like 'abc[i][j]', return ['abc', 'i', 'j']
function parseArray(str) {
    var arr = [];
    str = trimex(str);
    var index = 0;
    var begin = str.indexOf('[', index);
    if (begin < 0) {
        return null;
    }
    var cw = trimex(str.slice(index, begin));
    if (!isWord(cw)) {
        return null;
    }
    arr.push(cw);

    do {
        index = begin;
        begin = str.indexOf(']', index);
        if (begin < 0) {
            return null;
        }

        cw = trimex(str.slice(index + 1, begin));
        if (!isWord(cw)) {
            return null;
        }

        index = begin;
        arr.push(cw);

        begin = str.indexOf('[', index);
    } while (begin >= 0);

    cw = trimex(str.slice(index + 1, str.length));
    if (isWord(cw)) {
        return null;
    }

    return arr;
}

function isInt(str) {
    var strnum = '1234567890';
    var max = str.length;
    for (var i = 0; i < max; ++i) {
        if (!strnum.indexOf(str.charAt(i))) {
            return false;
        }
    }

    return true;
}

// str is like '[0, 100]', return [0, 100]
function parseRange(str) {
    str = trimex(str);
    var cw = '';
    var begin = str.indexOf('[', 0);
    if (begin >= 0) {
        var mid = str.indexOf(',', begin + 1);
        if (mid >= 0) {
            var end = str.indexOf(']', mid + 1);

            var cw0 = trimex(str.slice(begin + 1, mid));
            var cw1 = trimex(str.slice(mid + 1, end));

            //return [cw0, cw1];
            if (isInt(cw0) && isInt(cw1)) {
                return [cw0, cw1];
            }
        }
    }

    return null;
}

//function findWord(str, dest, index, pattern) {
//    if (pattern == undefined) {
//        pattern = getPattern_word();
//    }
//
//    var begin = -1;
//    while ((begin = str.indexOf(dest, index)) >= 0) {
//        if (begin == 0 || !canUsedWord(str.charAt(begin - 1))) {
//            var end = begin + dest.length;
//            if (end == str.length || !canUsedWord(str.charAt(end))) {
//                return begin;
//            }
//        }
//    }
//
//    return -1;
//}

// str is like 'a in b', return [a, b]
function parse_AInB(str, strin, wordpattern) {
    if (strin == undefined) {
        strin = 'in';
    }
    if (wordpattern == undefined) {
        wordpattern = getPattern_word();
    }

    var inbegin = findWord(str, strin, 0);
    if (inbegin > 0) {
        var a = trimex(str.slice(0, inbegin));
        var b = trimex(str.slice(inbegin + strin.length, str.length));

        if (isWord(a, wordpattern) && isWord(b, wordpattern)) {
            return [a, b];
        }
    }

    return null;
}

// position the new line
function posNewLine(str, beginindex, pattern) {
    var max = str.length;
    for (var i = beginindex; i < max; ++i) {
        var cc = str.charAt(i);
        if (canUsedWord(cc, pattern)) {
            return beginindex;
        }
        else if (cc == '\n') {
            return i + 1;
        }
    }

    return beginindex;
}

// find word
function findWord(str, word, begin, wordpattern) {
    if (wordpattern == undefined) {
        wordpattern = getPattern_word();
    }

    if (begin == undefined) {
        begin = 0;
    }

    do{
        begin = str.indexOf(word, begin);
        if (begin == -1) {
            return -1;
        }

        if (!canUsedWord(str.charAt(begin + word.length), wordpattern)) {
            if (begin > 0 && !canUsedWord(str.charAt(begin - 1), wordpattern)) {
                return begin;
            }

            if (begin == 0) {
                return begin;
            }
        }

        begin += word.length;


    } while(true);

    return -1;
}

exports.hasWildcard = hasWildcard;
exports.equWildcard = equWildcard;

exports.isCmdSpace = isCmdSpace;
exports.isCmdQuotes = isCmdQuotes;
exports.splitCmd = splitCmd;

exports.splitPath = splitPath;
exports.getFilename = getFilename;
exports.makePath = makePath;
exports.makePathEx = makePathEx;

exports.readLine = readLine;
exports.trim = trim;
exports.ltrim = ltrim;
exports.rtrim = rtrim;
exports.trimex = trimex;
exports.ltrimex = ltrimex;
exports.rtrimex = rtrimex;
exports.getPattern_trimex = getPattern_trimex;
exports.getPattern_word = getPattern_word;
exports.canUsedWord = canUsedWord;
exports.isWord = isWord;
exports.parseArray = parseArray;
exports.isInt = isInt;
exports.parseRange = parseRange;
exports.parse_AInB = parse_AInB;
exports.posNewLine = posNewLine;
exports.findWord = findWord;