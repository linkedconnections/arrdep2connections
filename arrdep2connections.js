var ReadStream = require('./lib/ReadStream.js'),
	ArrDep2Connections = require('./lib/arrdep2connections.js'),
	stringify = require('JSONStream').stringify(false);

// Read filename arrivals.json and departure.json from parameters
var arrivalsFilename = './' + process.argv[2];
var arrivalData = require(arrivalsFilename);
var departuresFilename = './' + process.argv[3];
var departureData = require(departuresFilename);

// Initialise streams
var arrivalStream = new ReadStream(arrivalData);
var departureStream = new ReadStream(departureData);
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