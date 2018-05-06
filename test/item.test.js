"use strict";

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const Item = require("../lib/item.js");

describe("lib/item.js", function () {

    it("has property 'id'", function () {
        const obj = new Item("foo", {});
        return expect(obj.id).to.equal("foo");
    });

    it("has property 'metadata'", function () {
        const metadata = {foo: "bar", baz: 42};
        const obj = new Item("foo", {}, metadata);
        return expect(obj.metadata).to.equal(metadata);
    });

    describe("#getReadable()", function () {

        it("gets a stream from the IO manager", function () {
            const expected = {};
            const manager = {
                createReadStream: () => Promise.resolve(expected),
            };
            const obj = new Item("foo", manager);
            expect(obj.getReadable()).to.eventually.equal(expected);
        });

        it("passes id, metadata and options to the IO manager", function (done) {
            const metadata = {meta: true};
            const expectedOptions = {options: true};
            const manager = {
                createReadStream: (id, meta, options) => {
                    expect(id).to.equal("foo");
                    expect(meta).to.equal(metadata);
                    expect(options).to.equal(expectedOptions);
                    done();
                    return Promise.resolve({});
                },
            };
            const obj = new Item("foo", manager, metadata);
            obj.getReadable(expectedOptions);
        });

    });

    describe("#getWritable()", function () {

        it("gets a stream from the IO manager", function () {
            const expected = {};
            const manager = {
                createWriteStream: () => Promise.resolve(expected),
            };
            const obj = new Item("foo", manager);
            expect(obj.getWritable()).to.eventually.equal(expected);
        });

        it("passes id, metadata and options to the IO manager", function (done) {
            const metadata = {meta: true};
            const expectedOptions = {options: true};
            const manager = {
                createWriteStream: (id, meta, options) => {
                    expect(id).to.equal("foo");
                    expect(meta).to.equal(metadata);
                    expect(options).to.equal(expectedOptions);
                    done();
                    return Promise.resolve({});
                },
            };
            const obj = new Item("foo", manager, metadata);
            obj.getWritable(expectedOptions);
        });

    });

});
