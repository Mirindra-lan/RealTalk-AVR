let socket;
let audioContext;
let mediaRecorder;
let mediaStreamSource;
let gainNode;
let nextStartTime = 0;
let stream;

let microAnalyser, remoteAnalyser;

const toggleBtn = document.getElementById('toggle');
let isStreaming = false;
const gainInput = document.getElementById('gain');

const VIZ_BARS = 32;
const vizMicro = document.getElementById('viz-micro');
const vizRemote = document.getElementById('viz-remote');

const microBars = [];
const remoteBars = [];

function createBars(container, barsArray) {
    for (let i = 0; i < VIZ_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'viz-bar';
        container.appendChild(bar);
        barsArray.push(bar);
    }
}

createBars(vizMicro, microBars);
createBars(vizRemote, remoteBars);

async function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });

    remoteAnalyser = audioContext.createAnalyser();
    remoteAnalyser.fftSize = 256;
    remoteAnalyser.connect(audioContext.destination);

    updateVAD(remoteAnalyser, remoteBars);
}

toggleBtn.onclick = async () => {

    // ▶️ START
    if (!isStreaming) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            console.error("Micro refusé :", err);
            // feedback utilisateur
            alert("Autorisation micro requise !");
            return; // ⛔ STOP → pas de WebSocket
        }
        if (!audioContext) await initAudio();
        if (audioContext.state === 'suspended') await audioContext.resume();

        socket = new WebSocket('ws://localhost:8080');
        socket.binaryType = 'arraybuffer';

        
        socket.onmessage = async (event) => {
            const int16Data = new Int16Array(event.data);
            const float32Data = new Float32Array(int16Data.length);
            
            for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 32768.0;
            }

            const buffer = audioContext.createBuffer(1, float32Data.length, 8000);
            buffer.copyToChannel(float32Data, 0);

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(remoteAnalyser);
            
            const now = audioContext.currentTime;
            nextStartTime = Math.max(nextStartTime, now);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
        };

        // const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        
        gainNode = audioContext.createGain();
        gainNode.gain.value = gainInput.value;

        microAnalyser = audioContext.createAnalyser();
        microAnalyser.fftSize = 256;

        mediaStreamSource.connect(gainNode);
        gainNode.connect(microAnalyser);

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(e.data);
            }
        };

        socket.onerror = () => {
            alert("Le serveur n'est disponible pour le moment")
        }
        
        socket.onopen = () => {
            mediaRecorder.start(100);
    
            updateVAD(microAnalyser, microBars);
            toggleBtn.style.backgroundColor = "red";
            isStreaming = true;
        }

    } 
    // ⏹ STOP
    else {

        if (mediaRecorder) mediaRecorder.stop();
        if (mediaStreamSource) mediaStreamSource.disconnect();
        if (socket) socket.close();

        [...microBars, ...remoteBars].forEach(bar => {
            bar.style.height = '2px';
        });
        toggleBtn.style.backgroundColor = "green"
        isStreaming = false;
    }
};

gainInput.oninput = () => {
    if (gainNode) gainNode.gain.value = gainInput.value;
};

function updateVAD(analyser, bars) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function render() {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bars.length; i++) {
            const index = Math.floor(i * dataArray.length / bars.length);
            const value = dataArray[index];

            const height = Math.max(2, (value / 255) * 48);
            bars[i].style.height = height + 'px';
        }

        requestAnimationFrame(render);
    }

    render();
}