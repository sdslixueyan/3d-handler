
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { HandData } from '../types';

interface SceneProps {
  handData: HandData | null;
  planetColor: string;
  ringColor: string;
}

const Scene: React.FC<SceneProps> = ({ handData, planetColor, ringColor }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    planetParticles: THREE.Points;
    innerRing: THREE.Points;
    outerRing: THREE.Points;
    nebulaParticles: THREE.Points;
    stars: THREE.Points[];
    targetDistance: number;
    targetRotation: number;
    currentDistance: number;
    currentRotation: number;
    lastHandDepth: number;
    zoomDuration: number; // Time active gesture has been held
    currentGesture: 'none' | 'zoomIn' | 'zoomOut';
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    };

    const tex = createParticleTexture();

    // 1. STAR FIELDS (Vast Cosmos)
    const stars: THREE.Points[] = [];
    const addStarField = (count: number, size: number, radiusRange: [number, number], color: number, opacity: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(-1 + 2 * Math.random());
        pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i*3+2] = r * Math.cos(phi);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size, color, transparent: true, opacity, blending: THREE.AdditiveBlending, map: tex });
      const p = new THREE.Points(geo, mat);
      scene.add(p);
      stars.push(p);
      return p;
    };

    addStarField(8000, 0.3, [200, 800], 0xffffff, 0.3);
    addStarField(3000, 0.6, [100, 600], 0xaaaaff, 0.4);

    // 2. NEBULA CORE
    const nebulaCount = 1000;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    for(let i=0; i<nebulaCount; i++) {
        const r = 30 + Math.random() * 120;
        const t = Math.random() * Math.PI * 2;
        const p = Math.random() * Math.PI;
        nebulaPos[i*3] = r * Math.sin(p) * Math.cos(t);
        nebulaPos[i*3+1] = r * Math.sin(p) * Math.sin(t) * 0.4; // Flatter nebula
        nebulaPos[i*3+2] = r * Math.cos(p);
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    const nebulaMat = new THREE.PointsMaterial({ size: 25, map: tex, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, color: 0x4422ff });
    const nebulaParticles = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaParticles);

    // 3. PLANET SPHERE
    const planetCount = 45000;
    const planetGeo = new THREE.BufferGeometry();
    const planetPos = new Float32Array(planetCount * 3);
    const planetSizes = new Float32Array(planetCount);
    for (let i = 0; i < planetCount; i++) {
      const radius = 5;
      const isShell = Math.random() > 0.1; // 90% on the shell
      const r = isShell ? radius + (Math.random() - 0.5) * 0.12 : Math.random() * radius;
      const phi = Math.acos(-1 + 2 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      planetPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      planetPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      planetPos[i*3+2] = r * Math.cos(phi);
      planetSizes[i] = (Math.random() * 0.4 + 0.1) * (isShell ? 2.5 : 1.0);
    }
    planetGeo.setAttribute('position', new THREE.BufferAttribute(planetPos, 3));
    planetGeo.setAttribute('size', new THREE.BufferAttribute(planetSizes, 1));
    const planetMat = new THREE.PointsMaterial({ size: 0.18, map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(planetColor) });
    const planetParticles = new THREE.Points(planetGeo, planetMat);
    scene.add(planetParticles);

    // 4. SPECTRAL RINGS
    const createRing = (inner: number, outer: number, count: number, tilt: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = inner + Math.random() * (outer - inner);
        const theta = Math.random() * Math.PI * 2;
        pos[i*3] = r * Math.cos(theta);
        pos[i*3+1] = (Math.random() - 0.5) * 0.08;
        pos[i*3+2] = r * Math.sin(theta);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size: 0.12, color: new THREE.Color(ringColor), map: tex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.6, depthWrite: false });
      const points = new THREE.Points(geo, mat);
      points.rotation.x = tilt;
      return points;
    };
    const innerRing = createRing(7, 10, 10000, Math.PI / 4);
    const outerRing = createRing(11.5, 16, 15000, Math.PI / 4 + 0.1);
    scene.add(innerRing);
    scene.add(outerRing);

    sceneRef.current = {
      scene, camera, renderer, planetParticles, innerRing, outerRing, nebulaParticles, stars,
      targetDistance: 25, targetRotation: 0, currentDistance: 25, currentRotation: 0,
      lastHandDepth: 0.1, zoomDuration: 0, currentGesture: 'none'
    };

    const animate = () => {
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      const time = Date.now() * 0.001;

      s.planetParticles.rotation.y += 0.0015;
      s.innerRing.rotation.y -= 0.0005;
      s.outerRing.rotation.y -= 0.0002;
      s.nebulaParticles.rotation.y += 0.00005;

      // Twinkle Stars
      s.stars.forEach((field, idx) => {
        const mat = field.material as THREE.PointsMaterial;
        mat.opacity = 0.2 + 0.2 * Math.sin(time * (idx + 1) * 0.5);
      });

      // Camera Physics
      s.currentDistance += (s.targetDistance - s.currentDistance) * 0.08;
      s.currentRotation += (s.targetRotation - s.currentRotation) * 0.06;
      
      // Hard limits to keep view sensible
      s.targetDistance = Math.max(8, Math.min(250, s.targetDistance));

      s.camera.position.set(
        s.currentDistance * Math.sin(s.currentRotation),
        s.currentDistance * 0.15, // Slight top-down angle
        s.currentDistance * Math.cos(s.currentRotation)
      );
      s.camera.lookAt(0, 0, 0);

      s.renderer.render(s.scene, s.camera);
      requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      s.camera.aspect = window.innerWidth / window.innerHeight;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (mountRef.current) mountRef.current.innerHTML = '';
      sceneRef.current = null;
    };
  }, []);

  // Sync colors
  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    (s.planetParticles.material as THREE.Points