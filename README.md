# UTF-8 Align Stream

This is a little module to prevent broken stringification (and possible [segmentation faults](https://github.com/joyent/node/issues/25583)) when streaming UTF-8 data. It works as a Streams2 transform stream that checks the last 6 bytes of every chunk for incomplete UTF-8 characters. If it finds any, it chops them off and only pushes along the chunk up to that point, saving the remainder to prepend to the next chunk.

# Usage

    var AlignStream = require('utf8-align-stream');
	
	http.get('http://foo.com/bar', function (res) {
        var aligned = res.pipe(new AlignStream());
        // do whatever with your stream
	});

# Why?

UTF-8 is a multi-byte encoding. Node streams have no consideration for whether the end of a chunk is a complete UTF-8 sequence; http responses, file reads, and really any stream can potentially break two chunks in the middle of a UTF-8 sequence. If you then convert that chunk to a string, either implicitly or explicitly, or by virtue of how some module you use operates (e.g. html parsers), the result will be incorrect (since the two chunks will be stringified separately, each piece of the UTF-8 sequence will be seen as a separate, invalid, sequence and treated accordingly).

Here's an example:

    'use strict';

    var AlignStream = require('./index'),
        Parser = require('htmlparser2').Parser;

    function getParser(tag) {
        return new Parser({
            ontext: function (text) { console.log(tag + ': ' + text); }
        });
    }

    var in1 = new AlignStream();
    in1.pipe(getParser('Stream 1'));

    var in2 = getParser('Stream 2');

    var kanji = new Buffer('\u6f22\u5b57');

    var part1 = kanji.slice(0, 2),
        part2 = kanji.slice(2, 4),
        part3 = kanji.slice(4, 6);

    in1.write(part1);
    in2.write(part1);

    in1.write(part2);
    in2.write(part2);

    in1.write(part3);
    in2.write(part3);

In the above code, a Buffer is created from two unicode characters, each three bytes long. The buffer is then sliced into three two-byte pieces; none of these are valid on their own. The buffers are then written one at a time (in some cases, these might get combined in memory and the test would be required to be asynchronous, but in the specific case of `htmlparser2`, this is not necessary). One is written through an instance of AlignStream, and one is written directly to the parser. The output looks like this:

> Stream 2: &#65533;&#65533;<br>
> Stream 1: &#28450;<br>
> Stream 2: &#65533;&#65533;<br>
> Stream 1: &#23383;<br>
> Stream 2: &#65533;&#65533;<br>

You can see that the AlignStream-buffered output is as expected, while the non-buffered output is made up of a bunch of unicode replacement characters, which are inserted in place of invalid UTF-8.
