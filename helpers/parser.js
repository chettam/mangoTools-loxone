/**
 * Created by jbblanc on 25/11/2015.
 */
const ipc = require('./ipcClient')
const http = require('http')
const async = require('async')
const _ = require('lodash')
const log = require('./log').logger
const request = require('request')
const CryptoJs = require('crypto-js')
const utils = require('./utils')
let rooms = {};
let categories = {};
let devices= {};
let states =[];
let apiKeyEnc;



/*
* convert string to camel case
*/

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
    return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

/*
* send a category to the core. for the category to be persisted
*/

function setCategories(categories,cb){
  async.forEach(categories, function (category, callback) {
    category.loxoneId = category.n;
    delete category.n;
    log.verbose('creating category : ' +  JSON.stringify(category));
    ipc.send('category:set',category);
    callback()
  }, function (err) {
    if (err) log.error(err.message);
    cb();
  });
}


/*
* send a room to the core. for the category to be persisted
*/
function setRooms(rooms,cb){
  async.forEach(rooms, function (room, callback) {
    room.loxoneId =  room.n;
    delete room.n;
    log.verbose('creating room : ' + JSON.stringify(room));
    ipc.send('room:set',room);
    callback()
  }, function (err) {
    if (err) log.error(err.message);
    cb();
  });
}

/*
*  Parse Loxone lighting controller
*/
function parseLightController(actuator,connection) {

  var device = {
      active: true,
      infoOnly:false,
      kind: "sceneController",
      priority: 1,
      uid: actuator.uid,
      name: actuator.name,
      room: actuator.room,
      category: actuator.category
    };

    states.push({uid: actuator['states']['activeScene'], unit: null, name: 'activeScene', execute: false, actuator : actuator.uid, cnx : connection});
    states.push({uid: actuator['states']['sceneList'], unit: null, name: 'sceneList', execute: false, actuator : actuator.uid, cnx : connection});
    states.push({uid: actuator.uid, name: 'scene', execute: true, actuator : actuator.uid, cnx : connection , attributes: {uuidAction: actuator.uid}});


    ipc.send('device:set',device);

   if(actuator['subControls']){
     _.forEach(actuator['subControls'], function(subdevice,key) {
       subdevice.room =  actuator.room;
       subdevice.category =  actuator.category;
       parseDevice(subdevice,connection);
     });
   }
}

function parseSwitch(actuator,connection){
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({name : 'value' , uid : actuator['states'].active, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  ipc.send('device:set',device);

}

function parseColorPicker(actuator,connection){
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({name : 'color' , uid : actuator['states'].color, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'favorites' , uid : actuator['states'].favorites, execute :false  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  ipc.send('device:set',device);

}

function parseDimmer(actuator,connection){
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({uid: actuator['states'].min, name: 'min', actuator : actuator.uid, execute: false, cnx: connection});
  states.push({uid: actuator['states'].max, name: 'max', actuator : actuator.uid, execute: false, cnx: connection});
  states.push({uid: actuator['states'].step, name: 'step', actuator : actuator.uid, execute: false, cnx: connection});
  states.push({uid: actuator['states'].position, name: 'value', actuator : actuator.uid, execute: true, cnx: connection ,attributes : { uuidAction : actuator.uid}});
  ipc.send('device:set',device);
}


function parseIntercom(actuator,connection){

  console.log(actuator)
  var device = {
    active: true,
    infoOnly : false,
    kind: 'doorPanel',
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category,
    videoFeed : actuator.details.videoInfo,
    audioFeed : actuator.details.audioInfo,
    attributes : { requireSip : true}
  };

  states.push({ name : 'bell' , uid : actuator['states'].bell, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'lastBellEvents' , uid : actuator['states'].lastBellEvents, actuator : actuator.uid, execute :false ,cnx : connection });

  _.each(actuator.subControls, function (value, key) {
    states.push({name : value.name , uid : key, execute :true, actuator : actuator.uid, attributes : {uuidAction : key  , command : 'pulse' }  ,cnx : connection })
  });

  ipc.send('device:set',device);
}

function parseHeating(actuator,connection){
  log.error('HEATING parsing in Alpha Stage');
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };


  states.push({ uid : actuator['states']['tempTarget']    , name : 'targetTemp', actuator : actuator.uid, execute : true  ,cnx : connection, attributes : { uuidAction : actuator.uid , path:'settemp/7'}});
  states.push({ uid : actuator['states']['tempActual']    , name : 'instantTemp', actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['error']         , name : 'error', actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['mode']          , name : 'mode',   actuator : actuator.uid,cnx : connection, execute : true, attributes : { uuidAction : actuator.uid , path:'mode'}});
  states.push({ uid : actuator['states']['manualMode']    , name : 'manualMode',   actuator : actuator.uid,cnx : connection, execute : false});
  states.push({ uid : actuator['states']['serviceMode']   , name : 'serviceMode' , execute : false , actuator : actuator.uid,cnx : connection});
  states.push({ uid : actuator['states']['currHeatTempIx'], name : 'currHeatTempIx', actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['currCoolTempIx'], name : 'currCoolTempIx', actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['override']      ,name : 'override', actuator : actuator.uid, execute : true  ,cnx : connection, attributes : { uuidAction : actuator.uid , path:'/starttimer/2'}});
  states.push({ uid : actuator['states']['overrideTotal'] ,name : 'override', actuator : actuator.uid, execute : true  ,cnx : connection, attributes : { uuidAction : actuator.uid , path:'/starttimer/2'}});
  states.push({ uid : actuator['states']['openWindow']    , name : 'openWindow', actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['temperatures']    , name : 'temperatures', actuator : actuator.uid, execute : false ,cnx : connection});


  ipc.send('device:set',device);

}

/**
 * Left or Right push button
 *  kind: buttonPush
 * States:
 *  trigEvent: Trigger
 *
 * @param actuator
 */
function parsePushButton(actuator, connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'value', uid : actuator['states'].active , execute : true , actuator : actuator.uid,cnx : connection , attributes : {uuidAction : actuator.uid  , command : 'pulse' } });

  ipc.send('device:set',device);
}

/**
 * Up or Down push button
 *  kind: buttonUpDown
 * States:
 *  trigUp: Trigger
 *  trigDown: Trigger
 *
 * @param actuator
 */
function parseUpDownDigital(actuator,connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'trigUp', uid : actuator.uid , execute : true  , actuator : actuator.uid,cnx : connection, attributes : {uuidAction : actuator.uid , command : 'up'} });
  states.push({ name : 'trigDown', uid : actuator.uid , execute : true  , actuator : actuator.uid,cnx : connection, attributes : {uuidAction : actuator.uid , command : 'down'}});

  ipc.send('device:set',device);
}

/**
 * Left or Right push button
 *  kind: buttonLeftRight
 * States:
 *  trigLeft: Trigger
 *  trigRight: Trigger
 *
 * @param actuator
 */
function parseButtonLeftRight(actuator,connection){
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'trigLeft', uid : actuator.uid  , execute : true  , actuator : actuator.uid,cnx : connection, attributes : {uuidAction : actuator.uid , command : 'down'} });
  states.push({ name : 'trigRight', uid : actuator.uid , execute : true  , actuator : actuator.uid,cnx : connection, attributes : {uuidAction : actuator.uid, command : 'up'} });

  ipc.send('device:set',device);
}

/**
 * Shutter device
 *  kind: shutters
 * States:
 *
 * @param actuator
 */
function parseShutters(actuator,connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'up',            uid : actuator['states'].up,      execute : true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'down',          uid : actuator['states'].down,     execute : true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'position',      uid : actuator['states'].position,     execute : false  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'shadePosition', uid : actuator['states'].shadePosition,     execute : false  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'auto',          uid : actuator['states'].autoActive ,execute : true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'locked',        uid : actuator['states'].locked,   execute : false , actuator : actuator.uid,cnx : connection });
  states.push({ name : 'autoAllowed',   uid : actuator['states'].autoAllowed,   execute : false , actuator : actuator.uid,cnx : connection });

  ipc.send('device:set',device);
}

function parseGate(actuator,connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category,
    autoShadeCapable : actuator['states']['autoAllowed']
  };

  states.push({ name : 'active',        uid : actuator['states'].active,     execute : false  , actuator : actuator.uid,cnx : connection});
  states.push({ name : 'position',      uid : actuator['states'].position,    execute : true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });

  ipc.send('device:set',device);
}
/**
 *  kind: alarm
 * States:
 *  value       Boolean value
 *  active:     Boolean command
 *  trigDelay:  Trigger
 * @param actuator
 */
function parseAlarm(actuator,connection){
  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'armed',        uid : actuator['states'].armed, execute : false  , actuator : actuator.uid,cnx : connection , attributes : { uuidAction : actuator.uid} });
  states.push({ name : 'delay',      uid : actuator['states'].armedDelay,    execute : true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid , command : 'delayedon' }  });


  ipc.send('device:set',device);
}

function parseTextDeviceBinary(actuator,connection){
  var device = {
    active: true,
    infoOnly : true,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({name : 'value' , uid : actuator['states'].active, execute :false , actuator : actuator.uid,cnx : connection ,'on' : actuator.details.text.on ,'off' : actuator.details.text.off });
  ipc.send('device:set',device);
}

function parseTextDevice(actuator,connection){
  var device = {
    active: true,
    infoOnly : true,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({name : 'value' , uid : actuator['states'].value, execute :false , actuator : actuator.uid,cnx : connection ,format : actuator['details'].format});
  ipc.send('device:set',device);
}


function parseTimer(actuator,connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };




  states.push({name : 'mode' , uid : actuator['states'].mode, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'override' , uid :actuator['states'].override, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'value' , uid : actuator['states'].value, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'needsActivation' , uid : actuator['states'].needsActivation, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'modeList' , uid : actuator['states'].modeList, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });
  states.push({name : 'entriesAndDefaultValue' , uid : actuator['states'].entriesAndDefaultValue, execute :true  , actuator : actuator.uid,cnx : connection, attributes : { uuidAction : actuator.uid} });

  ipc.send('device:set',device);

}

function parseSmokeAlarm(actuator,connection){

  var device = {
    active: true,
    infoOnly : true,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ uid : actuator['states']['acousticAlarm'] , name : 'active' , actuator : actuator.uid, execute : false ,cnx : connection});
  states.push({ uid : actuator['states']['testAlarm'] , name : 'test' , actuator : actuator.uid, execute : false ,cnx : connection});

  ipc.send('device:set',device);

}

function parseSlider(actuator,connection){

  var device = {
    active: true,
    infoOnly : false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category,
    details : {
      min : actuator['details'].min ,
      max : actuator['details'].max ,
      step : actuator['details'].step
    }
  };

  states.push({name : 'value', uid : actuator.uid, format : actuator['details'].format,actuator : actuator.uid, execute : true ,cnx : connection, attributes : { uuidAction : actuator.uid}})
  ipc.send('device:set',device);
}

function parseMonitoringEnergy(actuator,connection){

  var device = {
    active: true,
    infoOnly :true,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };
  states.push({ name : 'actual' , uid : actuator['states'].actual, actuator : actuator.uid, execute :false , format : actuator['details']['actualFormat'] ,cnx : connection });
  states.push({ name : 'total'  , uid : actuator['states'].total , actuator : actuator.uid, execute :false , format : actuator['details']['totalFormat'] ,cnx : connection });

  ipc.send('device:set',device);
}

function parseCarCharger(actuator,connection){

  var device = {
    active: true,
    infoOnly :true,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category,
    options : {'minLimit' : actuator['states'].minLimit,'maxLimit' : actuator['states'].maxLimit }
  };

  states.push({ name : 'connected' , uid : actuator['states'].connected, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'power' , uid : actuator['states'].power, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'energySession' , uid : actuator['states'].energySession, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'currentLimit' , uid : actuator['states'].currentLimit, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'chargingFinished' , uid : actuator['states'].chargingFinished, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'currentProfile' , uid : actuator['states'].currentProfile, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'profiles' , uid : actuator['states'].profiles, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'status' , uid : actuator['states'].status, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'chargeDuration' , uid : actuator['states'].chargeDuration, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'limitMode' , uid : actuator['states'].limitMode, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'showLoadManagement' , uid : actuator['states'].showLoadManagement, actuator : actuator.uid, execute :false ,cnx : connection });
  states.push({ name : 'charging' , uid : actuator['states'].charging, actuator : actuator.uid, execute :false ,cnx : connection });


  ipc.send('device:set',device);
}

function parseMediaPlayer(actuator,connection){

  var device = {
    active: true,
    infoOnly :false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'play'           ,execute : true , uid : actuator['states']['playState']   , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'mute'           ,execute : true , uid : actuator['states']['mute']        , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'volume'         ,execute : true , uid : actuator['states']['volume']      , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'volumeMax'      ,execute : true , uid : actuator['states']['MaxVolume']   , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'volumeStep'     ,execute : true , uid : actuator['states']['volumeStep']  , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'shuffle'        ,execute : true , uid : actuator['states']['shuffle']     , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'repeat'         ,execute : true , uid : actuator['states']['repeat']      , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'source'         ,execute : true , uid : actuator['states']['source']      , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'sourceList'     ,execute : true , uid : actuator['states']['sourceList']  , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentProgress',execute : true , uid : actuator['states']['progress']    , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentAlbum'   ,execute : true , uid : actuator['states']['album']       , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentArtist'  ,execute : true , uid : actuator['states']['artist']      , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentTitle'   ,execute : true , uid : actuator['states']['songName']    , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentGenre'   ,execute : true , uid : actuator['states']['genre']       , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentCover'   ,execute : true , uid : actuator['states']['cover']       , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'currentDuration',execute : true , uid : actuator['states']['duration']    , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'serverState'    ,execute : true , uid : actuator['states']['serverState'] , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });

  ipc.send('device:set',device);
}

function parseRemote(actuator,connection){

  var device = {
    active: true,
    infoOnly :false,
    kind: actuator.kind,
    priority: actuator.priority,
    uid: actuator.uid,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category
  };

  states.push({ name : 'timeout'           ,execute : true , uid : actuator['states']['timeout']   , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'mode'           ,execute : true , uid : actuator['states']['mode']        , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });
  states.push({ name : 'value'           ,execute : true , uid : actuator['states']['active']        , attributes : {uuidAction : actuator.uid} , actuator : actuator.uid , cnx : connection  });


  ipc.send('device:set',device);
}

function parseDevice(actuator,connection) {


  if (actuator.hasOwnProperty('uuidAction')) {
    actuator.uid = actuator.uuidAction;
    delete actuator.uuidAction
  }

  if (actuator.hasOwnProperty('Type')) {
    actuator.kind =  utils.parseType(actuator.Type).kind;
    actuator.priority = utils.parseType(actuator.Type).priority;
    delete actuator.Type;
  }

  if (actuator.hasOwnProperty('type')) {
    actuator.kind =  utils.parseType(actuator.type).kind;
    actuator.priority = utils.parseType(actuator.type).priority;
    delete actuator.type;
  }

  if (actuator.hasOwnProperty('detail') && actuator.detail.Type) {
    actuator.kind =  utils.parseType(actuator.detail.Type).kind;
    actuator.priority = utils.parseType(actuator.detail.Type).priority;
  }

  if (actuator.hasOwnProperty('detail') && actuator.detail.type) {
    actuator.kind =  utils.parseType(actuator.detail.type).kind;
    actuator.priority = utils.parseType(actuator.detail.type).priority;
  }

  if(actuator.kind === 'unknown') {
    log.info('Parsing Device : ' + JSON.stringify(actuator));
  }

  switch(actuator.kind) {
    case 'alarm':
      return parseAlarm(actuator,connection);
      break;

    case 'lighting':
      return parseLightController(actuator,connection);
      break;
    case 'dimmer':
      return parseDimmer(actuator,connection);
      break;
    case 'switch' :
      return parseSwitch(actuator,connection);
      break;
    case 'colorPicker':
      return parseColorPicker(actuator,connection);
      break;

    case 'intercom':
      return parseIntercom(actuator,connection);
      break;

    case 'heating' :
      return parseHeating(actuator,connection);
      break;
    case 'textDeviceBinary' :
      return parseTextDeviceBinary(actuator,connection);
      break;
    case 'textDevice' :
      return parseTextDevice(actuator,connection);
      break;
    case 'pushButton' :
      return parsePushButton(actuator,connection);
      break;

    case 'UpDownDigital' :
      return parseUpDownDigital(actuator,connection);
      break;
    case 'shutters' :
      return parseShutters(actuator,connection);
      break;

    case 'smokeAlarm' :
      return parseSmokeAlarm(actuator,connection);
      break;

    case 'slider' :
      return parseSlider(actuator,connection);
      break;

    case 'monitoringEnergy' :
      return parseMonitoringEnergy(actuator,connection);
      break;

    case 'gate' :
      return parseGate(actuator,connection);
      break;
    case 'carCharger' :
      return parseCarCharger(actuator,connection);
      break;
    case 'timer':
      return parseTimer(actuator,connection);
      break;
    case 'mediaPlayer' :
      return parseMediaPlayer(actuator,connection);
      break;
    case 'remote' :
      return parseRemote(actuator,connection);
      break;
    default:
    log.error('Device unsupported :' +  JSON.stringify(actuator));
  }
}




module.exports ={

  setCategories :setCategories,
  setRooms : setRooms,
  /**
   * Parse Loxone configuration and generates sails.config.live
   * @param config
   */
  live : function(config,connection){
    if(!connection)log.error('no connection : ' + JSON.stringify(message));
    connection.options.connected    = true;
    connection.options.tempUnit     = config['msInfo'].TempUnit;
    connection.options.currency     = config['msInfo'].Currency;
    connection.options.remoteUrl    = config['msInfo'].remoteUrl;
    connection.options.localUri     = config['msInfo'].localUrl;
    connection.options.serialNumber = config['msInfo'].serialNr;
    connection.options.name         = config['msInfo'].msName;
    connection.options.location     = config['msInfo'].location;
    connection.options.partner      = config['partnerInfo'];

    ipc.send('cnx:update',connection);

    async.series([
      function (callback) {
        if (config.cats) {
          async.each(config.cats, function(category, cb) {
            category.rating = utils.ensureRatings(category.rating);
            category.image  = utils.assignImage(category,connection.options);
            cb();
          }, function(err) {
            setCategories(config.cats,function(){
              callback();
            });
          });
        }
      },
      function (callback) {
        if (config.rooms) {
          async.each(config.rooms, function(room, cb) {
            room.rating = utils.ensureRatings(room.rating);
            room.image  = utils.assignImage(room,connection.options);
            cb();
          }, function(err) {
            setRooms(config.rooms,function(){
              callback();
            });
          });
        }
      },
      function (cb) {
        async.waterfall([
          function(callback) {
            request({url: 'http://localhost:' + process.env.port + '/api/apikey'}, function(error, response, body){
              apiKeyEnc = CryptoJs.SHA256(CryptoJs.SHA256(CryptoJs.SHA256(body).toString()).toString()).toString();
              callback(null,apiKeyEnc)
            });
          },
          function(apiKeyEnc, callback) {
            request({url: 'http://localhost:' + process.env.port + '/api/anon/room', headers: {'apiKey': apiKeyEnc}}, function(error, response, body){
              _.forEach(JSON.parse(body),function(room){
                rooms[room.uuid] = room
              });
              callback(null,apiKeyEnc)
            });
          },
          function(apiKeyEnc, callback) {
            request({url: 'http://localhost:' + process.env.port + '/api/anon/category', headers: {'apiKey': apiKeyEnc}}, function(error, response, body){
              _.forEach(JSON.parse(body),function(category){
                categories[category.uuid] = category
              });
              callback()
            });
          }
        ], function (err, result) {
          cb();
        });
      },
      function (callback) {
        if(config.controls){
          async.each(config.controls, function(actuator, cb) {
            actuator.rating = utils.ensureRatings(actuator.rating);
            if(rooms[actuator.room]) actuator.room = rooms[actuator.room];

            if(categories[actuator.cat]){
              actuator.category = categories[actuator.category];
              delete actuator.cat
            }
            parseDevice(actuator,connection);
            cb();
          }, function(err) {
            if( err ) { console.log('A file failed to process');
            } else {
              request({url: 'http://localhost:' + process.env.port + '/api/anon/device', headers: {'apiKey': apiKeyEnc}}, function(error, response, body){
                async.each(states, function(state, cb) {
                  state.device =_.find(JSON.parse(body), function(d) { return d.uid === state.actuator; });
                  cb()
                }, function(err){
                  callback()
                });
              });
            }
          });
        } else {
          callback('no Function')
        }
      }
    ], function (err, result) {
      //console.log(JSON.stringify(states))
      ipc.send('state:set',states);
      log.debug("Configuration parsing complete");
    });

  },
  change : function(message){
    for(var i =1 ; i < parseInt(message.value) + 1; i++){
      var change = message['output'+ i.toString()];

      State.findOne({uid : change.uuid },function(err,state){
        if(err){
          log.error(err);

          return;
        }

        if(_.isEmpty(state)){
          log.verbose('Unable to Change state with uuid: ' + change.uuid);
          return;
        }

        if(change.value!=undefined)
          state.value =  utils.formattedValue(state, change.value);
        if(change.text!=undefined)
          state.text = change.text;
        if(change.uuidIcon!=undefined)
          state.uuidIcon = change.uuidIcon;
        state.save(function(err, savedState){
          if(err) log.verbose('Unable to save state ' + savedState.id + '');
        });
      })
    }
  }


};
