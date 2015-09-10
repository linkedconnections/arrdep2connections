var Readable = require('stream').Readable,
    util = require('util');
 
var ReadStream = function(data) {
  Readable.call(this, {objectMode: true});
  this.data = data;
  this.curIndex = 0;
};
util.inherits(ReadStream, Readable);

ReadStream.prototype._read = function() {
  if (this.curIndex === this.data.length)
    return this.push(null);
 
  var data = this.data[this.curIndex++];
  this.push(data);
};

module.exports = ReadStream;