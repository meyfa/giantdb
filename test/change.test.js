"use strict";

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const PassThrough = require("stream").PassThrough;
const DevNull = require("dev-null");

const Change = require("../lib/change.js");

describe("lib/change.js", function () {

    it("has property 'id'", function () {
        const out = new DevNull();
        const obj = new Change("foo", out, () => {}, () => {});
        return expect(obj.id).to.equal("foo");
    });

    it("has property 'committed'", function () {
        const out = new DevNull();
        const obj = new Change("foo", out, () => {}, () => {});
        return expect(obj.committed).to.be.false;
    });

    it("has property 'destroyed'", function () {
        const out = new DevNull();
        const obj = new Change("foo", out, () => {}, () => {});
        return expect(obj.destroyed).to.be.false;
    });

    describe("#end()", function () {

        it("invokes the destroyer", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => done());
            obj.end();
        });

        it("sets 'destroyed' to true", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            obj.on("finish", function () {
                expect(obj.destroyed).to.be.true;
                done();
            });
            obj.end();
        });

    });

    describe("#commit()", function () {

        it("ends itself", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            obj.on("finish", done);
            obj.commit();
        });

        it("returns a promise", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            return expect(obj.commit()).to.eventually.be.fulfilled;
        });

        it("invokes the committer", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => done(), () => {});
            obj.commit();
        });

        it("passes the id to the committer", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, (id) => {
                expect(id).to.equal("foo");
                done();
            }, () => {});
            obj.commit();
        });

        it("resolves to the committer's return value", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => 42, () => {});
            return expect(obj.commit()).to.eventually.equal(42);
        });

        it("rejects when called twice", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            obj.commit();
            return expect(obj.commit()).to.eventually.be.rejected;
        });

        it("rejects when already destroyed", function (done) {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            obj.on("finish", function () {
                expect(obj.commit()).to.eventually.be.rejected.notify(done);
            });
            obj.end();
        });

        it("rejects when the underlying stream fails", function () {
            const out = new PassThrough();
            out.end = () => out.emit("error", new Error("oops!"));
            const obj = new Change("foo", out, () => {}, () => {});
            return expect(obj.commit()).to.eventually.be.rejected;
        });

        it("invokes the destroyer when the underlying stream fails", function (done) {
            const out = new PassThrough();
            out.end = () => out.emit("error", new Error("oops!"));
            const obj = new Change("foo", out, () => {}, () => done());
            obj.commit().catch(() => {});
        });

        it("sets 'destroyed' to true when the underlying stream fails", function () {
            const out = new PassThrough();
            out.end = () => out.emit("error", new Error("oops!"));
            const obj = new Change("foo", out, () => {}, () => {});
            return obj.commit().catch(() => {
                return expect(obj.destroyed).to.be.true;
            });
        });

        it("sets 'committed' to true", function () {
            const out = new DevNull();
            const obj = new Change("foo", out, () => {}, () => {});
            obj.commit();
            expect(obj.committed).to.be.true;
        });

    });

});
