var Transform = require('stream').Transform,
    async = require('async'),
    util = require('util'),
    moment = require('moment'),
    StreamIterator = require('./StreamIterator.js');

util.inherits(ArrDep2Connections, Transform);

function ArrDep2Connections (arrivalsStream, options) {
  Transform.call(this, {objectMode : true});
  this._arrivalsIterator = new StreamIterator(arrivalsStream);
  //This should be changed by a way to get the next ones at a certain stop?
  this._arrivalsQueue = []; //chronologically sorted list of arrivals
  this._arrivalsQueueIndex = 0;
  this._departuresContext = {"@context" : {}};
  //This is a jsonldstream as well and has a this["@context"]
  this["@context"] = {
    "gtfs": "http://vocab.gtfs.org/terms#",
    "lc" : "http://semweb.mmlab.be/ns/linkedconnections#",
    "Connection" : "http://semweb.mmlab.be/ns/linkedconnections#Connection",
    "dct" : "http://purl.org/dc/terms/",
    "arrivalTime" : "lc:arrivalTime",
    "arrivalStop" : "lc:arrivalStop",
    "departureTime" : "lc:departureTime",
    "departureStop" : "lc:departureStop"
  };
  this.push({"@context":this["@context"]});
}

ArrDep2Connections.prototype._flush = function (done) {
  //Try to match the remainder of the departure/arrival pairs
  //console.log(this._arrivalsQueue);
  done();
};

ArrDep2Connections.prototype._transform = function (departure, encoding, done) {
  if (departure["@context"]) {
    this._departuresContext = departure["@context"];
    done();
  } else {
    var self = this;
    this._arrivalsQueueIndex = 0;
    this._getNextArrival(function (arrival) {
      if (arrival) {
        var processNextArrival = function () {
          self._getNextArrival(function (nextArrival) {
            if (nextArrival) {
              setImmediate(function () {
                self._processArrival(departure, nextArrival, processNextArrival, done);
              });
            } else {
              console.error("no next arrival");
            }
          });
        };
        //we can call nextArrival if no connections have been found, or done when a connection has been found
        self._processArrival(departure, arrival, processNextArrival, done);
      } else {
        console.error("No beginning arrival found...");
      }
    });
  }
}

ArrDep2Connections.prototype._createConnection = function (arrival, departure) {
  var connection = {};
  connection["@type"] = "Connection";
  connection["arrivalTime"] = arrival["gtfs:arrivalTime"];
  connection["arrivalStop"] = arrival["gtfs:stop"];
  connection["departureTime"] = departure["gtfs:departureTime"];
  connection["departureStop"] = departure["gtfs:stop"];
  connection["gtfs:trip"] = departure["gtfs:trip"];
  if (departure["gtfs:headsign"] || arrival["gtfs:headsign"]) 
    connection["gtfs:headsign"] = departure["gtfs:headsign"] || arrival["gtfs:headsign"];
  //TODO: extend with other...
  return connection;
};

ArrDep2Connections.prototype._getNextArrival = function (cb) {
  var arrivalQueueItem = this._arrivalsQueue[this._arrivalsQueueIndex];
  var self = this;
  if (arrivalQueueItem) {
    this._arrivalsQueueIndex++;
    cb(arrivalQueueItem);
  } else {
    this._arrivalsIterator.next(function (arrival) {
      self._arrivalsQueue.push(arrival);
      cb(arrival);
    });
  }
}

ArrDep2Connections.prototype._processArrival = function (departure, arrival, next, done) {
  //check if arrival has the same trip id, if it does, we've got a winner: first thing always wins
  //TODO: what if dct:date is of another iso8601 format?
  var departureTime = moment(departure["dct:date"],"YYYYMMDD").add(moment.duration(departure["gtfs:departureTime"]));
  var arrivalTime = moment(arrival["dct:date"],"YYYYMMDD").add(moment.duration(arrival["gtfs:arrivalTime"]));
  if (arrivalTime <= departureTime) {
    //discart it (as this is only possible for the first X items, we can do shift and bring the arrivalsQueueIndex back to 0
    //debugger;
    for (var i = 0; i < this._arrivalsQueueIndex; i++) {
      this._arrivalsQueue.shift();
    }
    this._arrivalsQueueIndex = 0;
    next();
  } else if (arrival["dct:date"] !== departure["dct:date"]) {// && departure["gtfs:trip"] === arrival["gtfs:trip"]) {
    //it's later in time, but the arrivaltime is not on the same day as the departure time
    //it's possibly the first arrival of the next iteration of the trip: let's get rid of this departure for now: later we should check whether we have a flag set
    //console.error(arrivalTime.toISOString().substr(0,10),departureTime.toISOString().substr(0,10));
    done(null, null);
  } else if (departure["gtfs:trip"] === arrival["gtfs:trip"]) {
    //first one to encounter each other: it's a match!
    done(null, this._createConnection(arrival, departure));
  } else {
    //arrival is part of the next one part of another trip.
    next();
    //done();
  }
}

module.exports = ArrDep2Connections;
