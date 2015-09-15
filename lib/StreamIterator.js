var util = require('util'),
    EventEmitter = require('events').EventEmitter;

EventEmitter.prototype._maxListeners = 1000;

var StreamIterator = function (stream) {
  this._stream = stream;
  this["@context"] = {};
  var self = this;
  this._stream.on("end", function () {
    self._cb();
  });
};

util.inherits(StreamIterator, EventEmitter);

StreamIterator.prototype.next = function (callback) {
  var self = this;
  var object = this._stream.read();
  if (object && object["@context"]) {
    this["@context"] = object["@context"];
    object = null;
  }
  if (!object) {
    this._cb = callback;
    this._stream.once("readable", function () {;
      self.next(callback);
    });
  } else {
    callback(object);
  }
};

module.exports = StreamIterator;
