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

AlignStream.prototype._transform = function (_chunk, encoding, callback) {
    var chunk = _chunk;
    
    if (this.piece !== noBuf) {
        // prepend leftovers from last time
        chunk = Buffer.concat([ this.piece, _chunk ]);
        this.piece = noBuf;
    }
    
    // max length of a utf-8 character is 6 octets, so we start 6 octets from the end
    var len = chunk.length,
        pos = len - Math.max(6, len),
        chrs, expected, i;
    
    outer: while (pos < len) {
        chrs = utflen(chunk[pos]);
        
        i = pos++;
        
        // trivial case
        if (chrs === 1) { continue; }
        
        // we expect chrs bytes in this utf-8 sequence, but it's possible that
        // a new sequence-beginning character exists in this range; this is
        // invalid utf-8 but a decoder will ignore the first bytes as invalid and
        // pick up decoding from the "in the middle" sequence start character
        // in this case, we want to buffer as though this were the detected utf-8
        // start sequence, to ensure the full sequence is passed along
        
        // pos points to the first continuation byte
        expected = Math.min(i + chrs, len - i);
        
        while (pos < expected) {
            if ((chunk[pos] & 0xC0) !== 0x80) {
                // invalid byte, terminate sequence here
                continue outer;
            }
            pos++;
        }
        // 'pos' should be pointing to the character after the sequence;
        // we encountered no invalid continuation bytes. check if we're
        // at the end of the chunk and store the partial if so
        
        if (i + chrs > len) {
            // we expect more bytes than we have; store the partial
            // and slice the chunk so we don't output any of it
            this.piece = chunk.slice(i, len);
            chunk = chunk.slice(0, i);
            break outer;
        }
    }
    
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
