'use strict';

var AlignStream = require('./index'),
    utflen = AlignStream.utflen;

var expect = require('expect');

describe('AlignStream', function () {
    it('should pass plain ascii data along verbatim', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf = new Buffer('foo');
        strim.end(buf);
        expect(strim.read()).toBe(buf);
        expect(strim.read()).toBe(null);
    });
    it('should pass complete utf-8 data along verbatim', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf = new Buffer([0x66, 0x6f, 0x6f, 0xF0, 0x9F, 0x92, 0x95, 0x62, 0x61, 0x72]);
        strim.end(buf);
        expect(strim.read()).toBe(buf);
        expect(strim.read()).toBe(null);
    });
    it('should pass whole utf-8 sequences', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0, 0x9F]),
            buf2 = new Buffer([0x92, 0x95]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x9F, 0x92, 0x95]));
        });
    });
    it('should pass as much of each chunk along as possible', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0x66, 0x6f, 0x6f, 0xF0, 0x9F]),
            buf2 = new Buffer([0x92, 0x95, 0x62, 0x61, 0x72]);
        
        strim.write(buf1);
        
        expect(strim.read()).toEqual(new Buffer([0x66, 0x6f, 0x6f]));
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x9F, 0x92, 0x95, 0x62, 0x61, 0x72]));
        });
    });
    it('should flush incomplete sequences on end of stream', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0x66, 0x6f, 0x6f, 0xF0, 0x9F]);
        
        strim.write(buf1);
        
        expect(strim.read()).toEqual(new Buffer([0x66, 0x6f, 0x6f]));
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x9F]));
        });
    });
    it('should ignore invalid sequences and still buffer correctly', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0, 0xF0, 0x9F]),
            buf2 = new Buffer([0x92, 0x95]);
        
        strim.write(buf1);
        expect(strim.read()).toEqual(new Buffer([0xF0]));
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x9F, 0x92, 0x95]));
        });
    });
    it('should work with 2-byte utf-8 values (offset 0)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xC0, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(buf1);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 2-byte utf-8 values (offset 1)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xC0]),
            buf2 = new Buffer([0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xC0, 0x80]));
        });
    });
    it('should work with 3-byte utf-8 values (offset 0)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xE0, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(buf1);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 3-byte utf-8 values (offset 1)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xE0]),
            buf2 = new Buffer([0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xE0, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 3-byte utf-8 values (offset 2)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xE0, 0x80]),
            buf2 = new Buffer([0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xE0, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 4-byte utf-8 values (offset 0)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(buf1);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 4-byte utf-8 values (offset 1)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0]),
            buf2 = new Buffer([0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 4-byte utf-8 values (offset 2)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0, 0x80]),
            buf2 = new Buffer([0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 4-byte utf-8 values (offset 3)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF0, 0x80, 0x80]),
            buf2 = new Buffer([0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF0, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 5-byte utf-8 values (offset 0)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(buf1);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 5-byte utf-8 values (offset 1)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8]),
            buf2 = new Buffer([0x80, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 5-byte utf-8 values (offset 2)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8, 0x80]),
            buf2 = new Buffer([0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 5-byte utf-8 values (offset 3)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8, 0x80, 0x80]),
            buf2 = new Buffer([0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 5-byte utf-8 values (offset 4)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8, 0x80, 0x80, 0x80]),
            buf2 = new Buffer([0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 0)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xF8, 0x80, 0x80, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(buf1);
        setImmediate(function () {
            strim.end();
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 1)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xFC]),
            buf2 = new Buffer([0x80, 0x80, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 2)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xFC, 0x80]),
            buf2 = new Buffer([0x80, 0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 3)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xFC, 0x80, 0x80]),
            buf2 = new Buffer([0x80, 0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 4)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xFC, 0x80, 0x80, 0x80]),
            buf2 = new Buffer([0x80, 0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
    it('should work with 6-byte utf-8 values (offset 5)', function (done) {
        var strim = new AlignStream();
        strim.on('end', done.bind(null, null));
        
        var buf1 = new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80]),
            buf2 = new Buffer([0x80]);
        
        strim.write(buf1);
        expect(strim.read()).toBe(null);
        setImmediate(function () {
            strim.end(buf2);
            expect(strim.read()).toEqual(new Buffer([0xFC, 0x80, 0x80, 0x80, 0x80, 0x80]));
            expect(strim.read()).toBe(null);
        });
    });
});
describe('utflen', function () {
    it('recognizes 1 byte values', function () {
        expect(utflen(0x10)).toBe(1);
    });
    it('recognizes 2 byte values', function () {
        expect(utflen(0xC0)).toBe(2);
        expect(utflen(0xE0-1)).toBe(2);
    });
    it('recognizes 3 byte values', function () {
        expect(utflen(0xE0)).toBe(3);
        expect(utflen(0xF0-1)).toBe(3);
    });
    it('recognizes 4 byte values', function () {
        expect(utflen(0xF0)).toBe(4);
        expect(utflen(0xF8-1)).toBe(4);
    });
    it('recognizes 5 byte values', function () {
        expect(utflen(0xF8)).toBe(5);
        expect(utflen(0xFC-1)).toBe(5);
    });
    it('recognizes 6 byte values', function () {
        expect(utflen(0xFC)).toBe(6);
        expect(utflen(0xFE-1)).toBe(6);
    });
    it('treats invalid values as 1-length values', function () {
        expect(utflen(0x80)).toBe(1);
        expect(utflen(0xBF)).toBe(1);
        expect(utflen(0xFE)).toBe(1);
        expect(utflen(0xFF)).toBe(1);
    });
});
