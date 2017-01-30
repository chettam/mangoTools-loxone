/**
 * Created by jbblanc on 25/11/2015.
 */

const ipcClient = require('./services/ipcClient');
const WebSocket = require('ws');
const connected =false;
const async = require('async');
const utils = require("./services/utils");
const dispatcher = require("./services/dispatcher");
let ws = {};
const log = require('./services/log').logger;
const keepAlive = {};


/**
* Restart connection to Loxone after configuration change
*/
function restart(cnx){
  ws = {};
  setTimeout(function () {
    ipcClient.send('cnx:get',cnx);
  }, 10000);
};

/**
* Start Loxone connection.
*/

function start(connection){
  log.silly('start :' + JSON.stringify(connection));
  if(connection &&!connection.connected && connection.enabled){
    async.waterfall([
      function(callback) {
        log.verbose('Loxone : Establishing connection ');
        utils.isReachable(connection.options,function(err){

          callback(err)
        });
      },
      function(callback) {
        log.verbose('Loxone : Acquiring Token');
        utils.getToken(connection.options,function(err,token){
          log.verbose('Loxone : Acquired Token  : ' + token);
          callback(err,token)
        });
      },
      function(token, callback) {
        if(token===undefined){
          return callback("No token");
        }
        log.verbose('Connecting socket');
        socket(connection,token,function(err){
          callback(err);
        })
      },
      function(callback) {
        log.verbose('enable update');
        enableUpdates(connection,function(){
          callback()
        })
      }
    ], function (err, result) {
      if(err){
        log.debug('Loxone Connection Failed, retrying : '  + connection.uuid);
        restart(connection);
      } else {
        log.debug('Loxone Connection started !');
      }
    });
  }
}

/*
* Manage websocket connection with the Loxone miniserver
*/

function socket(connection , token ,callback) {
  log.silly('connecting');
  ws = new WebSocket('ws://' + connection.options.host + ':' + connection.options.port + '/ws/rfc6455?_='+(new Date).getTime(), {
    protocolVersion: 13,
    protocol: 'remotecontrol'
  });

  ws.on('open', function open() {

    send('authenticate/'+token,connection);
    connected = true;
    connection.connected = true;
    ipcClient.send('cnx:update',connection);


    //send(Utils.commands.getLoxApp, connection);

    keepAlive = setInterval(function () {
      log.verbose("Sending Heartbeat message");
      return send(utils.commands.heartBeat, connection);
    }, 10000);

    setTimeout(function () {
      callback();
    }, 10000)
  });


  ws.on('message', function (data, flags) {
    try {
      var message = JSON.parse(data);
      if(message.hasOwnProperty('LL') && message['LL'].hasOwnProperty('control') &&   message['LL']['control'].match(/^authenticate*/) ){
        log.verbose("Requesting configuration");
        send(utils.commands.getLoxApp, connection);
      } else {
        dispatcher.message(data, connection);
      }
    }
    catch(err) {
      //log.silly('Sending message to dispatcher');
      dispatcher.message(data, connection);
    }

  });

  ws.on('error', function (error) {
    log.debug('Loxone Connection failed : ' + error);
    connection.connected =false;
    ipcClient.send('cnx:update',connection);
    clearInterval(keepAlive);
    restart(connection)
  });


  ws.on('connectFailed', function (error) {
    socket(connection, token, function () {
      callback();
    })
  });


}


/*
* send command to Loxone miniserver to enable states to be updated realtime.
*/
function enableUpdates(connection,callback) {
  var requests = [utils.commands.enableStates,Utils.commands.statistics];

  for (var i = 0 ;i < requests.length ; i++){
    send(requests[i],connection);
  }
  callback();
};

/*
* send command to Loxone miniserver via websockets.
*/
function send(message,connection) {
  if (ws && ws.readyState === 1) {
    //if (utils.commands.heartBeat === Utils.commands.heartBeat) {
    log.verbose("Sent cmd: " + message);
    //}
    ws.send(message);
  }
};


module.exports = {
  sendCmd : function(UUIDAction,command,connection) {
    send(utils.commands.execute+UUIDAction+'/'+command,connection);
  },
  start :start,
  stop : function() {
    ws = {};
  },
  restart :restart

};
