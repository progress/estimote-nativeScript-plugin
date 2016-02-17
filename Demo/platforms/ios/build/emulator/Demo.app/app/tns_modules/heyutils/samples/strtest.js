/**
 * Created by zhs007 on 15/2/9.
 */

var console = require('console');
var strutils = require('../stringutils');
var fs = require('fs');

var src1 = 'Layer::init()';
var str = fs.readFileSync('/Users/zhs007/work/heysdk/gameengine/newprojcc3/Classes/HelloWorldScene.cpp').toString();
var bi = strutils.findWord(str, src1);
if (bi >= 0) {

}
