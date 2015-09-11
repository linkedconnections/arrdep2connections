var ArrDep2Connections = require('./lib/arrdep2connections.js'),
	stringify = require('JSONStream').stringify(false),
    jsonldstream = require('jsonld-stream'),
	fs = require('fs');

// Read filename arrivals.jsonldstream and departure.jsonldstream from parameters
var arrivalsFilename = './' + process.argv[2];
var departuresFilename = './' + process.argv[3];

// Initialise streams
var arrivalStream = fs.createReadStream(arrivalsFilename, {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
var departureStream = fs.createReadStream(departuresFilename, {encoding: 'utf8'}).pipe(new jsonldstream.Deserializer());
var arrdep2connections = new ArrDep2Connections(arrivalStream); // our transform stream

departureStream.pipe(arrdep2connections).pipe(stringify).pipe(process.stdout);

// Check parameter 4 for optional inbound or outbound
if (process.argv[4] && process.argv[4] === '-i') {
	var inbound = process.argv[5];
} else if (process.argv[4] && process.argv[4] === '-o') {
	var outbound = process.argv[5];
}

// Check parameter 6 for optional inbound or outbound
if (process.argv[6] && process.argv[6] === '-i') {
	var inbound = process.argv[7];
} else if (process.argv[6] && process.argv[6] === '-o') {
	var outbound = process.argv[7];
}

// TODO: taking care of in/outbound