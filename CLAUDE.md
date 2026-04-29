# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview the production build locally
```

No linter, formatter, or test runner is configured. No TypeScript — pure vanilla JS with ES modules.

## Environment

Requires a `.env` file with `VITE_AGENT_ID` set to a valid ElevenLabs conversational agent ID. See `.env.example`.

## Architecture

Vite + vanilla JS voice agent interface using the ElevenLabs Conversational AI SDK (`@elevenlabs/client`). Split-screen layout: canvas visualization (left, ~80%) and transcript panel (right, ~20%).

### Module Dependency Flow

```
main.js  →  agent.js  →  @elevenlabs/client (Conversation.startSession)
   │           ↓ ↑
   │        chat.js      (DOM: addMessage, appendStreaming, finalizeStreaming)
   │           ↓
   └──→  bubble.js  ←→  audio.js
```

- **agent.js** — Session lifecycle (connect/disconnect), SDK callback wiring, state management. The single source of truth for connection state. Calls `setBubbleState()` to drive visualization and `chat.js` functions for transcript updates.
- **bubble.js** — Canvas rendering loop (`requestAnimationFrame`). Implements a 3-state machine (`idle` / `listening` / `speaking`) that drives a Perlin-noise-deformed blob with orbiting particles. Reads volume from `audio.js` each frame.
- **audio.js** — Polls `getInputVolume()` / `getOutputVolume()` from the SDK conversation object via rAF. Acts as a bridge so `bubble.js` doesn't import `agent.js` (avoids circular deps).
- **chat.js** — Manages the `#chat-messages` DOM node. `appendStreaming` accumulates agent text into one element until `finalizeStreaming` is called on mode change.
- **theme.js** — Dark/light toggle via `data-theme` attribute on `<html>`, persisted in `localStorage`.

### Styling

Single `styles.css` with CSS custom properties under `:root` (dark) and `[data-theme="light"]`. The bubble reads `--primary` from computed styles at draw time so theme changes propagate without JS coupling.

### ElevenLabs SDK Usage

The SDK's `Conversation.startSession()` returns a `VoiceConversation` instance (WebRTC by default). Key callbacks: `onConnect`, `onDisconnect`, `onMessage` (agent transcript chunks via `source: 'ai'`), `onModeChange` (`{ mode: 'speaking' | 'listening' }`), `onError`. User text input uses `conversation.sendUserMessage(text)` and `conversation.sendUserActivity()` for typing indicators.

### UI Conventions

- No frameworks, no build-time CSS processing — plain DOM manipulation
- Inline SVG icons (Lucide-style) in `index.html` — no icon library dependency
- All interactive elements use ID selectors; message bubbles use class selectors (`.message.user`, `.message.agent`)
- Mobile breakpoint at 768px switches to vertical stack layout
