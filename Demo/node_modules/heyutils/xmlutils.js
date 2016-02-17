/**
 * Created by zhs007 on 2015/1/8.
 */

var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var pd = require('pretty-data').pd;
var fs = require('fs');
var console = require('console');

function parseXML(str) {
    return new DOMParser().parseFromString(str);
}

function findChild(xmlnode, name) {
    if (xmlnode.hasChildNodes()) {
        var nums = xmlnode.childNodes.length;
        var childs = xmlnode.childNodes;

        for (var i = 0; i < nums; ++i) {
            var curobj = childs[i];
            if (curobj.nodeName == name) {
                return curobj;
            }
        }
    }

    return null;
}

function findChildList(xmlnode, name) {
    if (xmlnode.hasChildNodes()) {
        var nums = xmlnode.childNodes.length;
        var childs = xmlnode.childNodes;
        var lst = [];

        for (var i = 0; i < nums; ++i) {
            var curobj = childs[i];
            if (curobj.nodeName == name) {
                lst.push(curobj);
            }
        }

        return lst;
    }

    return null;
}

function findChildValue(xmlnode, name, value) {
    if (xmlnode.hasChildNodes()) {
        var nums = xmlnode.childNodes.length;
        var childs = xmlnode.childNodes;

        for (var i = 0; i < nums; ++i) {
            var curobj = childs[i];
            if (curobj.nodeName == name && getValue(curobj) == value) {
                return curobj;
            }
        }
    }

    return null;
}

function getValue(xmlnode) {
    var child = findChild(xmlnode, '#text');
    if (child != null) {
        return child.data;
    }

    return '';
}

function chgValue(xmlnode, val) {
    if (xmlnode.hasChildNodes()) {
        var child = findChild(xmlnode, '#text');
        if (child != null) {
            child.data = val;
        }
    }
}

function getChildValue(xmlnode, name) {
    var child = findChild(xmlnode, name);
    if (child != null) {
        var val = findChild(xmlnode, '#text');
        if (val != null) {
            return val.data;
        }
    }

    return null;
}

function appendElement(xmlnode, name) {
    var element = xmlnode.ownerDocument.createElement(name);
    xmlnode.appendChild(element);
    return element;
}

function appendTextNode(xmlnode, name) {
    var element = xmlnode.ownerDocument.createTextNode(name);
    xmlnode.appendChild(element);
    return element;
}

// callback(err)
function save2xml(filename, xmlobj, callback) {
    var str = pd.xml(new XMLSerializer().serializeToString(xmlobj));
    fs.writeFile(filename, str, callback);
}

// callback(err, xmlobj)
function loadxml(filename, callback) {
    fs.readFile(filename, function (err, data) {
        if (err) {
            callback(err, null);

            return ;
        }

        var xmlobj = new DOMParser().parseFromString(data.toString());

        callback(null, xmlobj);
    });
}

// callback(err)
function save2xmlSync(filename, xmlobj) {
    var str = pd.xml(new XMLSerializer().serializeToString(xmlobj));
    fs.writeFileSync(filename, str);
}

// callback(err, xmlobj)
function loadxmlSync(filename) {
    var data = fs.readFileSync(filename);
    return new DOMParser().parseFromString(data.toString());
}

function findAttr(xmlnode, attrName) {
    if (xmlnode.hasOwnProperty('attributes')) {
        return xmlnode.getAttribute(attrName);
    }

    return '';
}

function removeElement(xmlnode) {
    xmlnode.ownerDocument.removeChild(xmlnode);
}

// str is 'aaa>bbb>ccc' > child
// str is 'aaa>bbb|ccc=ccc' | attrib
// str is 'aaa>bbb=ccc' = value
function findElement(xmlnode, str) {
    var pos = str.indexOf('>');
    if (pos > 0 && pos < str.length) {
        var next = str.slice(pos + 1, str.length);

        var lst = findChildList(xmlnode, str.slice(0, pos));
        if (lst == null) {
            return null;
        }

        var max = lst.length;
        for (var i = 0; i < max; ++i) {
            var ele = findElement(lst[i], next);
            if (ele != null) {
                return ele;
            }
        }
    }

    pos = str.indexOf('|');
    if (pos > 0 && pos < str.length) {
        var arr = str.slice(pos + 1, str.length).split('=');
        if (arr.length == 2) {
            var att = arr[0];
            var val = arr[1];

            var lst = findChildList(xmlnode, str.slice(0, pos));
            if (lst == null) {
                return null;
            }

            var max = lst.length;
            for (var i = 0; i < max; ++i) {
                if (lst[i].getAttribute(att) == val) {
                    return lst[i];
                }
            }
        }

        return null;
    }

    var arr = str.split('=');
    if (arr.length == 2) {
        var name = arr[0];
        var val = arr[1];

        var lst = findChildList(xmlnode, name);
        if (lst == null) {
            return null;
        }

        var max = lst.length;
        for (var i = 0; i < max; ++i) {
            if (getValue(lst[i]) == val) {
                return lst[i];
            }
        }

        return null;
    }

    if (arr.length != 1) {
        return null;
    }

    var lst = findChildList(xmlnode, str);
    if (lst == null) {
        return null;
    }

    if (lst.length > 0) {
        return lst[0];
    }

    return null;

    return null;

    return null;

    var arr = str.split('>');
    var max = arr.length;
    var lasttype = 0;   // 0 - element, 1 - attrib, 2 - value
    var attr = '';
    var val = '';
    if (max > 1) {
        var arr2 = arr[max - 1].split('=');
        if (arr2.length == 2) {
            val = arr2[1];

            var arr3 = arr2[0].split('|');
            if (arr3.length == 2) {
                attr = arr3[1];

                arr[max - 1] = arr3[0];

                lasttype = 1;
            }
            else {
                arr[max - 1] = arr2[0];

                lasttype = 2;
            }
        }
        else {
            return null;
        }
    }

    var element = xmlnode;
    for (var i = 0; i < max; ++i) {
        var curelement = findChild(element, arr[i]);
        if (curelement != null) {
            if (i == arr.length - 1) {
                if (lasttype == 0) {
                    return curelement;
                }
                else if (lasttype == 1 && curelement.getAttribute(attr) == val) {
                    return curelement;
                }
                else if (lasttype == 2 && getValue(curelement) == val) {
                    return curelement;
                }
            }

            element = curelement;
        }
        else {
            return null;
        }
    }

    return null;
}

// str is 'aaa>bbb>ccc|ddd', 'ddd' is attrib
function findElementAttrib(xmlnode, str) {
    var arr = str.split('|');
    if (arr.length == 2) {
        var ele = findElement(xmlnode, arr[0]);
        if (ele != null) {
            return ele.getAttribute(arr[1]);
        }
    }

    return "";
}

function prettyxml(str) {
    pd.xml(str);
}

exports.parseXML = parseXML;
exports.save2xml = save2xml;
exports.loadxml = loadxml;
exports.save2xmlSync = save2xmlSync;
exports.loadxmlSync = loadxmlSync;

exports.findChild = findChild;
exports.findChildValue = findChildValue;
exports.getValue = getValue;
exports.chgValue = chgValue;
exports.getChildValue = getChildValue;
exports.findElement = findElement;
exports.findElementAttrib = findElementAttrib;

exports.findAttr = findAttr;

exports.appendElement = appendElement;
exports.appendTextNode = appendTextNode;
exports.removeElement = removeElement;

exports.prettyxml = prettyxml;

exports.findChildList = findChildList;