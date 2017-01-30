/**
 * Created by jbblanc on 30/11/2015.
 */
const  log = require('./log').logger;
const utils = require('./utils');


function getUUID(data) {
  var struct, uuidFrags = [],
      d4Frags = [];
  struct = data.readStruct(["d1", "uint32", "d2", "uint16", "d3", "uint16", "d4", ["[]", "uint8", 8]]), uuidFrags.push(toHex(struct.d1, 8)), uuidFrags.push(toHex(struct.d2, 4)), uuidFrags.push(toHex(struct.d3, 4));
  for (var j = 0; j < struct.d4.length; j++) d4Frags.push(toHex(struct.d4[j], 2));
  return uuidFrags.push(d4Frags.join("")), uuidFrags.join("-")
};


function toHex(a, b) {
  for (var c = "", d = 0; b > d; d++) c += "0";
  return (c + a.toString(16)).substr(-b)
};

function evToString(){
  return this.uuid + "-> " + this.value;
};

function textEvToString() {
  return this.uuid + "-> " + 'icon="' + this.uuidIcon + '" ' + 'text="' + this.text + '"'
};

function daytimerEvToString() {
  return this.uuid + ' -> defaultValue="' + this.defValue + '" entries=' + JSON.stringify(this.entries)
};

function weatherEvToString() {
  //var date = new LxDate([2009, 0, 1]);
  return  this.uuid + ' -> lastUpdate="' + date.format("LLLL") + '" entries=' + JSON.stringify(this.entries)
};


module.exports = {
  Type: {
    TEXT: 0,
    FILE: 1,
    EVENT: 2,
    EVENTTEXT: 3,
    DAYTIMER: 4,
    OUTOFSERVICE: 5,
    KEEPALIVE: 6,
    WEATHER: 7
  },
  readEvents: function (data) {
    log.silly("readEvents", data.byteLength, "Bytes");
    for (var events = []; !data.isEof();) {
      events.push({
        uuid: getUUID(data),
        value: data.readFloat64(),
        toString: evToString

      });
      log.silly("readEvents uuid:", events[events.length - 1].uuid, "value:", events[events.length - 1].value)
    }

    log.silly("readEvents : got", events.length, "ValueEvents")
    return events
  },
  readTextEvents: function (data) {
    for (var uuid, uuidIcon, textLength, text, paddingBytes, events = []; !data.isEof();) uuid = getUUID(data), uuidIcon = getUUID(data), textLength = data.readUint32(), paddingBytes = textLength % 4, text = data.readString(textLength, "UTF-8"),  paddingBytes && data.seek(data.position + (4 - paddingBytes)),
        events.push({
          uuid: uuid,
          uuidIcon: uuidIcon,
          text: text,
          toString: textEvToString
        });
    return events
  },
  readDaytimerEvents: function (data) {
    for (var events = [], entries = [], i, entry, uuid, defVal, count; !data.isEof();) {
      for (uuid = getUUID(data), defVal = data.readFloat64(), count = data.readInt32(), entries = [], i = 0; count > i; i++) entry = data.readStruct(["mode", "int32", "from", "int32", "to", "int32", "needActivate", "int32", "value", "float64"]), entry.nr = i, entries.push(entry);
      events.push({
        uuid: uuid,
        defValue: defVal,
        entries: entries,
        toString: daytimerEvToString
      })
    }
    return events
  },
  readWeatherEvents : function(data) {
    for (var events = [], entries = [], i, entry, uuid, lastUpdate, count; !data.isEof();) {
      for (uuid = getUUID(data), lastUpdate = data.readUint32(), count = data.readInt32(), entries = [], i = 0; count > i; i++) entry = data.readStruct(["timestamp", "int32", "weatherType", "int32", "windDirection", "int32", "solarRadiation", "int32", "relativeHumidity", "int32", "temperature", "float64", "perceivedTemperature", "float64", "dewPoint", "float64", "precipitation", "float64", "windSpeed", "float64", "barometricPressure", "float64"]),  entries.push(entry);
      events.push({
        uuid: uuid,
        lastUpdate: lastUpdate,
        entries: entries,
        toString: weatherEvToString
      })
    }
    return events
  }

};
