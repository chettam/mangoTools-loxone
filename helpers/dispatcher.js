/**
 * Created by jbblanc on 25/11/2015.
 */

const utils = require('./utils'),
    log = require('./log').logger,
    bufferToArrayBuffer = require('buffer-to-arraybuffer'),
    BinaryEvent = require('./binaryEvent'),
    BitView = require('./bitView'),
    DataStream = require('./dataStream'),
    Parser  = require('./parser');


var headerMessage = {};

function decodeEventType(message) {
    if(bufferToArrayBuffer(message)){
       var bytes = bufferToArrayBuffer(message)
       if ( bytes['byteLength'] === 8) {
            var data = new DataView(bytes);
            var eventType = {
                    eventType: data.getUint8(1, !0),
                    length: data.getUint32(4, !0)
                };
            var reservedByte1 = new BitView(new Uint8Array(bytes, 2, 1));
            eventType.estimated = 1 === reservedByte1.getBit(0);
            return eventType
        }
    }
}



module.exports = {

    /**
     * Dispatch messages coming from Loxone box
     * @param message to be parsed
     */
    message : function (message,connection){
        if(typeof message ==='object' && message.length === 8) {
            //log.silly("Message header received");
            //log.silly(" Next message should be : " + JSON.stringify(decodeEventType(message)));
            headerMessage = decodeEventType(message)
        } else if(typeof message ==='object' && message.length === headerMessage.length){
            //log.silly("Actual message received");
            var data = new DataStream(message, 0, DataStream.LITTLE_ENDIAN);
            switch (headerMessage.eventType) {
                case BinaryEvent.Type.FILE:
                    console.log(data);
                    break;
                case BinaryEvent.Type.EVENT:
                    utils.updateLoxLive(BinaryEvent.readEvents(data));
                    break;
                case BinaryEvent.Type.EVENTTEXT:
                    utils.updateLoxLive(BinaryEvent.readTextEvents(data));
                    break;
                case BinaryEvent.Type.DAYTIMER:
                    utils.updateLoxLive(BinaryEvent.readDaytimerEvents(data));
                    break;
                case BinaryEvent.Type.OUTOFSERVICE:
                    console.log("miniserver out of service!");
                    break;
                case BinaryEvent.Type.WEATHER:
                    Utils.updateLoxLive(BinaryEvent.readWeatherEvents(data));
                    break;
                default:
                    console.info("invalid event type")
            }

        } else if(utils.isValidJson(message)) {
            log.silly("Json Received");
            var received = JSON.parse(message);
            if (received.hasOwnProperty('lastModified') && received.hasOwnProperty('msInfo')) {
                log.silly("Getting Config");
                Parser.live(received, connection)
            } else {
                console.log('wrong message :' + JSON.stringify(received))
            }
        }

    }
};
