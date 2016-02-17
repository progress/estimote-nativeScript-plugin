/*!
 * vinyl-filter-since <https://github.com/tunnckoCore/vinyl-filter-since>
 *
 * Copyright (c) 2015 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

/* jshint asi:true */

'use strict'

var fs = require('fs')
var path = require('path')
var test = require('assertit')
var through = require('through2')
var vinylFs = require('vinyl-fs')
var vinylFilterSince = require('./index')

var pkgJson = path.join(__dirname, './package.json')

// DRY
function plugin (lastUpdateDate, len, done) {
  var stream = vinylFs.src('*.json')
  var files = []

  stream
    .pipe(through.obj())
    .pipe(vinylFilterSince(lastUpdateDate))
    .pipe(through.obj(function (file, enc, next) {
      files.push(file)
      next()
    }))

  stream.once('end', function _end () {
    test.equal(files.length, len)
    done()
  })
}

test('vinyl-filter-since:', function () {
  test('should throw TypeError if no Date object or Number given', function (done) {
    function fixtureString () {
      plugin('foo bar', 0, function () {})
    }

    function fixtureArray () {
      plugin([1, 2, 3], 0, function () {})
    }

    test.throws(fixtureString, TypeError)
    test.throws(fixtureString, /be date or number/)
    test.throws(fixtureArray, TypeError)
    test.throws(fixtureArray, /be date or number/)
    done()
  })
  test('should glob a file changed after if `since` is Date object', function (done) {
    plugin(new Date((+fs.statSync(pkgJson).mtime) - 2200), 1, done)
  })
  test('should glob a file changed after if `since` is Number', function (done) {
    plugin(1436706945226, 1, done)
  })
  test('should not glob a file if changed before', function (done) {
    plugin(Date.now(), 0, done)
  })
})
