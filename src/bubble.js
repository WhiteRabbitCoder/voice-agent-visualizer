import { getInputVolume, getOutputVolume } from './audio.js';

let canvas, ctx;
let width, height;
let time = 0;
let state = 'idle';
let smoothVolume = 0;

let currentColor = { r: 167, g: 139, b: 250 }; // Default primary dark
let targetColor = { r: 167, g: 139, b: 250 };

const BASE_RADIUS_RATIO = 0.15;
let particles = [];
const PARTICLE_COUNT = 60;

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      orbit: Math.random() * 0.95,
      speed: (0.5 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1),
      size: 1 + Math.random() * 1.5,
      alphaOffset: Math.random() * Math.PI * 2
    });
  }
}

export function initBubble() {
  canvas = document.getElementById('bubble-canvas');
  ctx = canvas.getContext('2d');
  initParticles();
  resize();
  window.addEventListener('resize', resize);
  loop();
}

export function setBubbleState(s) {
  state = s;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  time += 0.015;
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  let volume = 0;
  if (state === 'speaking') {
    volume = getOutputVolume();
  } else if (state === 'listening') {
    volume = getInputVolume();
  }
  smoothVolume += (volume - smoothVolume) * 0.15;

  const style = getComputedStyle(document.documentElement);
  const primaryHex = style.getPropertyValue('--primary').trim();
  const secondaryHex = style.getPropertyValue('--secondary').trim();

  // Pick target color based on state
  const targetHex = state === 'listening' ? (secondaryHex || primaryHex) : primaryHex;
  const tColor = hexToRgbObj(targetHex);

  // Smooth color transition
  currentColor.r += (tColor.r - currentColor.r) * 0.05;
  currentColor.g += (tColor.g - currentColor.g) * 0.05;
  currentColor.b += (tColor.b - currentColor.b) * 0.05;
}

function hexToRgbObj(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function formatRgba(colorObj, alpha) {
  return `rgba(${Math.round(colorObj.r)}, ${Math.round(colorObj.g)}, ${Math.round(colorObj.b)}, ${alpha})`;
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  // Calculate a breathing baseline radius
  const baseRadius = Math.min(width, height) * BASE_RADIUS_RATIO;
  // Slowly breathe slightly by default, and expand firmly when volume hits
  const radius = baseRadius * (1 + 0.045 * Math.sin(time * 0.5) + 0.14 * smoothVolume);

  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue('--bg').trim();

  // "Activity level" relies strictly on volume, not state.
  // This makes the transition smooth and the bubble hibernate if no verbal input.
  const activityBoost = Math.min(smoothVolume * 5, 1);
  const baseSpeed = 0.05;
  const activeSpeed = 0.6;
  const currentSpeed = baseSpeed + activityBoost * activeSpeed;
  const dynamicTime = time * currentSpeed;

  // Glow behind the main circle
  const glowIntensity = 0.05 + activityBoost * 0.2 + smoothVolume * 0.1;
  const glowRadius = radius * (1.2 + smoothVolume * 1.5);
  const glowGradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, glowRadius);
  glowGradient.addColorStop(0, formatRgba(currentColor, glowIntensity));
  glowGradient.addColorStop(0.5, formatRgba(currentColor, glowIntensity * 0.5));
  glowGradient.addColorStop(1, 'transparent');

  ctx.fillStyle = glowGradient;
  ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);

  // Background filler of the circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  // Clip contents to be strictly inside the static circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Inside Gradient
  const innerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  innerGradient.addColorStop(0, formatRgba(currentColor, 0.08 + smoothVolume * 0.3));
  innerGradient.addColorStop(1, formatRgba(currentColor, 0.02 + smoothVolume * 0.05));
  ctx.fillStyle = innerGradient;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Animated Inner Concentric Rings
  const rings = Math.floor(3 + smoothVolume * 3);
  for (let i = 1; i <= rings; i++) {
    const ringPhase = dynamicTime * (0.5 + i * 0.2) + i * Math.PI / rings;
    const waveVol = smoothVolume * (1 + (rings - i) * 0.6);

    ctx.beginPath();
    // Use a small baseline pulse 'breathing' + large pulse based on activity
    const breathePulse = radius * 0.03 * Math.abs(Math.sin(time * 0.5 + i));
    const dynamicPulse = radius * 0.4 * Math.abs(Math.sin(ringPhase)) * activityBoost;

    const r = radius * 0.15 + breathePulse + dynamicPulse + waveVol * radius * 0.4;
    ctx.arc(cx, cy, Math.min(r, radius * 0.95), 0, Math.PI * 2);
    ctx.lineWidth = 1 + waveVol * 2.5;
    ctx.strokeStyle = formatRgba(currentColor, 0.1 + waveVol * 0.3);
    ctx.stroke();
  }

  // Animated Core (Solid center that acts like a beating heart)
  ctx.beginPath();
  // Very soft heartbeat when quiet, robust heartbeat when active
  const heartBeat = Math.sin(time * 2) * 0.015 + Math.sin(dynamicTime * 4) * 0.05 * activityBoost;
  const coreRadius = radius * (0.15 + smoothVolume * 0.6 + heartBeat);
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  coreGrad.addColorStop(0, formatRgba(currentColor, 0.5 + smoothVolume * 0.5));
  coreGrad.addColorStop(1, formatRgba(currentColor, 0.0));
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Particles inside
  const particleSpeedMulti = baseSpeed + activityBoost * 1.5;
  for (const p of particles) {
    p.angle += p.speed * particleSpeedMulti * 0.02;

    const wobble = activityBoost * 0.3 * Math.sin(p.angle * 2);
    const r = radius * p.orbit * (0.8 + wobble);
    const px = cx + Math.cos(p.angle) * r;
    const py = cy + Math.sin(p.angle) * r;

    const alphaWobble = 0.2 + (0.6 * Math.abs(Math.sin(dynamicTime * 2 + p.alphaOffset)) * activityBoost);
    const alpha = alphaWobble * (0.3 + smoothVolume * 0.7);

    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fillStyle = formatRgba(currentColor, Math.min(alpha, 1));
    ctx.fill();
  }

  ctx.restore(); // remove clipping

  // Solid Elegant Outer Border
  ctx.beginPath();
  const borderRadius = radius * (1 + 0.01 * Math.sin(time * 0.9));
  ctx.arc(cx, cy, borderRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1.5 + smoothVolume * 0.6;
  ctx.strokeStyle = formatRgba(currentColor, 0.2 + smoothVolume * 0.5);
  ctx.stroke();
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
