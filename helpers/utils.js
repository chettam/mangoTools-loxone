/**
 * Created by jbblanc on 25/11/2015.
 */
const http = require('http')
const  CryptoJS = require("crypto-js")
const  ColorConvert = require('./colorConverter')
const  ipc = require('./ipcClient')
const  _ = require('lodash')
const  log = require('./log').logger

let state={};

function isValidJson(jsonString) {
  try {
    if (typeof jsonString == "object")
    {
      return 'object';
    } else {
      var json = eval('(' + jsonString + ')'); // try to make JSON object from given string, if error isn't thrown we know that we are given valid JavaScript
      JSON.parse(JSON.stringify(json)); // first we stringify JSON object properly then we parse to make sure that what is given is trully a JSON object
      return 'string';
    }

  } catch (err) {
    log.error('isJson Error :' + err)
    return false;
  }
}


var _this = module.exports = {
  isReachable : function(connection,callback){
    var options = {
      host: connection.host,
      port: connection.port,
      path: '/jdev/cfg/api',
      method: 'GET'
    };

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function (data) {

        try {
        data = JSON.parse(data);
          if(parseInt(data['LL']['Code']) === 200){
           callback();
          }
        }
        catch(err) {
          return callback('Connexion Issue')
        }
      });
    });

    req.on('error', function(e) {
      log.error( 'Miniserver is not reachable !');
      callback(e);
    });


    req.end();


  },
  getToken : function(connection,callback){
    var options = {
      host: connection.host,
      port: connection.port,
      path: '/jdev/sys/getkey',
      method: 'GET'
    };

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');

      res.on('data', function (data) {
        console.log(data)
        var token ='';
        if(!isValidJson(data)){
          return callback('Connexion Issue')
        }
        if(isValidJson(data) === 'object'){
          token = CryptoJS.enc.Hex.parse(data['LL'].value);

        }else  if(isValidJson(data) === 'string'){
          token = CryptoJS.enc.Hex.parse(JSON.parse(data)['LL'].value);
        }

        var creds= connection['user']+':'+connection['password'];
        var credentials = CryptoJS.enc.Utf8.parse(creds);
        sid = CryptoJS.HmacSHA1(credentials, token);

        log.debug( 'Token Acquired : ' + sid);
        callback(null,sid);
      });
    });

    req.on('error', function(e) {
      log.error( 'Token Acquisition Error : ' + e);
      callback(e);
    });


    req.end();


  },
  isValidJson :isValidJson,
  commands : {
    version: "jdev/sps/LoxAPPversion",
    getLoxApp: "data/LoxAPP3.json",
    getChanges : "jdev/sps/changes",
    enableStates: "jdev/sps/enablebinstatusupdate",
    dateTime: "jdev/sys/setdatetime",
    timezoneOffset: "jdev/cfg/timezoneoffset",
    statistics: "statistics.json",
    heartBeat: "jdev/sps/status",
    execute: "jdev/sps/io/"
  },
  isValidArray :  function( obj){
    return (typeof obj !== 'undefined' &&
    obj && obj.constructor === Array);
  },
  ensureRatings : function(rating) {
    return  rating ? parseInt(rating) : 0;
  },
  assignImage : function(data,options) {
    return 'http://'+options.host +'' + ':'+options.port+'/' + data.image;
  },
  updateLoxLive : function(events) {
    var state ={};
    _.forEach(events, function (updateEvent) {
      if(updateEvent)
        ipc.send('state:update',updateEvent);
    });
  },
  parseType : function(currentType) {
    switch (currentType) {
      case 'LightController':
        return {kind: 'lighting', priority: 1};
        break;
      case 'Dimmer':
        return {kind: 'dimmer', priority: 1};
        break;
      case 'Colorpicker':
        return {kind: 'colorPicker', priority: 1};
        break;
      case 'Switch':
        return {kind: 'switch', priority: 1};
        break;
      case 'AutoJalousie':
        return {kind: 'shutters', priority: 2};
        break;
      case 'Jalousie':
        return {kind: 'shutters', priority: 2};
        break;
      case 'IRoomController':
        return {kind: 'heating', priority: 3};
        break;
      case 'Tracker':
        return {kind: 'textDevice', priority: 7};
        break;
      case 'Weather':
        return {kind: 'weather', priority: 6};
        break;
      case 'PushbuttonB':
        return {kind: 'pushButton', priority: 7};
        break;
      case 'Pushbutton':
        return {kind: 'pushButton', priority: 7};
        break;
      case 'UpDownDigital':
        return {kind: 'UpDownDigital', priority: 7};
        break;
      case 'DigLeftRight':
        return {kind: 'buttonLeftRight', priority: 7};
        break;
      case 'Door':
        return {kind: 'door', priority: 8};
        break;
      case 'Gate':
        return {kind: 'gate', priority: 8};
        break;
      case 'Daytimer':
        return {kind: 'timer', priority: 8};
        break;
      case 'Alarm':
        return {kind: 'alarm', priority: 5};
        break;
      case 'CarCharger':
        return {kind: 'carCharger', priority: 9};
        break;
      case 'Sauna':
        return {kind: 'sauna', priority: 10};
        break;
      case 'SaunaVapor':
        return {kind: 'saunaVapor', priority: 10};
        break;
      case 'SmokeAlarm':
        return {kind: 'smokeAlarm', priority: 5};
        break;
      case 'Fronius':
        return {kind: 'monitoring', priority: 11};
        break;
      case 'Meter':
        return {kind: 'monitoringEnergy', priority: 11};
        break;
      case 'Media':
        return {kind: 'media', priority: 4};
        break;
      case 'AudioZone':
        return {kind: 'mediaPlayer', priority: 4};
        break;
      case 'MediaClient':
        return {kind: 'mediaPlayer', priority: 4};
        break;
      case 'Application':
        return {kind: 'application', priority: 6};
        break;
      case 'Intercom':
        return {kind: 'intercom', priority: 12};
        break;
      case 'TextState':
        return {kind: 'stateText', priority: 13};
        break;
      case 'Slider':
        return {kind: 'slider', priority: 15};
        break;
      case 'InfoOnlyDigital':
        return {kind: 'textDeviceBinary', priority: 15};
        break;
      case 'InfoOnlyAnalog':
        return {kind: 'textDevice', priority: 15};
        break;
      case 'Remote':
        return {kind: 'remote', priority: 15};
        break;
      default:
        //log.error('Type unsupported :' + currentType);
        return {kind: 'unknown', priority: 99};
        break;
    }
  },
  parseTempType : function(nr){
    switch(parseInt(nr)) {
      case 0:
        return { name : 'Economy'};
        break;
      case 1:
        return { name : 'Comfort (heating)'};
        break;
      case 2:
        return { name : 'Comfort (cooling)'};
        break;
      case 3:
        return { name : 'Frost Protection'};
        break;
      case 4:
        return { name : 'Over Heating Protection'};
        break;
      case 5:
        return { name : 'Lowered Temperature'};
        break;
      case 6:
        return { name : 'Increased Heating'};
        break;
      default:
        return { name : ''}
    }
  },

  /**
   * Convert RGB color to loxone value
   * @param number
   * @returns {string}
   */
  convertCMYKToLoxone: function (cmyk) {

    var rgb = ColorConvert.toRGB(cmyk);
    var r = ('000' + Math.round((rgb.r * 100)/255)).slice(-3).toString(),
      g = ('000' + Math.round((rgb.g * 100)/255)).slice(-3).toString(),
      b = ('000' + Math.round((rgb.b * 100)/255)).slice(-3).toString();
    return b+g+r
  },
  /**
   * Convert generic value to Loxone specific
   * @param state
   * @param value
   * @returns {*}
   */
  parseCommand:function(state,value){
    switch(state.device.kind){
      case 'alarm':
        if(state.name === 'active'){
          return value === 0 ? 'off' : 'on';
        }
        break;

      case 'doorPanel':
        return value === 0 ? 'off' : 'on';
        break;

      case 'buttonUpDown' :
        if(state.name === 'up'){
          return value === 0 ? 'upoff' : 'up';
        }
        if(state.name === 'down'){
          return value === 0 ? 'downoff' : 'down';
        }
        break;

      case 'buttonLeftRight' :
        if(state.name === 'right'){
          return value === 0 ? 'upoff' : 'up';
        }
        if(state.name === 'left'){
          return value === 0 ? 'downoff' : 'down';
        }
        break;

      case 'lightSwitch' :
        if(state.name === 'value'){
          return value === 0 ? 'off' : 'on';
        }
        break;
      case 'rgb' :
        if(state.name === 'value'){
          return _this.convertCMYKToLoxone(value);
        }
        break;
      case 'shutters' :
        switch(state.name){
          case 'down':
            return value === 0 ? 'downoff' :'down';
          case 'up':
            return value === 0 ? 'upoff' : 'up';
          case 'fulldown':
            return value === 0 ? 'downoff' : 'fulldown';
          case 'fullup':
            return value === 0 ? 'upoff' : 'fullup';
          case 'auto':
            return value === 0 ? 'noauto' : 'auto';
          case 'shade':
            return value === 0 ? 'noshade' : 'shade';
          default:
            return value;
            break;
        }
        break;
      default:
        return value
    }
  }

};
