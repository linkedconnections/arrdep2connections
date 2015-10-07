var Writable = require('stream').Writable;
var util = require('util');

function StreamToMongo(collection) {
  Writable.call(this, { objectMode: true });

  this._collection = collection;
}

util.inherits(StreamToMongo, Writable);

StreamToMongo.prototype._write = function (obj, encoding, done) {
  this._collection.insert(obj, function(err, result) {
    if (!err) {
		//console.log(result);
  		done();
    } else {
      done(err);
    }
  });
};

module.exports = StreamToMongo;