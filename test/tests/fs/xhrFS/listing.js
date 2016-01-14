/**
 * Unit tests for MountableFileSystem's mount/unmount features.
 */
var fs = require('fs'),
    path = require('path'),
    assert = require('wrapped-assert'),
    Buffer = require('buffer').Buffer;

function codeAssertThrows(op, assertMsg) {
  var thrown = false;
  try {
    op();
  } catch (e) {
    thrown = true;
  } finally {
    assert(thrown, assertMsg);
  }
}

module.exports = function() {
  var oldRootFS = fs.getRootFS();

  var rootForXFS = new BrowserFS.FileSystem.InMemory();
  BrowserFS.initialize(rootForXFS);

  var listing = {
    "README.md":null,
    "test": {
      "fixtures": {
        "files": {
          "49chars.txt": null
        }
      }
    },
    "src":{
      "README.md":null,
      "backend":{"AsyncMirror.ts":null, "XmlHttpRequest.ts":null, "ZipFS.ts":null},
      "main.ts":null
    }
  }

  var newXFS = new BrowserFS.FileSystem.XmlHttpRequest(listing, "test/tests/fs/xhrFS");
  rootForXFS.mount("/tRoot", newXFS);

  var t1text = 'Invariant fail: Can query folder that contains items and a mount point.';
  var expectedTestListing = ['README.md', 'src', 'test'];
  var testListing = fs.readdirSync('/tRoot').sort();
  assert.deepEqual(testListing, expectedTestListing, t1text);

  fs.readdir('/tRoot', function(err, files) {
    assert(!err, t1text);
    assert.deepEqual(files.sort(), expectedTestListing, t1text);
    fs.stat("/tRoot/test/fixtures/files/49chars.txt", function(err, stats) {
      assert(!err, "Can stat an existing file");
      assert(stats.isFile(), "File should be interpreted as a file");
      assert(!stats.isDirectory(), "File should be interpreted as a directory");
      assert(stats.size == 49, "file size should match");
    });

    fs.stat("/tRoot/src/backend", function(err, stats) {
      assert(!err, "Can stat an existing directory");
      assert(stats.isDirectory(), "directory should be interpreted as a directory");
      assert(!stats.isFile(), "directory should be interpreted as a file");
    });

    fs.stat("/tRoot/src/not-existing-name", function(err, stats) {
      assert(!!err, "Non existing file should return an error");
    });
  });


  // Restore test FS on test end.
  process.on('exit', function() {
    BrowserFS.initialize(oldRootFS);
  });
};