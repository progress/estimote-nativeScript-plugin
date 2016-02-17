var cp = require('child_process'),
	fs = require('fs'),
	path = require('path'),
	package = require('./package.json');

module.exports.requireNative = requireNative;
module.exports.install = install;
	
function requireNative(basePath, moduleName) {
	moduleName = moduleName || package.name;

// Look for binary for this platform
	var v8 = 'v8-'+ /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
	var modPath = path.join(basePath, 'bin', process.platform+ '-'+ process.arch+ '-'+ v8, moduleName);
	try {
		fs.statSync(modPath + '.node');
	} catch (ex) {
		// No binary!
		throw new Error('`' + modPath + '.node` is missing. Try reinstalling `' + package.name + '`?');
	}

// Pull in implementation
	return require(modPath);
}

// Parse args
var force = false, debug = false;
var
	arch = process.arch,
	platform = process.platform,
	v8 = /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
var args = process.argv.slice(2).filter(function(arg) {
	if (arg === '-f') {
		force = true;
		return false;
	} else if (arg.substring(0, 13) === '--target_arch') {
		arch = arg.substring(14);
	} else if (arg === '--debug') {
		debug = true;
	}
	return true;
});

var modPath = platform+ '-'+ arch+ '-v8-'+ v8;
var moduleFileName;
var basePath;
	
function install(argBasePath, moduleName) {
	if (!{ia32: true, x64: true, arm: true}.hasOwnProperty(arch)) {
		console.error('Unsupported (?) architecture: `'+ arch+ '`');
		process.exit(1);
	}
	
	basePath = argBasePath;
	moduleFileName = (moduleName || package.name) + ".node";

	// Test for pre-built library
	if (!force) {
		try {
			fs.statSync(path.join(basePath, 'bin', modPath, moduleFileName));
			console.log('`'+ modPath+ '` exists; testing');
			cp.execFile(process.execPath, [path.join(basePath, 'binary-test')], function(err, stdout, stderr) {
				if (err || stdout !== 'pass' || stderr) {
					console.log('Problem with the binary; manual build incoming');
					build();
				} else {
					console.log('Binary is fine; exiting');
				}
			});
		} catch (ex) {
			// Stat failed
			build();
		}
	} else {
		build();
	}
}

// Build it
function build() {
	cp.spawn(
		process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp',
		['rebuild'].concat(args),
		{customFds: [0, 1, 2]})
	.on('exit', function(err) {
		if (err) {
			if (err === 127) {
				console.error(
					'node-gyp not found! Please upgrade your install of npm! You need at least 1.1.5 (I think) '+
					'and preferably 1.1.30.'
				);
			} else {
				console.error('Build failed');
			}
			return process.exit(err);
		}
		afterBuild();
	});
}

// Move it to expected location
function afterBuild() {
	var targetPath = path.join(basePath, 'build', debug ? 'Debug' : 'Release', moduleFileName);
	var installPath = path.join(basePath, 'bin', modPath, moduleFileName);

	try {
		fs.mkdirSync(path.join(basePath, 'bin', modPath));
	} catch (ex) {}

	try {
		fs.statSync(targetPath);
	} catch (ex) {
		console.error('Build succeeded but target not found');
		process.exit(1);
	}
	fs.renameSync(targetPath, installPath);
	console.log('Installed in `'+ installPath+ '`');
}
