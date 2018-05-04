"use strict";

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const IdSet = require("../lib/idset.js");

describe("lib/idset.js", function () {

    describe("#add()", function () {

        it("returns a promise", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return expect(obj.add("EF")).to.eventually.be.fulfilled;
        });

    });

    describe("#remove()", function () {

        it("returns a promise", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return expect(obj.remove("AB")).to.eventually.be.fulfilled;
        });

    });

    describe("#includes()", function () {

        it("finds loaded ids", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return expect(obj.includes("AB")).to.eventually.be.true;
        });

        it("finds added ids", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return obj.add("EF").then(function () {
                return expect(obj.includes("EF")).to.eventually.be.true;
            });
        });

        it("gives false for missing ids", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return expect(obj.includes("EF")).to.eventually.be.false;
        });

        it("gives false for removed ids", function () {
            const obj = new IdSet(() => ["AB", "CD"]);
            return obj.remove("AB").then(function () {
                return expect(obj.includes("AB")).to.eventually.be.false;
            });
        });

    });

});
