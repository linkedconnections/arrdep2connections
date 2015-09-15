var ArrDep2Connections = require('./lib/arrdep2connections.js'),
	stringify = require('JSONStream').stringify(false),
    jsonldstream = require('jsonld-stream'),
    param = require('param'),
 	MongoClient = require('mongodb').MongoClient,
 	StreamToMongo = require('./lib/StreamToMongo.js'),
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

// Load in MongoDB
if (options.mongoDb === true ) {
	var url = 'mongodb://' + options.mongoDbConfig.host + ':' + options.mongoDbConfig.port + '/' + options.mongoDbConfig.database;

	// First empty collection
	MongoClient.connect(url, function(err, db) {
		if (err) {
			die("Wasn't able to connect to MongoDB server. Check if your server is running.", url);
		}

		var collection = db.collection(options.mongoDbConfig.collection);
		collection.remove(); // empty the collection
		var streamToMongo = new StreamToMongo(collection);
  		var stream = departureStream.pipe(arrdep2connections).pipe(streamToMongo).on('finish', function () {
  			db.close(); // close connection
  		});
    });
} else {
	// Write to stdout
	departureStream.pipe(arrdep2connections).pipe(stringify).pipe(process.stdout);	
}