"use strict";

const Promise = require("bluebird");

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const Change = require("../lib/change.js");
const Item = require("../lib/item.js");
const MemoryAdapter = require("fs-adapters").MemoryAdapter;

const DB = require("../lib/db.js");

describe("lib/db.js", function () {

    describe("#create()", function () {

        it("returns a promise", function () {
            const obj = new DB();
            return expect(obj.create()).to.eventually.be.fulfilled;
        });

        it("resolves to a Change", function () {
            const obj = new DB();
            return expect(obj.create()).to.eventually.be.instanceOf(Change);
        });

        it("sets an id", function () {
            const obj = new DB();
            return expect(obj.create()).to.eventually.have.property("id")
                .that.is.a("string");
        });

        it("does not make the item accessible immediately", function () {
            const obj = new DB();
            return obj.create().then((change) => {
                return expect(obj.get(change.id)).to.eventually.be.rejected;
            });
        });

        describe(".commit()", function () {

            it("makes the item accessible", function () {
                const obj = new DB();
                return obj.create().then((change) => {
                    return change.commit().then(() => {
                        return expect(obj.get(change.id))
                            .to.eventually.be.fulfilled;
                    });
                });
            });

            it("resolves to an Item", function () {
                const obj = new DB();
                return obj.create().then((change) => {
                    return change.commit().then((item) => {
                        return expect(item).to.be.instanceOf(Item)
                            .with.property("id").that.equals(change.id);
                    });
                });
            });

        });

    });

    describe("#remove()", function () {

        it("rejects for nonexistent ids", function () {
            const obj = new DB();
            return expect(obj.remove("foo")).to.eventually.be.rejected;
        });

        it("makes items inaccessible", function () {
            const obj = new DB();
            return obj.create().then((change) => {
                return change.commit();
            }).then((item) => {
                return obj.remove(item.id).then(() => {
                    return expect(obj.get(item.id)).to.eventually.be.rejected;
                });
            });
        });

        it("removes items from source", function () {
            const source = new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
            });
            const obj = new DB(source);
            return obj.remove("foo").then(() => {
                return expect(source.listFiles())
                    .to.eventually.not.include("foo");
            });
        });

    });

    describe("#get()", function () {

        it("rejects for nonexistent ids", function () {
            const obj = new DB();
            return expect(obj.get("missing")).to.eventually.be.rejected;
        });

        it("resolves to an Item", function () {
            const obj = new DB();
            return obj.create().then((change) => {
                return change.commit().then(() => {
                    return expect(obj.get(change.id))
                        .to.eventually.be.instanceOf(Item);
                });
            });
        });

        it("sets the id", function () {
            const obj = new DB();
            return obj.create().then((change) => {
                return change.commit().then(() => {
                    return expect(obj.get(change.id))
                        .to.eventually.have.property("id")
                        .that.equals(change.id);
                });
            });
        });

        it("loads items from source", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
            }));
            return expect(obj.get("foo")).to.eventually.be.instanceOf(Item);
        });

        it("does not load .tmp files", function () {
            const obj = new DB(new MemoryAdapter({
                "foo.tmp": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "foo.tmp.json": Buffer.from("{}", "utf8"),
            }));
            return expect(obj.get("foo.tmp")).to.eventually.be.rejected;
        });

        it("does not load .json files", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "foo.json.json": Buffer.from("{}", "utf8"),
            }));
            return expect(obj.get("foo.json")).to.eventually.be.rejected;
        });

        it("loads metadata", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from('{"foo": "bar", "baz": 42}', "utf8"),
            }));
            return obj.get("foo").then((item) => {
                return expect(item.metadata).to.deep.equal({
                    foo: "bar",
                    baz: 42,
                });
            });
        });

    });

    describe("#each()", function () {

        it("iterates over all items", function (done) {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "bar": Buffer.alloc(0),
                "bar.json": Buffer.from("{}", "utf8"),
            }));
            const ids = [];
            obj.each((item) => {
                ids.push(item.id);
                if (ids.length >= 2) {
                    expect(ids).to.have.members(["foo", "bar"]);
                    done();
                }
            });
        });

        it("returns a Promise", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
            }));
            return expect(obj.each(() => {})).to.eventually.be.fulfilled;
        });

        it("fulfills the Promise after all iterations are done", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "bar": Buffer.alloc(0),
                "bar.json": Buffer.from("{}", "utf8"),
            }));
            let iterations = 0;
            return obj.each(() => ++iterations).then(() => {
                return expect(iterations).to.equal(2);
            });
        });

        it("awaits Promises returned by the callback", function (done) {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "bar": Buffer.alloc(0),
                "bar.json": Buffer.from("{}", "utf8"),
            }));
            let first = true;
            let finished = false;
            obj.each(() => {
                if (first) {
                    first = false;
                    return Promise.delay(20).then(() => {
                        finished = true;
                    });
                }
                expect(finished).to.be.true;
                done();
            });
        });

        it("allows for element removal", function () {
            const obj = new DB(new MemoryAdapter({
                "foo": Buffer.alloc(0),
                "foo.json": Buffer.from("{}", "utf8"),
                "bar": Buffer.alloc(0),
                "bar.json": Buffer.from("{}", "utf8"),
                "qux": Buffer.alloc(0),
                "qux.json": Buffer.from("{}", "utf8"),
            }));
            let removed = null;
            obj.each((item) => {
                if (!removed) {
                    // pick any item other than the current
                    removed = item.id === "foo" ? "bar" : "foo";
                    return obj.remove(removed);
                }
                expect(item.id).to.not.equal(removed);
            });
        });

    });

});
