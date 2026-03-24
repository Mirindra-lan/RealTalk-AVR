const WebSocket = require('ws');
const net = require('net');
const ffmpeg = require('fluent-ffmpeg');
const {v4: uuidv4, parse: uuidParse } = require("uuid")
const { PassThrough } = require('stream');

require("dotenv").config()
const WS_PORT = process.env.WS_PORT || 8080;
const AVR_PORT = process.env.AVR_PORT || 5070;
const AVR_HOST = process.env.AVR_HOST || "localhost";

const wss = new WebSocket.Server({ port: WS_PORT });

// --- VOS FONCTIONS DE PROTOCOLE TCP (Inchangées) ---

function sendUuidPacket(tcpConn, id) {
    const uuidBytes = Buffer.from(uuidParse(id));

    const header = Buffer.alloc(3);
    header.writeUInt8(0x01, 0);
    header.writeUInt16BE(16, 1);
    const uuidPacket = Buffer.concat([header, uuidBytes]);
    tcpConn.write(uuidPacket);
}
function sendPcmPacket(tcpConn, pcm) {
    const header = Buffer.alloc(3);
    header.writeUInt8(0x10, 0);
    header.writeUInt16BE(pcm.length, 1);
    tcpConn.write(Buffer.concat([header, pcm]));
}

function sendTerminatePacket(tcpConn) {
    const terminatePacket = Buffer.alloc(3);
    terminatePacket.writeUInt8(0x00, 0);     // 1 byte: 0x00
    terminatePacket.writeUInt16BE(0, 1);     // 2 bytes: 0
    tcpConn.write(terminatePacket);
}

// --- LOGIQUE DE CONNEXION ---
wss.on('connection', (ws) => {
    console.log('Client Web connecté');

    // 1. Créer le tunnel pour l'audio
    const audioInput = new PassThrough();
    const id = uuidv4();

    // 2. Connexion au serveur TCP
    const tcpConnection = net.connect(AVR_PORT, AVR_HOST, () => {
        console.log('Connecté au serveur TCP cible');
        sendUuidPacket(tcpConnection, id); // Test avec 16 chars
    });

    // Dans votre boucle wss.on('connection', (ws) => { ... })

    tcpConnection.on('data', (data) => {
        let offset = 0;

        while (offset < data.length) {
            const type = data.readUInt8(offset);
            const length = data.readUInt16BE(offset + 1);
            const payload = data.slice(offset + 3, offset + 3 + length);

            if (type === 0x10) { // C'est un paquet PCM
                // On envoie le PCM brut directement au navigateur
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(payload); 
                }
            }
            
            offset += 3 + length;
        }
    });

    // 3. Configurer FFmpeg
    ffmpeg(audioInput)
        .inputFormat('webm')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(8000)
        .format('s16le')
        .on('error', (err) => console.error('Erreur FFmpeg:', err.message))
        .pipe() // Le résultat PCM sort ici
        .on('data', (pcmBuffer) => {
            // Envoi au serveur TCP avec votre header 0x10
            sendPcmPacket(tcpConnection, pcmBuffer);
        });

    // 4. Réception Webm du navigateur -> Envoi dans le tunnel FFmpeg
    ws.on('message', (message) => {
        audioInput.write(message);
    });

    ws.on('close', () => {
        // sendTerminatePacket(tcpConnection);
        console.log('Client déconnecté');
        audioInput.end();
        tcpConnection.end();
    });

    tcpConnection.on('error', (err) => console.error('Erreur TCP:', err.message));
});