# Voice Agent Visualizer

A minimalist voice agent interface with an audio-reactive blob visualization. Built with Vite, vanilla JavaScript, and the [ElevenLabs Conversational AI SDK](https://www.npmjs.com/package/@elevenlabs/client).

![Dark mode](https://img.shields.io/badge/theme-dark%20%2F%20light-1a1d23)
![Vanilla JS](https://img.shields.io/badge/stack-Vite%20%2B%20Vanilla%20JS-646cff)

---

## Features

- **Audio-reactive blob** -- Perlin-noise-deformed sphere with orbiting particles, driven by real-time mic/speaker volume
- **3-state visualization** -- idle (breathing), listening (smooth waveform), speaking (energetic distortion)
- **Real-time transcript** -- streaming agent responses with progressive text append
- **Text input** -- send messages manually alongside voice interaction
- **Dark / Light mode** -- toggle with persistence in localStorage
- **Responsive** -- splits vertically on mobile (< 768px)
- **No frameworks** -- pure DOM manipulation, Canvas API, CSS custom properties

## Preview

| Left panel (80%) | Right panel (20%) |
|---|---|
| Full-screen canvas with animated blob | Scrollable transcript + text input |

The blob reacts to volume in real time: subtle breathing when idle, smooth expansion when listening, energetic particles when the agent speaks.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- An [ElevenLabs](https://elevenlabs.io) account with a Conversational AI agent configured

### Setup

```bash
git clone https://github.com/WhiteRabbitCoder/voice-agent-visualizer.git
cd voice-agent-visualizer
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set your agent ID:

```
VITE_AGENT_ID=your_agent_id_here
```

### Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. Click **Connect** to start a voice session.

### Build

```bash
npm run build
npm run preview   # preview the production build
```

---

## Project Structure

```
index.html          Entry point with split-screen layout
src/
  main.js           App initialization and event wiring
  agent.js          ElevenLabs SDK session lifecycle
  bubble.js         Canvas blob + particle rendering (Perlin noise)
  audio.js          Volume polling bridge between SDK and visualization
  chat.js           Transcript panel DOM management
  theme.js          Dark/light theme toggle
  styles.css        Design system with CSS custom properties
```

## Architecture

```
main.js  -->  agent.js  -->  @elevenlabs/client
  |              |
  |           chat.js        (transcript DOM)
  |              |
  +---->  bubble.js  <-->  audio.js  (volume bridge)
```

**agent.js** owns the connection state and SDK callbacks. When the mode changes (`speaking` / `listening`), it calls `setBubbleState()` to update the visualization and `chat.js` functions for the transcript.

**audio.js** exists to avoid a circular dependency: it polls `getInputVolume()` / `getOutputVolume()` from the SDK and exposes them to `bubble.js` without importing `agent.js`.

**bubble.js** runs an independent `requestAnimationFrame` loop. It reads the current `--primary` CSS variable at draw time, so theme switches propagate automatically without JS coupling.

## Color System

Monochromatic neutral palette with a blue accent. Defined as CSS custom properties:

| Variable | Dark | Light |
|---|---|---|
| `--bg` | `#0d1017` | `#f7f8fa` |
| `--surface` | `#151922` | `#ffffff` |
| `--primary` | `#3a86ff` | `#2f6df6` |
| `--text` | `#e6e9ef` | `#1a1d23` |
| `--muted` | `#8b93a7` | `#6b7280` |

---

## Usage

1. Click **Connect** -- grants microphone access and opens a WebRTC session
2. Speak naturally -- the blob reacts to your voice; transcript appears in the right panel
3. The agent responds with audio and streaming text
4. Type in the input box and press Enter to send text messages
5. Click **Disconnect** (red button) to end the session
6. Toggle theme with the sun/moon icon in the top-right corner

---

## License

MIT
