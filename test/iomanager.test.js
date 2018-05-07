"use strict";

const Promise = require("bluebird");

const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const PassThrough = require("stream").PassThrough;
const DevNull = require("dev-null");

const IOManager = require("../lib/iomanager.js");

function mockMiddlewareManager() {
    return {
        transformReadable: function (stream, meta/*, options*/) {
            return {
                stream: stream,
                metadata: meta,
                metadataChanged: false,
            };
        },
        transformWritable: function  (stream, meta/*, options*/) {
            return {
                stream: stream,
                metadata: meta,
                metadataChanged: false,
            };
        },
    };
}

describe("lib/iomanager.js", function () {

    describe("#createReadStream()", function () {

        it("gets a stream from the adapter", function () {
            const expected = new PassThrough();
            const adapter = {
                createReadStream: (id) => {
                    expect(id).to.equal("foo");
                    return expected;
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            return expect(obj.createReadStream("foo"))
                .to.eventually.have.property("stream").that.equals(expected);
        });

        it("applies the middleware", function () {
            const stream1 = new PassThrough(), stream2 = new PassThrough();
            const meta1 = {meta: true}, meta2 = {meta: true, ordinal: 2};
            const options = {options: true};

            const middlewareResult = {
                stream: stream2,
                metadata: meta2,
                metadataChanged: true,
            };

            const adapter = {
                createReadStream: () => stream1,
                createWriteStream: () => new PassThrough(),
            };
            const middlewareManager = mockMiddlewareManager();
            middlewareManager.transformReadable = function (stream, meta, opts) {
                expect(stream).to.equal(stream1);
                expect(meta).to.equal(meta1);
                expect(opts).to.equal(options);

                return Promise.resolve(middlewareResult);
            };

            const obj = new IOManager(adapter, middlewareManager);
            return expect(obj.createReadStream("foo", meta1, options))
                .to.eventually.deep.equal(middlewareResult);
        });

        it("writes metadata if changed by middleware", function (done) {
            const adapter = {
                createReadStream: () => new PassThrough(),
                createWriteStream: (fileName) => {
                    expect(fileName).to.equal("foo.json");
                    done();
                    return new PassThrough();
                },
            };
            const middlewareManager = mockMiddlewareManager();
            middlewareManager.transformReadable = function () {
                return Promise.resolve({
                    stream: new PassThrough(),
                    metadata: {},
                    metadataChanged: true,
                });
            };

            const obj = new IOManager(adapter, middlewareManager);
            obj.createReadStream("foo", {}, {});
        });

    });

    describe("#createWriteStream()", function () {

        it("gets a stream from the adapter", function () {
            const expected = new DevNull();
            const adapter = {
                createWriteStream: (id) => {
                    expect(id).to.equal("foo");
                    return expected;
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            expect(obj.createWriteStream("foo"))
                .to.eventually.have.property("stream").that.equals(expected);
        });

        it("applies the middleware", function () {
            const stream1 = new PassThrough(), stream2 = new PassThrough();
            const meta1 = {meta: true}, meta2 = {meta: true, ordinal: 2};
            const options = {options: true};

            const middlewareResult = {
                stream: stream2,
                metadata: meta2,
                metadataChanged: true,
            };

            const adapter = {
                createReadStream: () => new PassThrough(),
                createWriteStream: () => stream1,
            };
            const middlewareManager = mockMiddlewareManager();
            middlewareManager.transformWritable = function (stream, meta, opts) {
                expect(stream).to.equal(stream1);
                expect(meta).to.equal(meta1);
                expect(opts).to.equal(options);

                return Promise.resolve(middlewareResult);
            };

            const obj = new IOManager(adapter, middlewareManager);
            return expect(obj.createWriteStream("foo", meta1, options))
                .to.eventually.deep.equal(middlewareResult);
        });

        it("writes metadata if changed by middleware", function (done) {
            const adapter = {
                createReadStream: () => new PassThrough(),
                createWriteStream: (fileName) => {
                    if (fileName === "foo.json") {
                        done();
                    }
                    return new PassThrough();
                },
            };
            const middlewareManager = mockMiddlewareManager();
            middlewareManager.transformWritable = function () {
                return Promise.resolve({
                    stream: new PassThrough(),
                    metadata: {},
                    metadataChanged: true,
                });
            };

            const obj = new IOManager(adapter, middlewareManager);
            obj.createWriteStream("foo", {}, {});
        });

    });

    describe("#createTemporary()", function () {

        it("gets a stream from the adapter", function () {
            const expected = new DevNull();
            const adapter = {
                createWriteStream: () => expected,
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            expect(obj.createTemporary("foo", {})).to.eventually.equal(expected);
        });

        it("applies the middleware", function () {
            const stream1 = new PassThrough(), stream2 = new PassThrough();
            const metadata = {meta: true};
            const options = {options: true};

            const adapter = {
                createReadStream: () => new PassThrough(),
                createWriteStream: () => stream1,
            };
            const middlewareManager = mockMiddlewareManager();
            middlewareManager.transformWritable = function (stream, meta, opts) {
                expect(stream).to.equal(stream1);
                expect(meta).to.deep.equal({});
                expect(opts).to.equal(options);

                return Promise.resolve({
                    stream: stream2,
                    metadata: metadata,
                    metadataChanged: true,
                });
            };

            const obj = new IOManager(adapter, middlewareManager);
            return expect(obj.createTemporary("foo", options))
                .to.eventually.equal(stream2);
        });

        it("writes metadata", function (done) {
            const stream = new PassThrough();
            const adapter = {
                createWriteStream: (fileName) => {
                    return fileName === "foo.json" ? stream : new DevNull();
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.createTemporary("foo").then(() => {
                stream.on("data", (chunk) => {
                    expect(JSON.parse(chunk.toString("utf8")))
                        .to.be.an("object");
                    done();
                });
            });
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
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.publish("foo");
        });

    });

    describe("#delete()", function () {

        it("deletes the file", function (done) {
            const adapter = {
                delete: (id) => {
                    if (id === "foo") {
                        done();
                    }
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.delete("foo");
        });

        it("deletes the metadata", function (done) {
            const adapter = {
                delete: (id) => {
                    if (id === "foo.json") {
                        done();
                    }
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.delete("foo");
        });

    });

    describe("#deleteTemporary()", function () {

        it("deletes the file", function (done) {
            const adapter = {
                delete: (id) => {
                    if (id === "foo.tmp") {
                        done();
                    }
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.deleteTemporary("foo");
        });

        it("deletes the metadata", function (done) {
            const adapter = {
                delete: (id) => {
                    if (id === "foo.json") {
                        done();
                    }
                    return Promise.resolve();
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.deleteTemporary("foo");
        });

    });

    describe("#readMetadata()", function () {

        it("parses the JSON file", function () {
            const adapter = {
                createReadStream: (fileName) => {
                    expect(fileName).to.equal("foo.json");
                    const stream = new PassThrough();
                    stream.end('{"foo": "bar"}', "utf8");
                    return stream;
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            return expect(obj.readMetadata("foo")).to.eventually.deep.equal({
                foo: "bar",
            });
        });

        it("rejects on syntax error", function () {
            const adapter = {
                createReadStream: (fileName) => {
                    expect(fileName).to.equal("foo.json");
                    const stream = new PassThrough();
                    stream.end("}foo", "utf8");
                    return stream;
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            return expect(obj.readMetadata("foo")).to.eventually.be.rejected;
        });

    });

    describe("#writeMetadata()", function () {

        it("writes the JSON file", function (done) {
            const adapter = {
                createWriteStream: (fileName) => {
                    expect(fileName).to.equal("foo.json");
                    const stream = new PassThrough();
                    let dataCalled = false;
                    stream.on("data", function (chunk) {
                        expect(JSON.parse(chunk.toString("utf8")))
                            .to.deep.equal({
                                foo: "bar",
                            });
                        dataCalled = true;
                    });
                    stream.on("end", function () {
                        expect(dataCalled).to.be.true;
                        done();
                    });
                    return stream;
                },
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            obj.writeMetadata("foo", {
                foo: "bar",
            });
        });

        it("returns a Promise", function () {
            const adapter = {
                createWriteStream: () => new DevNull(),
            };
            const obj = new IOManager(adapter, mockMiddlewareManager());
            return expect(obj.writeMetadata("foo", {}))
                .to.eventually.be.fulfilled;
        });

    });

});
