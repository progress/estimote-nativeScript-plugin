
// All this test does is:
//  1. Print the original plist
//  2. Print the parsed object
//  3. Print the output that would be saved

var fs = require('fs');
var plistlib = require('./index');

// Bring Your Own Plist
fs.readFile('test.plist', function(err, data) {
	console.log(data.toString());
	plistlib.loadBuffer(data, function(err, plist) {
		if (err) return console.log(err);

		console.log(util.inspect(plist, { depth: null }));

		console.log(plistlib.toString(plist));
	});
});

