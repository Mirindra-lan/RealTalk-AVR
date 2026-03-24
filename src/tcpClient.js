const net = require('net');
const { parse: uuidParse } = require("uuid");

class TcpClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.connection = null;
    }

    sendUuidPacket(id) {
        const uuidBytes = Buffer.from(uuidParse(id));
        const header = Buffer.alloc(3);
        header.writeUInt8(0x01, 0);
        header.writeUInt16BE(16, 1);
        this.connection.write(Buffer.concat([header, uuidBytes]));
    }

    sendPcmPacket(pcm) {
        const header = Buffer.alloc(3);
        header.writeUInt8(0x10, 0);
        header.writeUInt16BE(pcm.length, 1);
        this.connection.write(Buffer.concat([header, pcm]));
    }

    sendTerminatePacket() {
        const header = Buffer.alloc(3);
        header.writeUInt8(0x00, 0);
        header.writeUInt16BE(0, 1);
        this.connection.write(header);
    }

    connect(uuid, onData, onReady) {
        this.connection = net.connect(this.port, this.host, () => {
            console.log('Connecté au serveur TCP');
            this.sendUuidPacket(uuid);
            if (onReady) onReady();
        });

        this.connection.on('data', onData);

        this.connection.on('error', (err) => console.error('Erreur TCP:', err.message));
        this.connection.on('close', () => console.log('TCP fermé'));
    }

    sendPcm(pcmBuffer) {
        if (this.connection && !this.connection.destroyed) {
            this.sendPcmPacket(pcmBuffer);
        }
    }

    terminate() {
        if (this.connection && !this.connection.destroyed) {
            this.sendTerminatePacket();
            this.connection.end();
        }
    }
}

module.exports = TcpClient;