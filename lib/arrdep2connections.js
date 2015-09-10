var Transform = require('stream').Transform,
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
    "data" : "dct:date",
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
    departure["lc:departureTime"] =  new Date(this._normalizeISO8601(departure["date"] + 'T' + departure["gtfs:departureTime"]));
    var self = this;
    this._arrivalsQueueIndex = 0;
    this._getNextArrival(function (arrival) {
      if (arrival) {
        var processNextArrival = function () {
          self._getNextArrival(function (nextArrival) {
            if (nextArrival) {
              //TODO: check if gtfs:stopSequence and maxStopSequence is set... otherwise, ignore this feature?
              if (departure["gtfs:stopSequence"] != departure["maxStopSequence"]) {
                setImmediate(function () {
                  debugger;
                  self._processArrival(departure, nextArrival, processNextArrival, done);
                });
              } else {
                done(); // next departure
              }
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
  connection["arrivalTime"] = arrival["lc:arrivalTime"];
  connection["arrivalStop"] = arrival["gtfs:stop"];
  connection["departureTime"] = departure["lc:departureTime"];
  connection["departureStop"] = departure["gtfs:stop"];
  connection["gtfs:trip"] = departure["gtfs:trip"];
  if (departure["gtfs:headsign"] || arrival["gtfs:headsign"]) 
    connection["gtfs:headsign"] = departure["gtfs:headsign"] || arrival["gtfs:headsign"];
  connection["gtfs:route"] = departure["gtfs:route"];
  //TODO: extend with other...
  return connection;
};

/**
 * Normalizes an ISO string to always use dashes, colons and a period instead of a comma
 */
ArrDep2Connections.prototype._normalizeISO8601 = function (str) {
  return str
    //if a ss,SSSS is detected, turn it into ss.SSSS
    .replace(/(\d{2}),(\d\d?\d?\d?)/,"$1.$2")
    //if a YYYYYYMMDD is detected, add dashes
    .replace(/^(\s*)([+-]\d{6})(\d{2})(\d{2})/,"$1$2-$3-$4")
    //if a YYYYMMDD is detected, add dashes
    .replace(/^(\s*)(\d{4})(\d{2})(\d{2})/,"$1$2-$3-$4")
    //if a GGGG[W]WWE is detected, add dashes
    .replace(/^(\s*)(\d{4})W(\d{2})(\d{1})/,"$1$2-W$3-$4")
    //if a GGGG[W]WW is detected, add dashes
    .replace(/^(\s*)(\d{4})W(\d{2})/,"$1$2-W$3")
    //if a YYYYDDD is detected, add dashes
    .replace(/^(\s*)(\d{4})(\d{3})/,"$1$2-$3")
    //if a HHmmss is detected, add colons
    .replace(/(T| )(\d{2})(\d{2})(\d{2})/,"$1$2:$3:$4")
    //if a HHmm is detected, add colons
    .replace(/(T| )(\d{2})(\d{2})/,"$1$2:$3")
    //if a timezone is detected without a colon, add a colon
    .replace(/(?!^\s*)([+-])([0-1][0-9])(\d{2})/,"$1$2:$3");
};

ArrDep2Connections.prototype._getNextArrival = function (cb) {
  //TODO: make sure the context of the arrival is taken into account
  var arrivalQueueItem = this._arrivalsQueue[this._arrivalsQueueIndex];
  var self = this;
  if (arrivalQueueItem) {
    this._arrivalsQueueIndex++;
    cb(arrivalQueueItem);
  } else {
    this._arrivalsIterator.next(function (arrival) {
      arrival["lc:arrivalTime"] = new Date(self._normalizeISO8601(arrival["date"] + 'T' + arrival["gtfs:arrivalTime"]));
      self._arrivalsQueue.push(arrival);
      cb(arrival);
    });
  }
}

ArrDep2Connections.prototype._processArrival = function (departure, arrival, next, done) {
  //check if arrival has the same trip id, if it does, we've got a winner: first thing always wins
  var departureTime = departure["lc:departureTime"]; // e.g.: Date object 2015-09-09T00:01
  var arrivalTime = arrival["lc:arrivalTime"];
  var departureDateTime = new Date(departureTime);
  var arrivalDateTime = new Date(arrivalTime);

  if (arrivalDateTime <= departureDateTime) {
    //discart it (as this is only possible for the first X items, we can do shift and bring the arrivalsQueueIndex back to 0
    for (var i = 0; i < this._arrivalsQueueIndex; i++) {
      this._arrivalsQueue.shift();
    }
    this._arrivalsQueueIndex = 0;
    next();
  } else if (departure["gtfs:trip"] === arrival["gtfs:trip"] && parseInt(departure["gtfs:stopSequence"])+1 === parseInt(arrival["gtfs:stopSequence"])) {
    //TODO: what if stopSequence is not set? Can we still calculate arrivals and departures?
    //first one to encounter each other: it's a match!
    var connection = this._createConnection(arrival, departure);
    this.push(connection);
    done();
  } else {
    //arrival is part of the next one part of another trip.
    next();
    //done();
  }
}

module.exports = ArrDep2Connections;
