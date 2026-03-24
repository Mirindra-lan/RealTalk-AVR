const { v4: uuidv4, parse: uuidParse } = require("uuid");
const net = require("net")

class TcpClient {
    constructor(port, host) {
        this.client = net.Socket();
        this.client.connect(port, host, () => {
            console.log(`Connected to avr-core at ${host}:${port}`)
        });
    }

    sendUuid() {
        const id = uuidv4();
        const uuidBytes = Buffer.from(uuidParse(id));
        const header = Buffer.alloc(3);
        header.writeUInt8(0x01, 0);
        header.writeUInt16BE(16, 1);

        this.client.write(Buffer.concat([header, uuidBytes]));
    }

    sendPcm(pcm) {
        const header = Buffer.alloc(3);
        header.writeUInt8(0x10, 0);
        header.writeUInt16BE(pcm.length, 1);

        this.client.write(Buffer.concat([header, pcm]));
    }

    terminate() {
        const header = Buffer.alloc(3);
        header.writeUInt8(0x00, 0);
        header.writeUInt16BE(0, 1);

        this.client.write(header);
    }
}

module.exports = TcpClient;