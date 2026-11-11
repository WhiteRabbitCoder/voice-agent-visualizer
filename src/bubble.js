import * as THREE from 'three';
import { getAudioMetrics } from './audio.js';

let canvas, renderer, scene, camera;

// Deformable Halo & Gyroscope Rings
let mainHaloRing, haloGeometry, haloUnitPos;
let gyroRing1, gyroGeo1, gyroUnitPos1;
let gyroRing2, gyroGeo2, gyroUnitPos2;
let gyroRing3, gyroGeo3, gyroUnitPos3;

let barLines, barPositions, barGeometry;
let coreLight, coreHaloMesh;
let particleSystem, particlePositions;

let time = 0;
let state = 'idle';

let smoothVolume = 0;
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;

let dirLight1, dirLight2, ambientLight;

let currentColor = new THREE.Color(0x38bdf8); // Cortana Cyan / Blue
let secondaryColor = new THREE.Color(0xa78bfa); // Electric Purple

const BASE_RADIUS = 0.66; // 40% smaller compact Cortana ring
const BAR_COUNT = 64; // 64 Dubstep Circular Spectrum Bars
const PARTICLE_COUNT = 140;

function createDeformableTorus(radius, tube, radialSegments, tubularSegments) {
  const geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  const posAttr = geo.attributes.position;
  const unitPos = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    unitPos[i * 3] = posAttr.getX(i);
    unitPos[i * 3 + 1] = posAttr.getY(i);
    unitPos[i * 3 + 2] = posAttr.getZ(i);
  }

  return { geo, unitPos };
}

export function initBubble() {
  canvas = document.getElementById('bubble-canvas');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const height = rect.height || window.innerHeight;

  // 1. Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  // 2. WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  dirLight1 = new THREE.DirectionalLight(currentColor, 3.5);
  dirLight1.position.set(3, 4, 5);
  scene.add(dirLight1);

  dirLight2 = new THREE.DirectionalLight(secondaryColor, 2.5);
  dirLight2.position.set(-4, -4, 3);
  scene.add(dirLight2);

  coreLight = new THREE.PointLight(currentColor, 3.0, 8);
  coreLight.position.set(0, 0, 0);
  scene.add(coreLight);

  // 4. Main Cortana Center Halo Ring (Deformable Torus)
  const haloData = createDeformableTorus(BASE_RADIUS, 0.035, 32, 128);
  haloGeometry = haloData.geo;
  haloUnitPos = haloData.unitPos;

  const haloMaterial = new THREE.MeshStandardMaterial({
    color: currentColor,
    roughness: 0.1,
    metalness: 0.8,
    emissive: currentColor,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.95
  });

  mainHaloRing = new THREE.Mesh(haloGeometry, haloMaterial);
  scene.add(mainHaloRing);

  // 5. Classic Dubstep Radial Audio Spectrum Bars (64 Bars)
  barGeometry = new THREE.BufferGeometry();
  barPositions = new Float32Array(BAR_COUNT * 2 * 3);
  barGeometry.setAttribute('position', new THREE.BufferAttribute(barPositions, 3));

  const barMaterial = new THREE.LineBasicMaterial({
    color: currentColor,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  barLines = new THREE.LineSegments(barGeometry, barMaterial);
  scene.add(barLines);

  // 6. Gyroscope Concentric Deformable Rings (Tight Cohesive Cortana Core)
  // Gyro 1 (Inner - Bass Focus)
  const g1Data = createDeformableTorus(BASE_RADIUS * 0.85, 0.015, 24, 144);
  gyroGeo1 = g1Data.geo;
  gyroUnitPos1 = g1Data.unitPos;
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: currentColor,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  gyroRing1 = new THREE.Mesh(gyroGeo1, ringMat1);
  gyroRing1.rotation.x = Math.PI / 4;
  scene.add(gyroRing1);

  // Gyro 2 (Mid - Vocal Focus - Counter-rotating!)
  const g2Data = createDeformableTorus(BASE_RADIUS * 1.18, 0.012, 24, 144);
  gyroGeo2 = g2Data.geo;
  gyroUnitPos2 = g2Data.unitPos;
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: secondaryColor,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });
  gyroRing2 = new THREE.Mesh(gyroGeo2, ringMat2);
  gyroRing2.rotation.y = Math.PI / 3;
  scene.add(gyroRing2);

  // Gyro 3 (Outer - Treble Focus)
  const g3Data = createDeformableTorus(BASE_RADIUS * 1.36, 0.01, 24, 144);
  gyroGeo3 = g3Data.geo;
  gyroUnitPos3 = g3Data.unitPos;
  const ringMat3 = new THREE.MeshBasicMaterial({
    color: currentColor,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending
  });
  gyroRing3 = new THREE.Mesh(gyroGeo3, ringMat3);
  gyroRing3.rotation.x = -Math.PI / 3;
  scene.add(gyroRing3);

  // 7. Hollow Center Glow Core
  const coreHaloGeo = new THREE.TorusGeometry(BASE_RADIUS * 0.3, 0.02, 16, 64);
  const coreHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  coreHaloMesh = new THREE.Mesh(coreHaloGeo, coreHaloMat);
  scene.add(coreHaloMesh);

  // 8. Orbiting Stardust Particles
  const particleGeo = new THREE.BufferGeometry();
  particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleData = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = BASE_RADIUS * (0.8 + Math.random() * 1.3);
    const zOffset = (Math.random() - 0.5) * 1.2;

    particlePositions[i * 3] = Math.cos(angle) * dist;
    particlePositions[i * 3 + 1] = Math.sin(angle) * dist;
    particlePositions[i * 3 + 2] = zOffset;

    particleData.push({
      angle,
      dist,
      zOffset,
      speed: (0.3 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1)
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.userData = particleData;

  const particleMat = new THREE.PointsMaterial({
    color: currentColor,
    size: 0.05,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  window.addEventListener('resize', onWindowResize);
  loop();
}

export function setBubbleState(s) {
  state = s;
}

function onWindowResize() {
  if (!canvas || !renderer || !camera) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const height = rect.height || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function loop() {
  time += 0.016;
  update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// Bends 3D Ring Tube geometrically into 3D sine/cosine wave ribbons in real-time
function deformRingGeometry3D(geometry, unitPositions, freqArray, freqOffset, freqRange, waveGain, waveFreqCount, tSpeed, zDispGain) {
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    const ox = unitPositions[i * 3];
    const oy = unitPositions[i * 3 + 1];
    const oz = unitPositions[i * 3 + 2];

    const angle = Math.atan2(oy, ox);
    const normAngle = (angle + Math.PI) / (Math.PI * 2);

    let freqVal = 0;
    if (freqArray && freqArray.length > 0) {
      // Smooth linear interpolation across frequency bins to eliminate step discontinuities
      const exactIdx = freqOffset + normAngle * freqRange;
      const idx1 = Math.min(freqArray.length - 1, Math.floor(exactIdx));
      const idx2 = Math.min(freqArray.length - 1, idx1 + 1);
      const frac = exactIdx - Math.floor(exactIdx);
      const val1 = (freqArray[idx1] || 0) / 255;
      const val2 = (freqArray[idx2] || 0) / 255;
      freqVal = val1 + (val2 - val1) * frac;
    }

    // Radial 3D displacement (outward/inward ripple)
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    const waveR = Math.sin(angle * waveFreqCount + time * tSpeed) * (0.02 + freqVal * waveGain);
    const waveZ = Math.cos(angle * (waveFreqCount + 1) - time * tSpeed * 1.2) * (0.02 + freqVal * zDispGain);

    // Apply displacement vectors
    const nx = ox + cosAngle * waveR;
    const ny = oy + sinAngle * waveR;
    const nz = oz + waveZ;

    posAttr.setXYZ(i, nx, ny, nz);
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

function update() {
  const metrics = getAudioMetrics(state);

  const lerpSpeed = 0.25;
  smoothVolume += (metrics.volume - smoothVolume) * lerpSpeed;
  smoothBass += (metrics.bass - smoothBass) * lerpSpeed;
  smoothMid += (metrics.mid - smoothMid) * lerpSpeed;
  smoothTreble += (metrics.treble - smoothTreble) * lerpSpeed;

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isIdle = state === 'idle';

  const actFactor = isIdle ? 0.05 : Math.min(smoothVolume * 4.5 + smoothBass * 2.5, 1);

  // Theme Colors
  const style = getComputedStyle(document.documentElement);
  const primaryHex = style.getPropertyValue('--primary').trim() || '#38bdf8';
  const secHex = style.getPropertyValue('--secondary').trim() || '#a78bfa';

  let targetHex = isListening ? '#00f0ff' : isSpeaking ? '#e081ff' : primaryHex;
  let targetSecHex = isListening ? '#38bdf8' : isSpeaking ? '#a78bfa' : secHex;

  currentColor.lerp(new THREE.Color(targetHex), 0.1);
  secondaryColor.lerp(new THREE.Color(targetSecHex), 0.1);

  // Update Lights & Materials
  mainHaloRing.material.color.copy(currentColor);
  mainHaloRing.material.emissive.copy(currentColor);
  mainHaloRing.material.emissiveIntensity = 0.3 + actFactor * 0.9;
  barLines.material.color.copy(currentColor);

  gyroRing1.material.color.copy(currentColor);
  gyroRing2.material.color.copy(secondaryColor);
  gyroRing3.material.color.copy(currentColor);

  dirLight1.color.copy(currentColor);
  dirLight2.color.copy(secondaryColor);
  coreLight.color.copy(currentColor);

  // 1. DUBSTEP RADIAL SPECTRUM BARS
  const barPosArr = barGeometry.attributes.position.array;

  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (i / BAR_COUNT) * Math.PI * 2;

    let freqVal = 0;
    if (metrics.freqArray && metrics.freqArray.length > 0) {
      const halfN = BAR_COUNT / 2;
      const distFromCenter = Math.abs(i - halfN);
      // Map across speech-relevant bins (0 to 24) for rich visual feedback
      const maxSpeechBin = Math.min(24, metrics.freqArray.length - 1);
      const binIdx = Math.floor((distFromCenter / halfN) * maxSpeechBin);
      freqVal = (metrics.freqArray[binIdx] || 0) / 255;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (isSpeaking) {
      const barHeight = 0.03 + (freqVal * 1.45 * (0.3 + actFactor * 1.5)) + (smoothBass * 0.5);
      const innerR = BASE_RADIUS * (1.05 + smoothBass * 0.12);
      const outerR = innerR + barHeight;

      barPosArr[i * 6 + 0] = cos * innerR;
      barPosArr[i * 6 + 1] = sin * innerR;
      barPosArr[i * 6 + 2] = 0;

      barPosArr[i * 6 + 3] = cos * outerR;
      barPosArr[i * 6 + 4] = sin * outerR;
      barPosArr[i * 6 + 5] = 0;
    } else if (isListening) {
      const barHeight = 0.03 + (freqVal * 1.2 * (0.3 + actFactor * 1.5)) + (smoothTreble * 0.4);
      const outerR = BASE_RADIUS * 1.4;
      const innerR = Math.max(BASE_RADIUS * 0.4, outerR - barHeight);

      barPosArr[i * 6 + 0] = cos * innerR;
      barPosArr[i * 6 + 1] = sin * innerR;
      barPosArr[i * 6 + 2] = 0;

      barPosArr[i * 6 + 3] = cos * outerR;
      barPosArr[i * 6 + 4] = sin * outerR;
      barPosArr[i * 6 + 5] = 0;
    } else {
      const innerR = BASE_RADIUS * 1.05;
      const outerR = innerR + 0.03;

      barPosArr[i * 6 + 0] = cos * innerR;
      barPosArr[i * 6 + 1] = sin * innerR;
      barPosArr[i * 6 + 2] = 0;

      barPosArr[i * 6 + 3] = cos * outerR;
      barPosArr[i * 6 + 4] = sin * outerR;
      barPosArr[i * 6 + 5] = 0;
    }
  }

  barGeometry.attributes.position.needsUpdate = true;
  barLines.material.opacity = isIdle ? 0.15 : (0.4 + actFactor * 0.6);

  // 2. SPEECH-ACCORDED 3D GEOMETRIC WAVE DEFORMATION FOR ALL RINGS
  const waveGain = isIdle ? 0.01 : (0.12 + actFactor * 0.38);
  const zGain = isIdle ? 0.01 : (0.10 + actFactor * 0.32);
  const tSpeed = isSpeaking ? 3.8 : isListening ? 2.4 : 0.5;

  // Main Halo (Full Speech Spectrum: Bins 0..24)
  deformRingGeometry3D(haloGeometry, haloUnitPos, metrics.freqArray, 0, 24, waveGain * 1.0, 5, tSpeed, zGain * 1.0);

  // Gyro Ring 1 (Inner Ring - Deep Bass / Fundamental Pitch - High Swell & Amplitude)
  deformRingGeometry3D(gyroGeo1, gyroUnitPos1, metrics.freqArray, 0, 4, waveGain * 1.8, 3, tSpeed * 0.75, zGain * 1.9);

  // Gyro Ring 2 (Mid Ring - Main Vocal Formants & Articulation - Balanced Waves)
  deformRingGeometry3D(gyroGeo2, gyroUnitPos2, metrics.freqArray, 4, 8, waveGain * 1.25, 5, tSpeed * 1.0, zGain * 1.25);

  // Gyro Ring 3 (Outer Ring - Consonants, Sibilants & Highs - Fast Micro-Ripples)
  deformRingGeometry3D(gyroGeo3, gyroUnitPos3, metrics.freqArray, 12, 13, waveGain * 0.85, 8, tSpeed * 1.4, zGain * 0.9);

  // 3. ELEGANT SLOW COUNTER-ROTATION (75% Slower for graceful 3D AI orb look)
  // Ring 1: Clockwise Y + X
  const speedG1 = isListening ? (0.012 + smoothTreble * 0.015) : (0.003 + actFactor * 0.006);
  gyroRing1.rotation.y += speedG1;
  gyroRing1.rotation.x += speedG1 * 0.6;
  gyroRing1.material.opacity = isListening ? (0.6 + smoothVolume * 0.4) : (0.15 + actFactor * 0.35);

  // Ring 2: COUNTER-CLOCKWISE -Y and -Z (Counter-rotating!)
  const speedG2 = isListening ? (0.014 + smoothMid * 0.015) : (0.004 + actFactor * 0.006);
  gyroRing2.rotation.y -= speedG2;
  gyroRing2.rotation.z -= speedG2 * 0.7;
  gyroRing2.material.opacity = isListening ? (0.55 + smoothVolume * 0.4) : (0.12 + actFactor * 0.3);

  // Ring 3: COUNTER-ROTATION +Z and -X
  const speedG3 = isSpeaking ? (0.016 + smoothBass * 0.02) : (0.0035 + actFactor * 0.005);
  gyroRing3.rotation.z += speedG3;
  gyroRing3.rotation.x -= speedG3 * 0.8;
  gyroRing3.material.opacity = isSpeaking ? (0.7 + smoothBass * 0.3) : (0.1 + actFactor * 0.25);

  // Main Halo Slow Rotation
  mainHaloRing.rotation.z -= 0.0015;
  mainHaloRing.rotation.y += 0.002;

  // 4. CENTER NUCLEUS PULSING
  const coreScale = isSpeaking
    ? (0.8 + smoothBass * 1.3 + smoothVolume * 0.6)
    : isListening
    ? (0.8 + Math.sin(time * 6) * 0.15 + smoothVolume * 0.4)
    : (0.7 + Math.sin(time * 1.5) * 0.05);

  coreHaloMesh.scale.set(coreScale, coreScale, coreScale);
  coreHaloMesh.rotation.z = -time * (isSpeaking ? 0.6 : 0.2);
  coreLight.intensity = isSpeaking
    ? (2.0 + smoothBass * 12.0 + actFactor * 4.0)
    : isListening
    ? (1.5 + smoothVolume * 6.0)
    : 1.0;

  // 5. ORBITING STARDUST PARTICLES ACCELERATION
  const pGeo = particleSystem.geometry;
  const pPositions = pGeo.attributes.position.array;
  const pData = pGeo.userData;
  const pSpeedMult = isSpeaking ? (1.5 + smoothTreble * 4.0) : isListening ? (1.2 + smoothVolume * 2.5) : 0.3;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const item = pData[i];
    item.angle += item.speed * pSpeedMult * 0.005;

    const r = item.dist * (1.0 + (isSpeaking ? smoothBass * 0.4 : smoothVolume * 0.2) + Math.sin(time * 2 + i) * 0.08);
    pPositions[i * 3] = Math.cos(item.angle) * r;
    pPositions[i * 3 + 1] = Math.sin(item.angle) * r;
    pPositions[i * 3 + 2] = item.zOffset * (1.0 + (isSpeaking ? smoothBass * 0.5 : 0));
  }

  pGeo.attributes.position.needsUpdate = true;
  particleSystem.material.opacity = isIdle ? 0.15 : (0.3 + actFactor * 0.7);
}
