"use strict";

const Promise = require("bluebird");

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const PassThrough = require("stream").PassThrough;
const DevNull = require("dev-null");

const Change = require("../lib/change.js");

describe("lib/change.js", function () {

    it("has property 'id'", function () {
        const out = new DevNull();
        const obj = new Change("foo", out, () => {});
        return expect(obj.id).to.equal("foo");
    });

    it("has property 'committed'", function () {
        const out = new DevNull();
        const obj = new Change("foo", out, () => {});
        return expect(obj.committed).to.be.false;
    });

    it("forwards errors", function (done) {
        const out = new PassThrough();
        const obj = new Change("foo", out, () => {});
        const error = new Error("oops!");
        obj.on("error", function (err) {
            expect(err).to.equal(error);
            done();
        });
        out.emit("error", error);
    });

    describe("#write()", function () {

        it("writes data to the underlying stream", function (done) {
            const out = new PassThrough();
            const obj = new Change("foo", out, () => {});
            obj.write("hello world", "utf8");
            out.on("data", function (chunk) {
                const expected = Buffer.from("hello world", "utf8");
                expect(chunk).to.satisfy((c) => expected.equals(c));
                done();
            });
        });

    });

    describe("#end()", function () {

        it("writes data to the underlying stream", function (done) {
            const out = new PassThrough();
            const obj = new Change("foo", out, () => {});
            obj.end("hello world", "utf8");
            out.on("data", function (chunk) {
                const expected = Buffer.from("hello world", "utf8");
                expect(chunk).to.satisfy((c) => expected.equals(c));
                done();
            });
        });

        it("ends the underlying stream", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {});
            obj.end();
            out.on("finish", done);
        });

        it("invokes the committer", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => done());
            obj.end();
        });

        it("passes the id to the committer", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, (id) => {
                expect(id).to.equal("foo");
                done();
            });
            obj.end();
        });

        it("ends the output before emitting 'finish'", function (done) {
            const out = new DevNull();
            let outFinish = false;
            const obj = new Change("foo", out, () => {});
            out.on("finish", function () {
                outFinish = true;
            });
            obj.on("finish", function () {
                expect(outFinish).to.be.true;
                done();
            });
            obj.end();
        });

        it("commits before emitting 'finish'", function (done) {
            const out = new DevNull();
            let committed = false;
            const obj = new Change("foo", out, () => {
                committed = true;
            });
            obj.on("finish", function () {
                expect(committed).to.be.true;
                done();
            });
            obj.end();
        });

        it("sets 'committed' to true", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {});
            obj.on("finish", function () {
                expect(obj.committed).to.be.true;
                done();
            });
            obj.end();
        });

        it("emits an error when the committer fails", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {
                return Promise.reject(new Error("oops!"));
            });
            obj.on("error", function () {
                done();
            });
            obj.end();
        });

    });

    describe("#commit()", function () {

        it("ends itself", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {});
            obj.on("finish", done);
            obj.commit();
        });

        it("returns a promise", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {});
            return expect(obj.commit()).to.eventually.be.fulfilled;
        });

        it("resolves to the committer's return value", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => 42);
            return expect(obj.commit()).to.eventually.equal(42);
        });

        it("rejects when called twice", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {});
            obj.commit();
            return expect(obj.commit()).to.eventually.be.rejected;
        });

        it("rejects when the underlying stream fails", function () {
            const out = new PassThrough({
                final: function (callback) {
                    callback(new Error("oops!"));
                },
            });
            const obj = new Change("foo", out, () => {});
            return expect(obj.commit()).to.eventually.be.rejected;
        });

    });

});
