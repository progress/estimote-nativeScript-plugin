
var _ = require('underscore');
var fs = require('fs');
var async = require('async');
var xml = require('xml');
var xmlParser = require('node-xml');
var moment = require('moment');
var util = require('util');

function printNode(n) {
	console.log(n);
	if (n.children.length) {
		console.log('>>');
		_.each(n.children, printNode);
		console.log('<<');
	}
}

exports.debug = function(doc) {
	_.each(doc.children, printNode);
}

function makeParser(done) {
	return new xmlParser.SaxParser(function(cb) {

		// plist model
		var obj = null;
		var objStack = [];
		var currentObj = null;

		// xml model
		var document = null;
		var parent = null;
		var current = null;
		var previous = null;

		cb.onStartDocument(function() {
			// console.log('Start document');
			document = { parent: null, children: [], text: '' };
			parent = document;
		});
		
		cb.onEndDocument(function() {
			// console.log('End document');
			done(null, obj);
		});
		
		cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
			// console.log('\nStart element ' + elem);
			var tmp = {
				name: elem,
				// attrs: attrs,
				// prefix: prefix,
				// uri: uri,
				// namespaces: namespaces,
				text: '',
				parent: null,
				children: []
			}

			if (current) {
				tmp.parent = current;
				current = tmp;
				parent = current.parent;
			}
			else {
				tmp.parent = parent;
				current = tmp;
			}

			if (parent) {
				parent.children.push(current);
			}

			if (parent.name == 'plist' && _.isNull(obj)) {
				// "root" plist object
				if (current.name == 'dict') {
					obj = { type: 'dict', value: {} };
				}
				else if (current.name == 'array') {
					obj = { type: 'array', value: [] };
				}
				currentObj = obj;
				objStack = [];
			}
			else if (current.name == 'dict') {
				objStack.push(currentObj);
				var parentObj = currentObj;
				currentObj = { type: 'dict', value: {} };
				// console.log('Adding dict. Parent obj:');
				// console.log(parentObj);
				if (parent && parent.name == 'array') {
					// console.log('Adding unnamed dict.');
					parentObj.value.push(currentObj);
				}
				else if (parent && parent.name == 'dict') {
					// console.log('Adding dict ' + previous.text);
					parentObj.value[previous.text] = currentObj;
				}
				// console.log(parentObj);
			}
			else if (current.name == 'array') {
				objStack.push(currentObj);
				var parentObj = currentObj;
				currentObj = { type: 'array', value: [] };
				if (parent && parent.name == 'array') {
					// console.log('Adding unnamed array');
					parentObj.value.push(currentObj);
				}
				else if (parent && parent.name == 'dict') {
					// console.log('Adding array ' + previous.text);
					parentObj.value[previous.text] = currentObj;
				}
				// console.log(parentObj);
			}
			else if (current.name == 'true') {
				if (parent && parent.name == 'array') {
					currentObj.value.push({ type: 'bool', value: true });
				}
				else if (parent && parent.name == 'dict') {
					currentObj.value[previous.text] = { type: 'bool', value: true };
				}
			}
			else if (current.name == 'false') {
				if (parent && parent.name == 'array') {
					currentObj.value.push({ type: 'bool', value: false });
				}
				else if (parent && parent.name == 'dict') {
					currentObj.value[previous.text] = { type: 'bool', value: false };
				}
			}
		});
		
		cb.onEndElementNS(function(elem, prefix, uri) {
			// console.log('End element ' + elem);
			if (current.parent) {
				current = current.parent;
				parent = current.parent;
				previous = current.children[current.children.length - 1]; // last
			}
			else {
				current = null;
				parent = null;
			}

			if (elem == 'dict' || elem == 'array') {
				currentObj = objStack.pop();
				// console.log('Popped item');
			}
		});

		function getCurrentAddValue() {
			var toAdd = { type: current.name, value: current.text};
			if (current.name == 'date') {
				toAdd.value = moment(new Date(current.text));
				toAdd.value.utc();
			}
			else if (current.name == 'data') {
				var lines = current.text.split('\n');
				// console.log(lines);
				var text = _.map(lines, function(line) { return line.trim(); }).join('');
				// console.log(text);
				toAdd.value = new Buffer(text, 'base64');
			}
			else if (current.name == 'integer') {
				toAdd.value = parseInt(current.text);
			}
			return toAdd;
		}
		
		cb.onCharacters(function(chars) {
			if (!current) return;
			else {
				current.text += chars.trim();
			}

			// console.log('%s -> %s Text: %s', (parent ? parent.name : ''), current.name, chars.trim());

			if (_.contains(['string', 'integer', 'date', 'data'], current.name)) {
				if (parent && parent.name == 'array') {
					// element of array
					// console.log('Adding text to array.');
					currentObj.value.push(getCurrentAddValue());
				}
				else if (previous && previous.name == 'key') {
					// value of key
					// console.log('Adding item to dict.');
					currentObj.value[previous.text] = getCurrentAddValue();
				}
			}
		});
		
		cb.onCdata(function(cdata) {
		});
		
		cb.onComment(function(msg) {
		});
		
		cb.onWarning(function(msg) {
		});
		
		cb.onError(function(msg) {
		});
	});
}

function addItem(item, parent, depth) {
	if (item.type == 'string') {
		parent.push({ string: item.value });
	}
	else if (item.type == 'integer') {
		parent.push({ integer: item.value });
	}
	else if (item.type == 'data') {
		var sep = '\n' + Array(depth+1).join('\t');
		var str = sep + item.value.toString('base64').match(/.{1,60}/g).join(sep) + sep;
		parent.push({ data: str });
	}
	else if (item.type == 'bool') {
		if (item.value) {
			parent.push({ true: '' });
		}
		else {
			parent.push({ false: '' });
		}
	}
	else if (item.type == 'array') {
		var arr = [];
		_.each(item.value, function(e) {
			addItem(e, arr, depth+1);
		});
		parent.push({ array: arr });
	}
	else if (item.type == 'dict') {
		var dict = [];
		_.each(item.value, function(value, key) {
			dict.push({ key: key });
			addItem(value, dict, depth+1);
		});
		parent.push({ dict: dict });
	}
	else if (item.type == 'date') {
		parent.push({ date: item.value.format('YYYY-MM-DDTHH:mm:ss[Z]') });
	}
	else {
		console.log('Unexpected item: ' + util.inspect(item));
	}
}

exports.loadBuffer = function(buffer, done) {
	makeParser(done).parseString(buffer.toString());
}

exports.loadString = function(string, done) {
	makeParser(done).parseString(string);
}

exports.load = function(filename, done) {
	makeParser(done).parseFile(filename);
}

exports.toString = function(data) {
	var xmlObj = { dict: [] };
	_.each(data.value, function(value, key) {
		if (value) {
			xmlObj.dict.push({ key: key });
			addItem(value, xmlObj.dict, 1);
		}
	});
	var xmlStr = xml(xmlObj, { indent: "\t" }).replace(/<true><\/true>/g, "<true/>").replace(/<false><\/false>/g,"<false/>");
	var content = '<?xml version="1.0" encoding="UTF-8"?>\n';
	content += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
	content += '<plist version="1.0">\n';
	content += xmlStr;
	content += '\n</plist>\n';
	return content;
}

exports.save = function(filename, data, done) {
	var out = fs.createWriteStream(filename);
	var content = exports.toString(data);
	out.write(content, 'utf8');
	out.end(done);
}

function compactItem(item) {
	if (item.type == 'dict') {
		var obj = {};
		_.each(item.value, function(value, key) {
			obj[key] = compactItem(value);
		});
		return obj;
	}
	else if (item.type == 'array') {
		return _.map(item.value, compactItem);
	}
	else if (_.contains(['string', 'date', 'data', 'integer', 'bool'], item.type)) {
		return item.value;
	}
	else {
		return null;
	}
}

exports.compact = function(plist) {
	return compactItem(plist);
}
