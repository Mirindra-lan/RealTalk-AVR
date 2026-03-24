// wsServer.js
const WebSocket = require('ws');
const TcpClient = require('./tcpClient');
const AudioProcessor = require('./audioProcessor');
const {v4: uuidv4} = require("uuid");

function startWsServer({ port, tcpHost, tcpPort }) {
    const wss = new WebSocket.Server({ port });
    console.log(`WebSocket server running on port ${port}`);

    wss.on('connection', (ws) => {
        console.log('Client Web connecté');

        const uuid = uuidv4();
        const tcpClient = new TcpClient(tcpHost, tcpPort);
        const audioProcessor = new AudioProcessor();

        tcpClient.connect(uuid, (data) => {
            let offset = 0;
            while (offset < data.length) {
                const type = data.readUInt8(offset);
                const length = data.readUInt16BE(offset + 1);
                const payload = data.slice(offset + 3, offset + 3 + length);

                if (type === 0x10 && ws.readyState === WebSocket.OPEN) {
                    ws.send(payload);
                }

                offset += 3 + length;
            }
        }, () => {
            audioProcessor.pipeToTcp(tcpClient);
        });

        ws.on('message', (message) => audioProcessor.feed(message));

        ws.on('close', () => {
            console.log('Client Web déconnecté');
            audioProcessor.end();
            tcpClient.terminate();
        });
    });

    return wss;
}

module.exports = startWsServer;