(function() {
  'use strict';

  // Configuration (set via data attributes or window.VoxaConfig)
  const config = window.VoxaConfig || {};
  const script = document.currentScript;
  
  const AGENT_ID = config.agentId || script?.dataset?.agentId;
  const API_URL = config.apiUrl || script?.dataset?.apiUrl || 'https://voxa.redwanjemal.dev';
  const WIDGET_TOKEN = config.token || script?.dataset?.token;
  const POSITION = config.position || script?.dataset?.position || 'bottom-right';
  const PRIMARY_COLOR = config.primaryColor || script?.dataset?.primaryColor || '#6366f1';
  
  if (!AGENT_ID || !WIDGET_TOKEN) {
    console.error('Voxa Widget: Missing agentId or token');
    return;
  }

  // Styles
  const styles = `
    .voxa-widget-btn {
      position: fixed;
      ${POSITION.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${POSITION.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .voxa-widget-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(0,0,0,0.25);
    }
    .voxa-widget-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .voxa-widget-btn.recording {
      animation: voxa-pulse 1.5s infinite;
    }
    @keyframes voxa-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      50% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
    }
    .voxa-widget-panel {
      position: fixed;
      ${POSITION.includes('bottom') ? 'bottom: 90px;' : 'top: 90px;'}
      ${POSITION.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: 350px;
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 99998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .voxa-widget-panel.open { display: flex; }
    .voxa-widget-header {
      background: ${PRIMARY_COLOR};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .voxa-widget-header-icon {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .voxa-widget-header-icon svg { width: 20px; height: 20px; fill: white; }
    .voxa-widget-header-text h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .voxa-widget-header-text p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
    .voxa-widget-messages {
      flex: 1;
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      background: #f9fafb;
    }
    .voxa-widget-msg {
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
    }
    .voxa-widget-msg.user { align-items: flex-end; }
    .voxa-widget-msg.assistant { align-items: flex-start; }
    .voxa-widget-msg-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }
    .voxa-widget-msg.user .voxa-widget-msg-bubble {
      background: ${PRIMARY_COLOR};
      color: white;
      border-bottom-right-radius: 4px;
    }
    .voxa-widget-msg.assistant .voxa-widget-msg-bubble {
      background: white;
      color: #1f2937;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .voxa-widget-controls {
      padding: 16px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: center;
    }
    .voxa-widget-mic-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .voxa-widget-mic-btn:hover { background: ${PRIMARY_COLOR}dd; }
    .voxa-widget-mic-btn.recording { background: #ef4444; }
    .voxa-widget-mic-btn svg { width: 24px; height: 24px; fill: white; }
    .voxa-widget-status {
      text-align: center;
      padding: 8px;
      font-size: 12px;
      color: #6b7280;
    }
  `;

  // Icons
  const micIcon = `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"/></svg>`;
  const phoneIcon = `<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`;
  const stopIcon = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;

  // Create elements
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const btn = document.createElement('button');
  btn.className = 'voxa-widget-btn';
  btn.innerHTML = phoneIcon;
  btn.setAttribute('aria-label', 'Open voice assistant');

  const panel = document.createElement('div');
  panel.className = 'voxa-widget-panel';
  panel.innerHTML = `
    <div class="voxa-widget-header">
      <div class="voxa-widget-header-icon">${phoneIcon}</div>
      <div class="voxa-widget-header-text">
        <h3>Voice Assistant</h3>
        <p>Tap the mic and start speaking</p>
      </div>
    </div>
    <div class="voxa-widget-messages"></div>
    <div class="voxa-widget-status">Ready</div>
    <div class="voxa-widget-controls">
      <button class="voxa-widget-mic-btn" aria-label="Start recording">${micIcon}</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector('.voxa-widget-messages');
  const statusEl = panel.querySelector('.voxa-widget-status');
  const micBtn = panel.querySelector('.voxa-widget-mic-btn');

  // State
  let isOpen = false;
  let isRecording = false;
  let ws = null;
  let audioContext = null;
  let mediaStream = null;
  let processor = null;

  // Toggle panel
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && !ws) {
      connectWebSocket();
    }
  });

  // Add message to chat
  function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `voxa-widget-msg ${role}`;
    msg.innerHTML = `<div class="voxa-widget-msg-bubble">${text}</div>`;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Connect WebSocket
  function connectWebSocket() {
    statusEl.textContent = 'Connecting...';
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    ws = new WebSocket(`${wsUrl}/api/v1/voice/${AGENT_ID}?token=${WIDGET_TOKEN}`);

    ws.onopen = () => {
      statusEl.textContent = 'Connected';
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') {
          statusEl.textContent = `${data.agent} is ready`;
        } else if (data.type === 'transcript') {
          addMessage(data.role, data.text);
        } else if (data.type === 'audio_end') {
          statusEl.textContent = 'Your turn';
        } else if (data.type === 'error') {
          statusEl.textContent = data.message;
        }
      } else {
        // Binary audio data - play it
        playAudio(event.data);
      }
    };

    ws.onclose = () => {
      statusEl.textContent = 'Disconnected';
      ws = null;
    };

    ws.onerror = () => {
      statusEl.textContent = 'Connection error';
    };
  }

  // Play audio response
  let audioQueue = [];
  let isPlaying = false;

  async function playAudio(data) {
    audioQueue.push(data);
    if (!isPlaying) {
      isPlaying = true;
      statusEl.textContent = 'Speaking...';
      while (audioQueue.length > 0) {
        const chunk = audioQueue.shift();
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await chunk.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          source.start();
          await new Promise(r => source.onended = r);
        } catch (e) {
          console.warn('Audio playback error:', e);
        }
      }
      isPlaying = false;
    }
  }

  // Microphone handling
  micBtn.addEventListener('click', async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  async function startRecording() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          ws.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      isRecording = true;
      micBtn.classList.add('recording');
      micBtn.innerHTML = stopIcon;
      btn.classList.add('recording');
      statusEl.textContent = 'Listening...';
    } catch (e) {
      statusEl.textContent = 'Microphone access denied';
    }
  }

  function stopRecording() {
    if (processor) {
      processor.disconnect();
      processor = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.innerHTML = micIcon;
    btn.classList.remove('recording');
    statusEl.textContent = 'Processing...';

    // Send end_turn signal
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'end_turn' }));
    }
  }
})();
