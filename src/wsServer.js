// wsServer.js
const WebSocket = require('ws');
const TcpClient = require('./tcpClient');
const AudioProcessor = require('./audioProcessor');
const {v4: uuidv4} = require("uuid");

function startWsServer({ port, tcpHost, tcpPort }) {
    const wss = new WebSocket.Server({ port: port, host: '0.0.0.0' });
    console.log(`WebSocket server running on port ${port}`);

    wss.on('connection', (ws) => {
        console.log('Client Web connecté');

        const uuid = uuidv4();
        const tcpClient = new TcpClient(tcpHost, tcpPort);
        const audioProcessor = new AudioProcessor();
        let accumulatedBuffer = Buffer.alloc(0);

        tcpClient.connect(uuid, (chunk) => {
            accumulatedBuffer = Buffer.concat([accumulatedBuffer, chunk]);

            let offset = 0;

            while (offset + 3 <= accumulatedBuffer.length) {
                const type = accumulatedBuffer.readUInt8(offset);
                const length = accumulatedBuffer.readUInt16BE(offset + 1);

                if (offset + 3 + length <= accumulatedBuffer.length) {
                    const payload = accumulatedBuffer.subarray(offset + 3, offset + 3 + length);

                    if (type === 0x10 && ws.readyState === WebSocket.OPEN) {
                        ws.send(payload);
                    }

                    offset += 3 + length;
                } else {
                    break;
                }
            }

            accumulatedBuffer = accumulatedBuffer.subarray(offset);
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