import { Conversation } from '@elevenlabs/client';
import { addMessage, appendStreaming, clearMessages, finalizeStreaming } from './chat.js';
import { setBubbleState } from './bubble.js';
import { setConversation, stopPolling } from './audio.js';

let conversation = null;
let connected = false;
let pendingUserAt = 0;
let lastLocalUserText = '';
let lastLocalUserAt = 0;
let agentStreamActive = false;
let agentStreamHasLatency = false;

const AGENT_ID = import.meta.env.VITE_AGENT_ID || 'YOUR_AGENT_ID';

const stateIndicator = document.getElementById('state-indicator');
const stateText = document.getElementById('state-text');
const connectBtn = document.getElementById('connect-btn');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

export function isConnected() {
  return connected;
}

export async function connect() {
  if (connected) return disconnect();

  connectBtn.disabled = true;
  connectBtn.querySelector('span').textContent = 'Connecting...';
  clearMessages();
  finalizeStreaming();
  pendingUserAt = 0;
  lastLocalUserText = '';
  lastLocalUserAt = 0;
  agentStreamActive = false;
  agentStreamHasLatency = false;

  try {
    conversation = await Conversation.startSession({
      agentId: AGENT_ID,

      onConnect: () => {
        connected = true;
        connectBtn.disabled = false;
        connectBtn.classList.add('connected');
        connectBtn.querySelector('span').textContent = 'Disconnect';
        chatInput.disabled = false;
        sendBtn.disabled = false;
        updateState('listening');
        setConversation(conversation);
        clearMessages();
      },

      onDisconnect: () => {
        handleDisconnect();
      },

      onMessage: (msg) => {
        if (msg.source === 'ai') {
          if (agentStreamActive) {
            finalizeStreaming();
            agentStreamActive = false;
            agentStreamHasLatency = false;
            return;
          }

          const latencyMeta = getLatencyMeta();
          if (!agentStreamHasLatency) {
            appendStreaming('agent', msg.message, latencyMeta);
            agentStreamHasLatency = true;
          } else {
            appendStreaming('agent', msg.message);
          }
        } else if (msg.source === 'user') {
          if (shouldIgnoreLocalUserEcho(msg.message)) return;
          pendingUserAt = performance.now();
          appendStreaming('user', msg.message);
        }
      },

      onAgentChatResponsePart: (part) => {
        const latencyMeta = getLatencyMeta();
        if (!agentStreamHasLatency) {
          appendStreaming('agent', part, latencyMeta);
          agentStreamHasLatency = true;
          agentStreamActive = true;
          return;
        }

        agentStreamActive = true;
        appendStreaming('agent', part);
      },

      onAgentToolRequest: (toolRequest) => {
        addMessage('system', 'Agent tool request', describeObject(toolRequest));
      },

      onAgentToolResponse: (toolResponse) => {
        const toolName = toolResponse.tool_name || 'tool';
        const summary = toolResponse.is_error ? 'Tool response error' : 'Tool response';
        addMessage('system', `${summary}: ${toolName}`, describeObject(toolResponse));
        agentStreamActive = false;
        agentStreamHasLatency = false;
      },

      onConversationMetadata: (metadata) => {
        addMessage('system', 'Conversation metadata', describeObject(metadata));
      },

      onAsrInitiationMetadata: (metadata) => {
        addMessage('system', 'ASR metadata', describeObject(metadata));
      },

      onVadScore: () => {},

      onGuardrailTriggered: () => {
        addMessage('system', 'Guardrail triggered', 'The conversation was flagged by a guardrail.');
      },

      onModeChange: (mode) => {
        if (mode.mode === 'speaking') {
          finalizeStreaming();
          agentStreamActive = false;
          agentStreamHasLatency = false;
          updateState('speaking');
        } else if (mode.mode === 'listening') {
          finalizeStreaming();
          agentStreamActive = false;
          agentStreamHasLatency = false;
          updateState('listening');
        }
      },

      onError: (error) => {
        console.error('Agent error:', error);
        addMessage('agent', 'Connection error. Please try again.');
        handleDisconnect();
      },
    });
  } catch (err) {
    console.error('Failed to connect:', err);
    connectBtn.disabled = false;
    connectBtn.querySelector('span').textContent = 'Connect';
    addMessage('agent', 'Failed to connect. Check your agent ID.');
  }
}

async function disconnect() {
  if (conversation) {
    await conversation.endSession();
    conversation = null;
  }
  handleDisconnect();
}

function handleDisconnect() {
  connected = false;
  conversation = null;
  stopPolling();
  connectBtn.classList.remove('connected');
  connectBtn.disabled = false;
  connectBtn.querySelector('span').textContent = 'Connect';
  chatInput.disabled = true;
  sendBtn.disabled = true;
  updateState('idle');
  finalizeStreaming();
  agentStreamActive = false;
  agentStreamHasLatency = false;
}

function updateState(s) {
  stateIndicator.className = s;
  stateText.textContent = s === 'idle' ? 'Idle' : s === 'listening' ? 'Listening' : 'Agent Speaking';
  setBubbleState(s);
}

export function sendMessage(text) {
  if (!conversation || !connected || !text.trim()) return;
  const cleanText = text.trim();
  pendingUserAt = performance.now();
  lastLocalUserText = cleanText;
  lastLocalUserAt = pendingUserAt;
  agentStreamActive = false;
  agentStreamHasLatency = false;
  conversation.sendUserMessage(cleanText);
  addMessage('user', cleanText);
}

export function sendActivity() {
  if (!conversation || !connected) return;
  try {
    conversation.sendUserActivity?.();
  } catch { }
}

function shouldIgnoreLocalUserEcho(message) {
  return message === lastLocalUserText && performance.now() - lastLocalUserAt < 1500;
}

function getLatencyMeta() {
  if (!pendingUserAt) return '';
  const latencyMs = performance.now() - pendingUserAt;
  pendingUserAt = 0;
  return `Latency ${formatLatency(latencyMs)}`;
}

function formatLatency(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function describeObject(value) {
  if (!value || typeof value !== 'object') return '';

  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .slice(0, 8)
    .map(([key, v]) => `${key}: ${stringifyValue(v)}`);

  return entries.join(' • ');
}

function stringifyValue(value) {
  if (Array.isArray(value)) return `[${value.map(stringifyValue).join(', ')}]`;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
