'use strict';

var PassThrough = require('stream').PassThrough,
    AlignStream = require('./index');

var Benchmark = require('benchmark');

// fs.createReadStream on a large file gives 65536 bytes (Ubuntu 14 @ digital ocean)
// http.get gives anywhere from ~5800 to 43400 bytes to a random CDN with a large page
// presumably some of this is streams combining buffers; I'll go with the average case of ~ 12500 bytes
var FILE_CHUNK_SIZE = 65536,
    HTTP_CHUNK_SIZE = 12500;

var fileCleanBuffer = new Buffer(65536),
    fileIncompleteBuffer = new Buffer(65536),
    httpCleanBuffer = new Buffer(12500),
    httpIncompleteBuffer = new Buffer(12500);

fileCleanBuffer.fill(0);
fileIncompleteBuffer.fill(0);
httpCleanBuffer.fill(0);
httpIncompleteBuffer.fill(0);

// the module doesn't actually care about valid or invalid utf, only whether it could be incomplete
// we're putting the split at 5 bytes out of 6 expected for max worst case

function writeIncomplete(buf) {
    var pos = buf.length;
    for (var i = 0; i < 5; i++) {
        buf[--pos] = 0x80;
    }
    buf[--pos] = 0xFC;
}

writeIncomplete(fileIncompleteBuffer);
writeIncomplete(httpIncompleteBuffer);

function pushThrough(Ctor, buf, cb) {
    var strim = new Ctor();
    
    strim.on('end', cb);
    strim.resume();
    
    for (var i = 0; i < 1000; i++) { strim.write(buf); }
    strim.end();
}

global.PassThrough = PassThrough;
global.AlignStream = AlignStream;
global.fileCleanBuffer = fileCleanBuffer;
global.fileIncompleteBuffer = fileIncompleteBuffer;
global.httpCleanBuffer = httpCleanBuffer;
global.httpIncompleteBuffer = httpIncompleteBuffer;

function runFile(cb) {
    new Benchmark.Suite()
    .add('Baseline (file)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(PassThrough, fileCleanBuffer, deferred.resolve.bind(deferred));
        }
    })
    .add('AlignStream (file, best case)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(AlignStream, fileCleanBuffer, deferred.resolve.bind(deferred));
        }
    })
    .add('AlignStream (file, worst case)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(AlignStream, fileIncompleteBuffer, deferred.resolve.bind(deferred));
        }
    })
    .on('cycle', function(event) {
        if (event.target.error) {
            console.error(event.target.error.stack);
        } else {
            console.log(String(event.target));
        }
    })
    .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
        if (cb) { cb(); }
    })
    .run();
}
function runHttp(cb) {
    new Benchmark.Suite()
    .add('Baseline (http)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(PassThrough, httpCleanBuffer, deferred.resolve.bind(deferred));
        }
    })
    .add('AlignStream (http, best case)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(AlignStream, httpCleanBuffer, deferred.resolve.bind(deferred));
        }
    })
    .add('AlignStream (http, worst case)', {
        defer: true,
        fn: function (deferred) {
            pushThrough(AlignStream, httpIncompleteBuffer, deferred.resolve.bind(deferred));
        }
    })
    .on('cycle', function(event) {
        if (event.target.error) {
            console.error(event.target.error.stack);
        } else {
            console.log(String(event.target));
        }
    })
    .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
        if (cb) { cb(); }
    })
    .run();
}

runFile(runHttp)
