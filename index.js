require('dotenv').config();
const startWsServer = require('./src/wsServer');

const WS_PORT = process.env.WS_PORT || 8080;
const AVR_HOST = process.env.AVR_HOST || 'localhost';
const AVR_PORT = process.env.AVR_PORT || 5070;

startWsServer({ port: WS_PORT, tcpHost: AVR_HOST, tcpPort: AVR_PORT });