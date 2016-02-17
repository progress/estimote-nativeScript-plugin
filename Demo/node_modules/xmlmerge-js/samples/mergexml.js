/**
 * Created by zhs007 on 2014/12/5.
 */
var xmlmerge = require('../xmlmerge.js');

var argv = process.argv.splice(2);

if (argv.length != 4) {
    console.log('please input node xmlmerge.js src1.xml src2.xml dest.xml config.csv');
}
else {
    var srcfile1 = argv[0];
    var srcfile2 = argv[1];
    var destfile = argv[2];
    var cfgfile = argv[3];

    xmlmerge.mergeWithFile(srcfile1, srcfile2, destfile, cfgfile, function () {
        console.log(destfile + ' is ok!');
    });
}