import { initTheme } from './theme.js';
import { initBubble } from './bubble.js';
import { connect, sendMessage, sendActivity, isConnected } from './agent.js';

initTheme();
initBubble();

const connectBtn = document.getElementById('connect-btn');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

connectBtn.addEventListener('click', connect);

sendBtn.addEventListener('click', () => {
  const text = chatInput.value;
  if (text.trim()) {
    sendMessage(text);
    chatInput.value = '';
  }
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = chatInput.value;
    if (text.trim()) {
      sendMessage(text);
      chatInput.value = '';
    }
  }
});

let activityTimeout = null;
chatInput.addEventListener('input', () => {
  if (!isConnected()) return;
  clearTimeout(activityTimeout);
  activityTimeout = setTimeout(() => sendActivity(), 300);
});
