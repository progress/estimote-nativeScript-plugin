# [vinyl-filter-since][author-www-url] [![npmjs.com][npmjs-img]][npmjs-url] [![The MIT License][license-img]][license-url] 

> [Gulp](https://github.com/gulpjs/gulp)/[vinyl-fs](https://github.com/wearefractal/vinyl-fs) plugin, filter files that have been modified since given Date or Number.

[![code climate][codeclimate-img]][codeclimate-url] [![standard code style][standard-img]][standard-url] [![travis build status][travis-img]][travis-url] [![coverage status][coveralls-img]][coveralls-url] [![dependency status][david-img]][david-url]


## Install
```
npm i vinyl-filter-since --save
npm test
```


## Usage
> For more use-cases see the [tests](./test.js)

```js
var vinylFilterSince = require('vinyl-filter-since');
var gulp = require('gulp');
var through2 = require('through2');

gulp.src('some/file/path/*.js')
  .pipe(vinylFilterSince(new Date('2015-03-16 13:27:54')))
  .pipe(through2.obj(function(file, enc, next) {
    // will not come here if file is older than given date
  }))
```


## Related
- [benz](https://github.com/tunnckocore/benz): Compose your control flow with absolute elegance. Support async/await, callbacks, thunks, generators, promises, observables, child… [more](https://github.com/tunnckocore/benz)
- [generate](https://github.com/generate/generate): Project generator, for node.js.
- [glob-fs](https://github.com/jonschlinkert/glob-fs): file globbing for node.js. speedy and powerful alternative to node-glob.
- [is-match](https://github.com/jonschlinkert/is-match): Create a matching function from a glob pattern, regex, string, array or function.
- [micromatch](https://github.com/jonschlinkert/micromatch): Glob matching for javascript/node.js. A drop-in replacement and faster alternative to minimatch and multimatch. Just… [more](https://github.com/jonschlinkert/micromatch)
- [snapdragon](https://github.com/jonschlinkert/snapdragon): snapdragon is an extremely pluggable, powerful and easy-to-use parser-renderer factory.
- [vinyl](http://github.com/wearefractal/vinyl): A virtual file format
- [vinyl-fs](http://github.com/wearefractal/vinyl-fs): Vinyl adapter for the file system


## Contributing
Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/tunnckoCore/vinyl-filter-since/issues/new).  
But before doing anything, please read the [CONTRIBUTING.md](./CONTRIBUTING.md) guidelines.


## [Charlike Make Reagent](http://j.mp/1stW47C) [![new message to charlike][new-message-img]][new-message-url] [![freenode #charlike][freenode-img]][freenode-url]

[![tunnckocore.tk][author-www-img]][author-www-url] [![keybase tunnckocore][keybase-img]][keybase-url] [![tunnckoCore npm][author-npm-img]][author-npm-url] [![tunnckoCore twitter][author-twitter-img]][author-twitter-url] [![tunnckoCore github][author-github-img]][author-github-url]


[npmjs-url]: https://www.npmjs.com/package/vinyl-filter-since
[npmjs-img]: https://img.shields.io/npm/v/vinyl-filter-since.svg?label=vinyl-filter-since

[license-url]: https://github.com/tunnckoCore/vinyl-filter-since/blob/master/LICENSE.md
[license-img]: https://img.shields.io/badge/license-MIT-blue.svg


[codeclimate-url]: https://codeclimate.com/github/tunnckoCore/vinyl-filter-since
[codeclimate-img]: https://img.shields.io/codeclimate/github/tunnckoCore/vinyl-filter-since.svg

[travis-url]: https://travis-ci.org/tunnckoCore/vinyl-filter-since
[travis-img]: https://img.shields.io/travis/tunnckoCore/vinyl-filter-since.svg

[coveralls-url]: https://coveralls.io/r/tunnckoCore/vinyl-filter-since
[coveralls-img]: https://img.shields.io/coveralls/tunnckoCore/vinyl-filter-since.svg

[david-url]: https://david-dm.org/tunnckoCore/vinyl-filter-since
[david-img]: https://img.shields.io/david/tunnckoCore/vinyl-filter-since.svg

[standard-url]: https://github.com/feross/standard
[standard-img]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg


[author-www-url]: http://www.tunnckocore.tk
[author-www-img]: https://img.shields.io/badge/www-tunnckocore.tk-fe7d37.svg

[keybase-url]: https://keybase.io/tunnckocore
[keybase-img]: https://img.shields.io/badge/keybase-tunnckocore-8a7967.svg

[author-npm-url]: https://www.npmjs.com/~tunnckocore
[author-npm-img]: https://img.shields.io/badge/npm-~tunnckocore-cb3837.svg

[author-twitter-url]: https://twitter.com/tunnckoCore
[author-twitter-img]: https://img.shields.io/badge/twitter-@tunnckoCore-55acee.svg

[author-github-url]: https://github.com/tunnckoCore
[author-github-img]: https://img.shields.io/badge/github-@tunnckoCore-4183c4.svg

[freenode-url]: http://webchat.freenode.net/?channels=charlike
[freenode-img]: https://img.shields.io/badge/freenode-%23charlike-5654a4.svg

[new-message-url]: https://github.com/tunnckoCore/messages
[new-message-img]: https://img.shields.io/badge/send%20me-message-green.svg
