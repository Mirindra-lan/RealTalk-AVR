# RealTalk-AVR

**RealTalk-AVR** is a real-time voice streaming bridge connecting web browsers to **AVR-Core**, enabling live audio calls directly from your browser. It handles bidirectional audio, converting browser audio to PCM 8k for AVR-Core and playing bot responses in real time.

---

## 🚀 Features

- Real-time bidirectional audio streaming (Browser ↔ AVR-Core)
- Single toggle call button with phone icon
- Voice Activity Detection (VAD) for microphone and server audio
- Adjustable microphone gain
- Secure streaming: WebSocket opens only after microphone permission
- Cross-platform: works on modern browsers with Web Audio API

---

## 🏗 Architecture

**Audio pipeline (textual description):**

1. **Browser**  
   - Captures microphone audio via `MediaRecorder`  
   - Sends audio chunks over **WebSocket** to Node server  
   - Receives audio chunks from Node server  
   - Plays audio via `AudioContext`  

2. **Node Server**  
   - Receives WebSocket audio from browser  
   - Converts WebM/Opus audio chunks to **PCM 8000**  
   - Sends PCM audio via **TCP** to AVR-Core  
   - Receives PCM audio from AVR-Core  
   - Sends audio chunks back to browser via WebSocket  

3. **AVR-Core**  
   - Processes PCM audio received via TCP  
   - Sends PCM audio back to Node server  

This pipeline ensures **low-latency, high-quality bidirectional streaming** for real-time voice interactions with the AVR-Core bot.

---

## ⚙️ Setup

1. **Clone the repository**
```bash
git clone https://github.com/Mirindra-lan/RealTalk-AVR.git
cd RealTalk-AVR
Install dependencies
npm install
Create a .env file
WS_PORT=8080
AVR_HOST=localhost
AVR_PORT=5070
Start the Node server
node server.js
Open the browser
Navigate to index.html
Click the phone icon to start streaming
🎛 Usage
Toggle Call: single button for start/stop
Microphone Gain: adjust sensitivity
Monitor Audio: VAD bars show microphone and server audio
Permissions: WebSocket opens only after microphone access is granted
✅ Requirements
Node.js v18+
Modern browser (Chrome, Firefox, Edge)
Running AVR-Core server accessible via TCP
🔒 Security Notes
WebSocket connection opens only after microphone permission is granted
Connection status is monitored to ensure audio streaming occurs only when properly connected