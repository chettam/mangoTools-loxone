/**
 * Created by jbblanc on 16/05/2016.
 */

const ipc = require('./services/ipcClient');
const log = require('./services/log').logger;


log.info('Loxone Module has started');
ipc.start(process.env);
