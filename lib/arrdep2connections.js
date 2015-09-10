var Transform = require('stream').Transform,
    util = require('util'),
    StreamIterator = require('./StreamIterator.js');

util.inherits(ArrDep2Connections, Transform);

function ArrDep2Connections (arrivalsStream, options) {
  Transform.call(this, {objectMode : true});
  this._arrivalsIterator = new StreamIterator(arrivalsStream);
  //This should be changed by a way to get the next ones at a certain stop?
  this._arrivalsQueue = []; //chronologically sorted list of arrivals
  this._arrivalsQueueIndex = 0;
}

ArrDep2Connections.prototype._transform = function (departure, encoding, done) {
  departure["gtfs:departureTime"] = departure["date"] + 'T' + departure["gtfs:departureTime"];
  var self = this;
  this._arrivalsQueueIndex = 0;
  this._getNextArrival(function (arrival) {
    if (arrival) {
      var processNextArrival = function () {
        self._getNextArrival(function (nextArrival) {
          if (nextArrival) {
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
      //we can call nextArrival if no connection has been found, or done when a connection has been found
      self._processArrival(departure, arrival, processNextArrival, done);
    } else {
      console.error("No beginning arrival found...");
    }
  });
}

ArrDep2Connections.prototype._createConnection = function (arrival, departure) {
  var connection = {};
  connection["@type"] = "Connection";
  connection["arrivalTime"] = arrival["gtfs:arrivalTime"];
  connection["arrivalStop"] = arrival["gtfs:stop"];
  connection["departureTime"] = departure["gtfs:departureTime"];
  connection["departureStop"] = departure["gtfs:stop"];
  connection["gtfs:trip"] = departure["gtfs:trip"];
  connection["gtfs:route"] = departure["gtfs:route"];
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
      arrival["gtfs:arrivalTime"] = arrival["date"] + 'T' + arrival["gtfs:arrivalTime"];

      self._arrivalsQueue.push(arrival);

      cb(arrival);
    });
  }
}

ArrDep2Connections.prototype._processArrival = function (departure, arrival, next, done) {
  //check if arrival has the same trip id, if it does, we've got a winner: first thing always wins
  var departureTime = departure["gtfs:departureTime"]; // e.g.: 2015-09-09T00:01
  var arrivalTime = arrival["gtfs:arrivalTime"];
  var departureDateTime = new Date(departureTime.substr(0,4), departureTime.substr(5,2), departureTime.substr(8,2), departureTime.substr(11,2), departureTime.substr(14,2));
  var arrivalDateTime = new Date(arrivalTime.substr(0,4), arrivalTime.substr(5,2), arrivalTime.substr(8,2), arrivalTime.substr(11,2), arrivalTime.substr(14,2));

  if (arrivalDateTime <= departureDateTime) {
    //discart it (as this is only possible for the first X items, we can do shift and bring the arrivalsQueueIndex back to 0
    for (var i = 0; i < this._arrivalsQueueIndex; i++) {
      this._arrivalsQueue.shift();
    }
    this._arrivalsQueueIndex = 0;
    next();
  }
  else if (departure["gtfs:trip"] === arrival["gtfs:trip"] && parseInt(departure["gtfs:stopSequence"]) + 1 === parseInt(arrival["gtfs:stopSequence"])) {
    //first one to encounter each other: it's a match!
    var connection = this._createConnection(arrival, departure);
    this.push(connection);
    done();
  } else {
    //arrival is part of the next one part of another trip.
    next();
  }
}

module.exports = ArrDep2Connections;