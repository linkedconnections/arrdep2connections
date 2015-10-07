var fs = require('fs'),
    should = require('should'),
    jsonldstream = require('jsonld-stream'),
    param = require('param'),
    ArrDep2Connections = require('../lib/arrdep2connections.js');

describe('Creating lists', function () {
  //Create a stream of arrivals
  var arrivalsStream = fs.createReadStream('./test/data/arrivals.jsonldstream', {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
  //Create a stream of departures
  var departuresStream = fs.createReadStream('./test/data/departures.jsonldstream', {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
  //Now, they should be able to emit connections when combined in the code
  it('should be emitting connections', function (done) {
    // Read standard configuration parameters
    var options = {};
    options['mongoDb'] = param('mongodb');
    options['mongoDbConfig'] = param('mongoDbConfig');
    options['inbound'] = param('inbound');
    options['outbound'] = param('outbound');

    var transformer = new ArrDep2Connections(arrivalsStream, options);
    var stream = departuresStream.pipe(transformer);
    var count = 0;
    stream.on("data", function (connection) {
      if (connection && !connection["@context"]) {
        count++;
      }
    });
    stream.on("end", function () {
      count.should.be.exactly(2);
      done();
    });
  });
});
