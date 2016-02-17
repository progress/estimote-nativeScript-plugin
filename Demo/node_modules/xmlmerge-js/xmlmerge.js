/**
 * Created by zhs007 on 2014/12/4.
 */

var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var pd = require('pretty-data').pd;
var fs = require('fs');
//var logger = require('./logger');
var csv2obj = require("heyutils").csv2obj;

//function isInLst(obj, lstNode) {
//    var max = lstNode.length;
//    for (var i = 0; i < max; ++i) {
//        if (obj.nodeName == lstNode[i]) {
//            return true;
//        }
//    }
//
//    return false;
//}
//
//function findNodeAttr(obj, attrName) {
//    var attrs = obj.attributes;
//
//    for (var i = 0; i < attrs.length; ++i) {
//        if (attrs[i].nodeName == attrName) {
//            return attrs[i];
//        }
//    }
//
//    return null;
//}
//
//function isEquNode(obj1, obj2, lstNode, lstAttr) {
//    if (obj1.nodeName == obj2.nodeName) {
//        if (isInLst(obj1, lstNode)) {
//            return true;
//        }
//
//
//    }
//}
//
//function isEquAttribute(obj1, obj2) {
//    var att1 = obj1.attributes;
//    var att2 = obj2.attributes;
//
//    for (var i = 0; i < att1.length; ++i) {
//        logger.normal.log('info', 'att1 ' + att1[i].nodeName + ' ' + att1[i].value);
//    }
//}
//
//function findChild(obj, child, lstNode) {
//    var nums = obj.childNodes.length;
//    var childs = obj.childNodes;
//    for (var i = 0; i < nums; ++i) {
//        var curobj = childs[i];
//        //logger.normal.log('info', 'find ' + curobj.nodeName + ' ' + child.nodeName);
//        if (curobj.nodeName == child.nodeName) {
//            if (isInLst(curobj, lstNode)) {
//                return curobj;
//            }
//
//            if (isEquAttribute(curobj, child)) {
//                return curobj;
//            }
//        }
//    }
//
//    return null;
//}
//
//function addChild(obj1, child) {
//    obj1.appendChild(child);
//}
//
//function mergeObj(obj1, obj2, lstNode, lstAttr) {
//    if (obj1.nodeName == obj2.nodeName) {
//        if (!isInLst(obj1, lstNode)) {
//            if (isEquAttribute(obj1, obj2)) {
//                addChild(obj1, obj2);
//
//                return ;
//            }
//        }
//    }
//
//    if (!obj1.hasChildNodes() || !obj2.hasChildNodes()) {
//        return ;
//    }
//
//    var nums2 = obj2.childNodes.length;
//    var childs2 = obj2.childNodes;
//
//    for (var i = 0; i < nums2; ++i) {
//        var curobj = childs2[i];
//        if (curobj.nodeName == '#text') {
//            continue ;
//        }
//
//        logger.normal.log('info', 'obj2 ', curobj.nodeName);
//
//        var obj1child = findChild(obj1, curobj, lstNode);
//        if (obj1child != null) {
//            logger.normal.log('info', 'merge ', curobj.nodeName);
//
//            mergeObj(obj1child, curobj, lstNode);
//        }
//        else {
//            addChild(obj1, curobj);
//            //obj2.removeChild(curobj);
//        }
//    }
//}
//
//function merge1(str1, str2, lstNode, lstAttr, func) {
//    var obj1, obj2;
//
//    obj1 = new DOMParser().parseFromString(str1);
//    obj2 = new DOMParser().parseFromString(str2);
//
//    mergeObj(obj1.documentElement, obj2.documentElement, lstNode);
//
//    var str = new XMLSerializer().serializeToString(obj1);
//
//    func(str);
//}
//
//function mergeAndroidManifest(str1, str2, func) {
//    var obj1, obj2;
//
//    obj1 = new DOMParser().parseFromString(str1);
//    obj2 = new DOMParser().parseFromString(str2);
//
//    mergeObj(obj1.documentElement, obj2.documentElement);
//
//    var str = new XMLSerializer().serializeToString(obj1);
//
//    func(str);
//}

function addChild(obj, child) {
    obj.appendChild(child);
}

function findNodeAttr(obj, attrName) {
    var attrs = obj.attributes;

    for (var i = 0; i < attrs.length; ++i) {
        if (attrs[i].nodeName == attrName) {
            return attrs[i];
        }
    }

    return null;
}

function isEquNode(obj1, obj2, config) {
    if (obj1.nodeName == obj2.nodeName) {
        var max = config.length;
        for (var i = 0; i < max; ++i) {
            if (config[i].nodename == obj1.nodeName) {
                if (config[i].attrname == '*') {
                    return true;
                }

                var attr1 = findNodeAttr(obj1, config[i].attrname);
                if (attr1 == null) {
                    return false;
                }

                var attr2 = findNodeAttr(obj2, config[i].attrname);
                if (attr2 == null) {
                    return false;
                }

                if (attr1.value == attr2.value) {
                    return true;
                }

                return false;
            }
        }
    }

    return false;
}

function findSameChild(obj, child, config) {
    var nums = obj.childNodes.length;
    var childs = obj.childNodes;
    for (var i = 0; i < nums; ++i) {
        var curobj = childs[i];
        if (isEquNode(curobj, child, config)) {
            return curobj;
        }
    }

    return null;
}

function mergeObj(obj1, obj2, config) {
    var isequ = isEquNode(obj1, obj2, config);
    if (!isequ) {
        return ;
    }

    if (!obj1.hasChildNodes() || !obj2.hasChildNodes()) {
        return ;
    }

    var nums2 = obj2.childNodes.length;
    var childs2 = obj2.childNodes;

    for (var i = 0; i < nums2; ++i) {
        var curobj = childs2[i];
        if (curobj.nodeName == '#text') {
            continue ;
        }

        //logger.normal.log('info', 'obj2 ', curobj.nodeName);

        var obj1child = findSameChild(obj1, curobj, config);
        if (obj1child != null) {
            //logger.normal.log('info', 'merge ', curobj.nodeName);

            mergeObj(obj1child, curobj, config);
        }
        else {
            addChild(obj1, curobj);
        }
    }
}

function merge(str1, str2, config, callback) {
    var obj1 = new DOMParser().parseFromString(str1);
    var obj2 = new DOMParser().parseFromString(str2);

    mergeObj(obj1.documentElement, obj2.documentElement, config);

    var str = pd.xml(new XMLSerializer().serializeToString(obj1));
    callback(str);
}

function mergeWithFile(src1, src2, dest, cfg, callback) {
    fs.readFile(src1, function(err, data) {
        var str1 = data.toString();

        fs.readFile(src2, function(err, data) {
            var str2 = data.toString();

            fs.readFile(cfg, function(err, data) {

                config = csv2obj.csv2obj(data.toString());

                merge(str1, str2, config, function (xml) {
                    fs.writeFile(dest, xml, function (err) {
                        callback();
                    });
                });
            });
        });
    });
}

exports.merge = merge;
exports.mergeWithFile = mergeWithFile;
//exports.mergeAndroidManifest = mergeAndroidManifest;
