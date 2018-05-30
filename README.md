# GiantDB

[![Build Status](https://travis-ci.org/meyfa/giantdb.svg?branch=master)](https://travis-ci.org/meyfa/giantdb)
[![Test Coverage](https://api.codeclimate.com/v1/badges/39ebc35a4b32350a0191/test_coverage)](https://codeclimate.com/github/meyfa/giantdb/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/39ebc35a4b32350a0191/maintainability)](https://codeclimate.com/github/meyfa/giantdb/maintainability)

GiantDB is a large object store, written entirely in JavaScript. It provides
managed data storage with a minimal, yet powerful programming interface.
Promises and streams are used for making this efficient.

Encryption is realized as a middleware module,
[giantdb-crypto](https://github.com/meyfa/giantdb-crypto). For usage
instructions please read giantdb-crypto's documentation.

## Install

```
npm install --save giantdb
```

## Setup

```javascript
const GiantDB = require("giantdb");

const db = new GiantDB(/* source */);
```

The `source` argument is optional. If it is not provided, GiantDB will use an
in-memory file store. If it is a string that denotes a directory on the file
system, that directory will be used for file storage.

## Usage

### Class: DB

#### Method: db.create()

This prepares a new item for storage. It returns a Promise that resolves to a
special writable stream to which you can write data. Once done, you call
`.commit()` to finalize the item and obtain an `Item` instance.

Example:

```javascript
db.create().then((change) => {
    change.write("hello world", "utf8");
    // you can also .pipe(change), for example

    return change.commit();
}).then((item) => {
    // the item is now stored
    console.log(item.id);
});
```

#### Method: db.get(id)

This obtains the item with the given id. It returns a Promise that resolves to
the `Item` instance.

Example:

```javascript
db.get("d54232abbf9e9dc4e6a8fd72a6e25585").then((item) => {
    console.log(item.id); // "d54232abbf9e9dc4e6a8fd72a6e25585"
});
```

#### Method: db.remove(id)

This removes the item with the given id. It returns a Promise that resolves when
done. Any data associated with the item will be gone.

Example:

```javascript
db.remove("d54232abbf9e9dc4e6a8fd72a6e25585").then(() => {
    console.log("done");
});
```

#### Method: db.each(callback)

This method iterates over all items. Iteration happens one after the other. If
the callback returns a Promise, it is awaited before continuing with the next
item.

Example:

```javascript
db.each((item) => {
    console.log(item.id);
});
```

### Class: Item

#### Properties

- `item.id`: The item's id string.
- `item.metadata`: The item's metadata.

Item metadata can be used by middleware, but is also available for other
purposes. Call `item.saveMetadata()` to preserve changes.

#### Method: item.getReadable()

This obtains a read stream for reading the item's data. It returns a Promise.

Example:

```javascript
db.get("d54232abbf9e9dc4e6a8fd72a6e25585").then((item) => {
    return item.getReadable().then((readable) => {
        // read data from the stream
    });
});
```

#### Method: item.getWritable()

This obtains a write stream for writing data to the item, replacing any previous
contents. It returns a Promise.

Example:

```javascript
db.get("d54232abbf9e9dc4e6a8fd72a6e25585").then((item) => {
    return item.getWritable().then((writable) => {
        // write data to the stream
    });
});
```

#### Method: item.saveMetadata()

This saves the item's metadata in its current state. It must be called for the
metadata to persist after modifications have been made.

Note that the metadata may also be saved on other occurrences (e.g. when
modified by middleware), but that is not guaranteed.

Example:

```javascript
db.get("d54232abbf9e9dc4e6a8fd72a6e25585").then((item) => {
    item.metadata.lastRead = Date.now();
    return item.saveMetadata().then(() => {
        console.log("saved");
    });
});
```

## Writing Middleware

### Basics

Every middleware is simply an object. At different stages, GiantDB will call
specific functions on that object, given that they are available. The functions
can operate on their inputs and provide some or no output.

Through this mechanic, it is possible to extend GiantDB with custom
functionality. The encryption middleware is the best example for this.

### Middleware Functions

#### transformReadable

```javascript
function transformReadable(stream, metadata, options, next)
```

This function is called every time a *readable* stream to one of the items is
constructed. It enables the middleware to tap into the read stream or modify it.
An example for this would be piping the input through a decryption stream.

- `stream` (`stream.Readable`): The input read stream.
- `metadata` (`Object`): The item's current metadata.
- `options` (`Object`): An object provided by the user.
- `next` (`function (error, result)`): A callback.

Calling `next()` is mandatory, otherwise middleware processing cannot continue.
If you need to, pass an `Error` as the first argument to the callback.

When either `stream` or `metadata` changed as part of your middleware function,
you must pass a result object containing the changed properties to the callback,
like this:

```javascript
next(null, {
    stream: myNewReadStream, // if stream changed
    metadata: myNewMetadata, // if metadata changed
});
```

#### transformWritable

```javascript
function transformWritable(stream, metadata, options, next)
```

This function is called every time a *writable* stream to one of the items is
constructed. It enables the middleware to modify the stream.
An example for this would be adding an encryption layer.

- `stream` (`stream.Writable`): The input write stream.
- `metadata` (`Object`): The item's current metadata.
- `options` (`Object`): An object provided by the user.
- `next` (`function (error, result)`): A callback.

Calling `next()` is mandatory, otherwise middleware processing cannot continue.
If you need to, pass an `Error` as the first argument to the callback.

When either `stream` or `metadata` changed as part of your middleware function,
you must pass a result object containing the changed properties to the callback,
like this:

```javascript
next(null, {
    stream: myNewWriteStream, // if stream changed
    metadata: myNewMetadata, // if metadata changed
});
```
