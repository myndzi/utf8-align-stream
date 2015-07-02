'use strict';

var Transform = require('stream').Transform,
    inherits = require('util').inherits;

function utflen(val) {
    // values 10xxxxxx and 1111111x are invalid, but for our purposes,
    // invalid utf-8 sequences are 1 octet long
    if (val < 0xC0) { return 1; }
    if (val < 0xE0) { return 2; }
    if (val < 0xF0) { return 3; }
    if (val < 0xF8) { return 4; }
    if (val < 0xFC) { return 5; }
    if (val < 0xFE) { return 6; }
    return 1;
}

var noBuf = new Buffer(0);
function AlignStream() {
    Transform.call(this);
    this.piece = noBuf;
}
inherits(AlignStream, Transform);

function isContinuation(n) { return (n >> 6) === 0x02; }

AlignStream.prototype._transform = function (_chunk, encoding, callback) {
    var chunk = _chunk, len = _chunk.length, n, pos;
    
    // if we have stored a piece, prepend it first
    if (this.piece !== noBuf) {
        chunk = Buffer.concat([ this.piece, chunk ]);
        this.piece = noBuf;
    }
    
    // top two bits 10 = continuation byte; 11 = start byte
    // if chunk ends in either of these, we might have an interrupted utf-8 sequence
    if ((chunk[len-1] >> 6) >= 2) {
        // the longest utf-8 sequence is 6 bytes, so we only have to check the last 5
        // if the chunk is shorter than 5, we don't want to go past the start
        
        for (n = Math.max(len - 5, 0), pos = len - 1; pos >= n; pos--) {
            if (isContinuation(chunk[pos])) { continue; }
            // we've hit either an ascii literal or a utf-8 start-byte
            // utflen returns 1 for ascii literals, so expected will
            // always be less than the total length, and we won't do anything
            // the continuation bytes are erroneous, so we can pass them as-is
            var expected = utflen(chunk[pos]);
            
            // if we expect more bytes than we got, we need to store the end chunk and wait
            // for the next part of the stream to complete it
            if (pos + expected > len) {
                this.piece = chunk.slice(pos);
                chunk = chunk.slice(0, pos);
            }
            break;
        }
    }
    
    // write our (possibly modified) chunk, if it contains any data
    if (chunk.length) {
        this.push(chunk);
    }
    callback();
};
AlignStream.prototype._flush = function (callback) {
    if (this.piece !== noBuf) {
        this.push(this.piece);
        this.piece = noBuf;
    }
    callback();
};

AlignStream.utflen = utflen;
module.exports = AlignStream;
