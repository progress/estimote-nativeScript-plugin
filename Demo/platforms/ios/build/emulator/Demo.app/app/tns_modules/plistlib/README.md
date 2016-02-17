
# plistlib

Node.js plist parser and writer. By Dallin Lauritzen.

## Install

Install using NPM

`npm install plistlib`

## Parsed Objects

The object structure returned from the `load` methods and expected as the parameter
for `save` and `toString` is a tree structure made of "type"/"value" dictionary pairs.

All the supported plist value types are detailed below.

### String

``` xml
<string>Hello</string>
```

becomes

``` javascript
{ type: 'string', value: 'Hello' }
```

### Integer

``` xml
<integer>123</integer>
```

becomes

``` javascript
{ type: 'integer', value: 123 }
```

### Array

``` xml
<array>
	<string>Cat</string>
</array>
```

becomes

``` javascript
{
	type: 'array',
	value: [
		{ type: 'string', value: 'Cat' }
	]
}
```

### Dict

``` xml
<dict>
	<key>A</key>
	<string>B</string>
</dict>
```

becomes

``` javascript
{
	type: 'dict',
	value: {
		A: { type: 'string', value: 'B' }
	}
}
```

### Nesting

Types can nest, so here's a fancier example.

``` xml
<dict>
	<key>Array Of Dicts</key>
	<array>
		<dict>
			<key>A</key>
			<string>B</string>
			<key>C</key>
			<integer>4</integer>
		</dict>
	</array>
</dict>
```

becomes

``` javascript
{
	type: 'dict',
	value: {
		"Array Of Dicts": {
			type: 'array',
			value: [
				{
					type: 'dict',
					value: {
						A: { type: 'string', value: 'B' },
						C: { type: 'integer', value: 4 }
					}
				}
			]
		}
	}
}
```

### Data

Plistlib supports base64-encoded data within `data` tags. The data will be parsed
as a Buffer. When saving, the buffer will be re-encoded into base64 with a line-length
of 60 characters and indented to be level with it's tags.

``` xml
<array>
	<data>
	R0lGODlhDwAPAPcAAAAAAP6dAP6eAP6hAP6hAf6iAf6jAf6iAv6jAv6kAf6n
	Af6mAv6rA/+qA/+rAv+uA/+tBP+uBP6xBP+xBP+zBP+zBf60BP63Bf+3Bf67
	Bv68Bv69Bv69B/+8Bv7ECP/ECP/FCP7ICf7JCf/ICf7LCf/KCP/KCf7MCf/M
	Cf7RCv7SCv7SC//SCv/SC/7YC/7ZDP/YDP/ZDP7bDf/bDP7dDf/dDP/dDf/l
	Dv/mDv/mD//pD//wEP/wEf/1Ef/1Ev///wAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
	AAAAAAAAAAAAAAAAAP///yH5BAEAAP8ALAAAAAAPAA8AAAitAP8JFAigYMGB
	CP8VJCHiw4YKBxECUBFjxosVIzZMWABgIAAWNnTowFGjBYgLDAh0VOhCB48e
	O3DAMJEBAoKOAFDI0FHQh44ZBSMgCFDQxIscBXngcBH0AFEAIFLQuDGShooP
	GBwQeNohBIsYMmCwyIhhgYCnFjR4AHCixAcOFABsJapQwoUOBgsaCEBXoYIG
	DwI/IDC3r0ICBRIYGHCW70qPAPhKjphQYd6EAQEAOw==
	</data>
</array>
```

becomes

``` javascript
{
	type: 'array',
	value: [
		{ type: 'data', value: <Buffer 47 49 46 38 39 61 0f 00 0f 00 ...> }
	]
}
```

## API

``` javascript
var plistlib = require('plistlib');

// Load or save a file
plistlib.load('in.plist', function(err, plist) {
	// plist is a JavaScript object.

	plistlib.save('out.plist', plist, function(err) {
		// The plist is now saved to out.plist
	});
});

// You can also parse in-memory buffers and strings
plistlib.loadString(s, function(err, plist) { /* ... */ });
plistlib.loadBuffer(b, function(err, plist) { /* ... */ });

// Output to a string instead of a file. This method is synchronous
var content = plistlib.toString(plist);
```
