/**
 * Created by jbblanc on 01/12/2015.
 */


var Socket = require('../socket');
var Utils = require('./utils');
var log = require('./log').logger;


module.exports = {

  executeCmd : function(state,value){
    //log.verbose(state);
    if(state.execute){
      if(state.attributes.uuidAction && state.attributes.command && !state.attributes.path && value === undefined){
        Socket.sendCmd(state.attributes.uuidAction,state.attributes.command,state.cnx)
      }
      else if(state.attributes.uuidAction && !state.attributes.path && value !== undefined){
        Socket.sendCmd(state.attributes.uuidAction,Utils.parseCommand(state,value),state.cnx);
      }
      else if(state.attributes.uuidAction && state.attributes.command && state.attributes.path && value === undefined){
        Socket.sendCmd(state.attributes.uuidAction,state.attributes.path +'/'+state.attributes.command,state.cnx);
      }
      else if(state.attributes.uuidAction && !state.attributes.command && state.attributes.path && value !== undefined){
        Socket.sendCmd(state.attributes.uuidAction,state.attributes.path +'/'+Utils.parseCommand(state,value),state.cnx);
      }
    }

  }

};
