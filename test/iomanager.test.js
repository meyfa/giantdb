"use strict";

const Promise = require("bluebird");

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const IOManager = require("../lib/iomanager.js");

describe("lib/iomanager.js", function () {

    describe("#createReadStream()", function () {

        it("gets a stream from the adapter", function () {
            const expected = {};
            const adapter = {
                createReadStream: (id) => {
                    expect(id).to.equal("foo");
                    return expected;
                },
            };
            const obj = new IOManager(adapter);
            expect(obj.createReadStream("foo")).to.equal(expected);
        });

    });

    describe("#createWriteStream()", function () {

        it("gets a stream from the adapter", function () {
            const expected = {};
            const adapter = {
                createWriteStream: (id) => {
                    expect(id).to.equal("foo");
                    return expected;
                },
            };
            const obj = new IOManager(adapter);
            expect(obj.createWriteStream("foo")).to.equal(expected);
        });

    });

    describe("#createTemporary()", function () {

        it("gets a stream from the adapter", function () {
            const expected = {};
            const adapter = {
                createWriteStream: (id) => {
                    expect(id).to.equal("foo.tmp");
                    return expected;
                },
            };
            const obj = new IOManager(adapter);
            expect(obj.createTemporary("foo")).to.equal(expected);
        });

    });

    describe("#publish()", function () {

        it("renames foo.tmp to foo", function (done) {
            const adapter = {
                rename: (file1, file2) => {
                    expect(file1).to.equal("foo.tmp");
                    expect(file2).to.equal("foo");
                    done();
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter);
            obj.publish("foo");
        });

    });

    describe("#delete()", function () {

        it("deletes the file", function (done) {
            const adapter = {
                delete: (id) => {
                    expect(id).to.equal("foo");
                    done();
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter);
            obj.delete("foo");
        });

    });

    describe("#deleteTemporary()", function () {

        it("deletes the file", function (done) {
            const adapter = {
                delete: (id) => {
                    expect(id).to.equal("foo.tmp");
                    done();
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter);
            obj.deleteTemporary("foo");
        });

    });

});
