/**
 * Created by zhs007 on 2014/12/4.
 */
var xmlmerge = require('../xmlmerge.js');
var fs = require('fs');
var csv2obj = require("heyutils").csv2obj;

fs.readFile('samples/AndroidManifest.xml', function(err, data) {
    var str1 = data.toString();

    fs.readFile('samples/kuaiwan.xml', function(err, data) {
        var str2 = data.toString();

        fs.readFile('samples/AndroidManifest.csv', function(err, data) {

            config = csv2obj.csv2obj(data.toString());

            xmlmerge.merge(str1, str2, config, function (xml) {
                fs.writeFile('samples/output.xml', xml, function (err) {

                });
            });
        });
    });
});