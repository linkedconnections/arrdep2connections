# Arrivals and Departures to Connections

This javascript library transforms a [JSON-LD stream](https://github.com/pietercolpaert/jsonld-stream) of "arrivals and departures" to "connections".

This code is useful for route planning applications where arrivals and departures are easy to generate, but connections are difficult to get right in the same processing.

## Install and use

### CLI

```bash
npm install -g arrdep2connections
```

Now you can use the code on top of 2 files which follow the [JSON-LD stream specification](https://github.com/pietercolpaert/jsonld-stream):

```bash
node arrdep2connections --arrivals arrivals.jsonldstream --departures departures.jsonldstream [--mongodb] [--inbound context.json] > connections.jsonldstream
```

Optionally, you can specify a different inbound `context.json` using the `--inbound` flag, and a different outbound context by using the `--outbound` flag. You can also specify to load connections into MongoDB using the `--mongodb` flag. See `config/development.json` for more configuration options.

### NodeJS library

Install it using npm:
```bash
npm install --save arrdep2connections
```
Use it in your code:
```javascript
var arrdep2connections = require('arrdep2connections');
var stringify = require('JSONStream').stringify(false);

departureStream.pipe(arrdep2connections(arrivalStream)).pipe(stringify).pipe(process.stdout);
```

## Data models

### 1. Arrival objects and departure objects

A departure is something of this form:

```json
{
  "date" : "2015-12-25",
  "departureTime" : "23:49",
  "stop" : "{stop1}",
  "other properties" : "other values"
}
```

Explanation:

|property|URI|description|type|
|:--:|:--:|:--:|:--:|
|date|[dcterms:date](http://purl.org/dc/terms/date)|date when the trip of the vehicle departed|a day in ISO8601 format or xsd:date|
|departureTime|[gtfs:departureTime](http://vocab.gtfs.org/terms#departureTime)|departure time given as a duration calculated starting at noon minus 12h in this format "hh:mm"|iso8601 or xsd:duration|
|stop|[gtfs:stop](http://vocab.gtfs.org/terms#stop)|stop of departure|an identifier of the stop of departure |
|other properties||Feel free to add anything on here. When properties overlap with an arrival, only the property from the departure is kept in the connection.|||

An Arrival is something of this form:

```json
{
  "date" : "2015-12-25",
  "arrivalTime" : "24:16",
  "stop" : "{stop2}",
  "other properties" : "other values"
}
```

Explanation:

|property|URI|description|type|
|:--:|:--:|:--:|:--:|
|date|[dcterms:date](http://purl.org/dc/terms/date)|date when the trip of the vehicle departed|a day in ISO8601 format or xsd:date|
|arrivalTime|[gtfs:arrivalTime](http://vocab.gtfs.org/terms#arrivalTime)|arrival time given as a duration calculated starting at noon minus 12h in this format "hh:mm"|iso8601 or xsd:duration|
|stop|[gtfs:stop](http://vocab.gtfs.org/terms#stop)|stop of arrival|an identifier of the stop of arrival |
|other properties| | Feel free to add anything on here. When properties overlap with a departure, only the property from the departure is kept in the connection.|||

### 2. A connection object

A connection object is something that looks like this:

```json
{
  "departureTime" : "2015-12-25T23:49",
  "departureStop" : "{stop1}",
  "arrivalTime" : "2015-12-26T00:16",
  "arrivalStop" : "{stop2}",
  "other properties" : "other values"
}
```

Explanation:

|property|URI|description|type|
|:--:|:--:|:--:|:--:|
|arrivalTime|[lc:arrivalTime](http://semweb.mmlab.be/ns/linkedconnections#arrivalTime)|arrival date/time|iso8601 or xsd:dateTime|
|arrivalStop|[lc:arrivalStop](http://semweb.mmlab.be/ns/linkedconnections#arrivalStop)|stop of arrival|an identifier of the stop of arrival |
|departureTime|[lc:departureTime](http://semweb.mmlab.be/ns/linkedconnections#departureTime)|departure date/time|iso8601 or xsd:dateTime|
|departureStop|[lc:departureStop](http://semweb.mmlab.be/ns/linkedconnections#departureStop)|stop of departure|an identifier of the stop of departure |
|other properties||copied properties from the arrival/departure objects||
