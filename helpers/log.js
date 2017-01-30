/**
 * Created by jbblanc on 24/04/2016.
 */

var winston = require('winston');
var config  = require('../config');
var logger = new (winston.Logger)({
  levels: {
    silly: 5,
    verbose: 4,
    debug: 3,
    info: 2,
    warn: 1,
    error: 0
  },
  colors: {
    silly: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
  }
});

logger.add(winston.transports.Console, {
  level: process.env.NODE_ENV  === 'production' ? 'info' : 'silly',
  prettyPrint: true,
  colorize: true,
  silent: false,
  timestamp: false
});

module.exports ={
  logger : logger
};
