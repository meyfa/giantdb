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

    describe("#createReadStream()", function () {

        it("gets a stream from the IO manager", function () {
            const expected = {};
            const manager = {
                createReadStream: () => expected,
            };
            const obj = new Item("foo", manager);
            expect(obj.createReadStream()).to.equal(expected);
        });

        it("passes the id to the IO manager", function (done) {
            const manager = {
                createReadStream: (id) => {
                    expect(id).to.equal("foo");
                    done();
                    return {};
                },
            };
            const obj = new Item("foo", manager);
            obj.createReadStream();
        });

    });

    describe("#createWriteStream()", function () {

        it("gets a stream from the IO manager", function () {
            const expected = {};
            const manager = {
                createWriteStream: () => expected,
            };
            const obj = new Item("foo", manager);
            expect(obj.createWriteStream()).to.equal(expected);
        });

        it("passes the id to the IO manager", function (done) {
            const manager = {
                createWriteStream: (id) => {
                    expect(id).to.equal("foo");
                    done();
                    return {};
                },
            };
            const obj = new Item("foo", manager);
            obj.createWriteStream();
        });

    });

});
