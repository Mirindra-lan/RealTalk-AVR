// audioProcessor.js
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

class AudioProcessor {
    constructor() {
        this.inputStream = new PassThrough();
    }

    pipeToTcp(tcpClient) {
        ffmpeg(this.inputStream)
            .inputFormat('webm')
            .audioCodec('pcm_s16le')
            .audioChannels(1)
            .audioFrequency(8000)
            .format('s16le')
            .on('error', (err) => console.error('Erreur FFmpeg:', err.message))
            .pipe()
            .on('data', (pcmBuffer) => tcpClient.sendPcm(pcmBuffer));
    }

    feed(message) {
        this.inputStream.write(message);
    }

    end() {
        this.inputStream.end();
    }
}

module.exports = AudioProcessor;