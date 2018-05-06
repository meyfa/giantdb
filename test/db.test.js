"use strict";

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const Change = require("../lib/change.js");
const Item = require("../lib/item.js");
const MemoryAdapter = require("../lib/adapters/memory.js");

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

});
