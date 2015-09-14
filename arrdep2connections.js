var ArrDep2Connections = require('./lib/arrdep2connections.js'),
	stringify = require('JSONStream').stringify(false),
    jsonldstream = require('jsonld-stream'),
    param = require('param'),
	fs = require('fs');

// Read filename arrivals.jsonldstream and departure.jsonldstream from parameters
var arrivals = param('arrivals');
var departures = param('departures');

// Read extra configuration parameters
var options = {};
options['mongoDb'] = param('mongodb');
options['mongoDbConfig'] = param('mongoDbConfig');
options['inbound'] = param('inbound');
options['outbound'] = param('outbound');

// Initialise streams
var arrivalStream = fs.createReadStream(arrivals, {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
var departureStream = fs.createReadStream(departures, {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
var arrdep2connections = new ArrDep2Connections(arrivalStream, options); // our transform stream

departureStream.pipe(arrdep2connections).pipe(stringify).pipe(process.stdout);