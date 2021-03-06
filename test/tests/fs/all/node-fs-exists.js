// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fs = require('fs'),
    path = require('path'),
    assert = require('wrapped-assert'),
    common = require('../../../harness/common'),
    Buffer = require('buffer').Buffer;

module.exports = function() {
  var f = path.join(common.fixturesDir, 'x.txt');
  var exists;
  var doesNotExist;

  fs.exists(f, function(y) {
    exists = y;
  });

  fs.exists(f + '-NO', function(y) {
    doesNotExist = y;
  });

  if (fs.getRootFS().supportsSynch()) {
    assert(fs.existsSync(f));
    assert(!fs.existsSync(f + '-NO'));
  }

  process.on('exit', function() {
    assert.strictEqual(exists, true);
    assert.strictEqual(doesNotExist, false);
  });
};
