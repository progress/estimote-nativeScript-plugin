/*!
 * vinyl-filter-since <https://github.com/tunnckoCore/vinyl-filter-since>
 *
 * Copyright (c) 2015 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

'use strict'

var Transform = require('readable-stream/transform')

module.exports = function vinylFilterSince (since) {
  if (!isValid(since)) {
    throw new TypeError('vinyl-filter-since: expect `since` be date or number')
  }

  return new Transform({
    objectMode: true,
    transform: function (file, enc, next) {
      if (since < file.stat.mtime) {
        return next(null, file)
      }
      next()
    }
  })
}

function isValid (val) {
  if (typeof val === 'number' || val instanceof Number || val instanceof Date) {
    return true
  }

  return false
}
