const messagesEl = document.getElementById('chat-messages');

let streamingEl = null;
let streamingRole = null;

function roleLabelFor(role) {
  if (role === 'user') return 'You';
  if (role === 'system') return 'System';
  return 'Agent';
}

function createMessageElement(role, text, metaText) {
  const el = document.createElement('div');
  el.className = `message ${role}`;

  const roleLabel = document.createElement('span');
  roleLabel.className = 'role';
  roleLabel.textContent = roleLabelFor(role);

  const content = document.createElement('span');
  content.className = 'content';
  content.textContent = text;

  el.appendChild(roleLabel);
  el.appendChild(content);

  if (metaText) {
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = metaText;
    el.appendChild(meta);
  }

  return el;
}

export function clearMessages() {
  finalizeStreaming();
  messagesEl.replaceChildren();
}

export function addMessage(role, text, metaText = '') {
  finalizeStreaming();

  const el = createMessageElement(role, text, metaText);
  messagesEl.appendChild(el);
  scrollToBottom();
}

export function appendStreaming(role, text, metaText = '') {
  if (streamingEl && streamingRole === role) {
    const content = streamingEl.querySelector('.content');
    content.textContent += text;
    scrollToBottom();
    return;
  }

  finalizeStreaming();

  streamingRole = role;
  streamingEl = createMessageElement(role, text, metaText);
  messagesEl.appendChild(streamingEl);
  scrollToBottom();
}

export function finalizeStreaming() {
  streamingEl = null;
  streamingRole = null;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
