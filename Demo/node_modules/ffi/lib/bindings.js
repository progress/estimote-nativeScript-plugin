var path = require("path");

module.exports = require('prebuilt').
	requireNative(path.join(__dirname, ".."), 'ffi_bindings');
