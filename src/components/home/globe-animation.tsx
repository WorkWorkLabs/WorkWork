'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Simplified land coordinates for checking if a point is on land
// Format: [minLng, maxLng, minLat, maxLat]
const landRegions: [number, number, number, number][] = [
  // North America
  [-170, -50, 25, 72],
  [-130, -60, 45, 85],
  // Central America
  [-120, -75, 7, 35],
  // South America
  [-82, -34, -56, 12],
  // Europe
  [-10, 40, 35, 72],
  // Africa
  [-18, 52, -35, 37],
  // Middle East
  [25, 75, 12, 45],
  // Russia/Asia
  [25, 180, 40, 78],
  // India
  [68, 98, 6, 36],
  // Southeast Asia
  [92, 142, -10, 28],
  // China/Japan/Korea
  [100, 145, 18, 55],
  // Australia
  [112, 155, -45, -10],
  // New Zealand
  [165, 180, -48, -34],
  // Indonesia
  [95, 141, -11, 6],
  // UK/Ireland
  [-11, 2, 50, 60],
  // Iceland
  [-25, -12, 63, 67],
  // Greenland
  [-75, -10, 59, 84],
  // Madagascar
  [43, 51, -26, -12],
  // Japan
  [128, 146, 30, 46],
  // Philippines
  [116, 127, 5, 20],
  // Taiwan
  [119, 122, 21, 26],
  // Sri Lanka
  [79, 82, 6, 10],
  // Caribbean
  [-85, -59, 10, 28],
];

// Check if a lat/lng point is on land (simplified)
function isOnLand(lat: number, lng: number): boolean {
  for (const [minLng, maxLng, minLat, maxLat] of landRegions) {
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      return true;
    }
  }
  return false;
}

interface Transaction {
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
  speed: number;
  color: THREE.Color;
}

export function GlobeAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 280;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Globe parameters
    const globeRadius = 100;

    // Convert lat/lng to 3D position
    const latLngToVector3 = (
      lat: number,
      lng: number,
      radius: number
    ): THREE.Vector3 => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    // Create ocean dots (only where there's NO land)
    const dotGeometry = new THREE.BufferGeometry();
    const dotPositions: number[] = [];
    const dotColors: number[] = [];
    const dotSizes: number[] = [];

    // Generate dots using lat/lng grid
    const latStep = 2.5;
    const lngStep = 2.5;

    for (let lat = -85; lat <= 85; lat += latStep) {
      // Adjust longitude step based on latitude for even distribution
      const adjustedLngStep = lngStep / Math.cos((lat * Math.PI) / 180);
      
      for (let lng = -180; lng < 180; lng += Math.max(adjustedLngStep, lngStep)) {
        // Only add dot if it's NOT on land (ocean only)
        if (!isOnLand(lat, lng)) {
          const pos = latLngToVector3(lat, lng, globeRadius);
          dotPositions.push(pos.x, pos.y, pos.z);

          // Ocean color - blue/cyan theme (darker for light background)
          const colorVariation = Math.random() * 0.2;
          dotColors.push(
            0.2 + colorVariation * 0.1, // R
            0.4 + colorVariation * 0.2, // G
            0.6 + colorVariation * 0.2 // B
          );

          // Size variation
          dotSizes.push(1.2 + Math.random() * 0.8);
        }
      }
    }

    dotGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(dotPositions, 3)
    );
    dotGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(dotColors, 3)
    );
    dotGeometry.setAttribute(
      'size',
      new THREE.Float32BufferAttribute(dotSizes, 1)
    );

    // Custom shader for ocean dots
    const dotMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Gentle wave effect
          float wave = sin(time * 1.5 + position.x * 0.03 + position.y * 0.03) * 0.5 + 0.5;
          vAlpha = 0.4 + wave * 0.3;
          
          gl_PointSize = size * (180.0 / -mvPosition.z) * (0.9 + wave * 0.1);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const oceanDots = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(oceanDots);

    // Add subtle globe outline
    const outlineGeometry = new THREE.SphereGeometry(globeRadius - 0.5, 64, 64);
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.5,
    });
    const globeOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    scene.add(globeOutline);

    // City nodes (major digital nomad hubs)
    const cities = [
      { lat: 40.7128, lng: -74.006, name: 'New York' },
      { lat: 51.5074, lng: -0.1278, name: 'London' },
      { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
      { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
      { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
      { lat: -8.4095, lng: 115.1889, name: 'Bali' },
      { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
      { lat: 38.7223, lng: -9.1393, name: 'Lisbon' },
      { lat: 52.52, lng: 13.405, name: 'Berlin' },
      { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
      { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
      { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      { lat: 37.5665, lng: 126.978, name: 'Seoul' },
    ];

    const cityPositions: THREE.Vector3[] = cities.map((city) =>
      latLngToVector3(city.lat, city.lng, globeRadius + 1)
    );

    // City points with glow
    const cityGeometry = new THREE.BufferGeometry();
    const cityPosArray: number[] = [];
    cityPositions.forEach((pos) => cityPosArray.push(pos.x, pos.y, pos.z));
    cityGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(cityPosArray, 3)
    );

    const cityMaterial = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 4,
      transparent: true,
      opacity: 0.9,
    });

    const cityNodes = new THREE.Points(cityGeometry, cityMaterial);
    scene.add(cityNodes);

    // Transaction lines (crypto payments flowing between cities)
    const transactions: Transaction[] = [];
    const transactionGroup = new THREE.Group();
    scene.add(transactionGroup);

    // Create curved line between two points
    const createTransactionCurve = (
      start: THREE.Vector3,
      end: THREE.Vector3
    ): THREE.CatmullRomCurve3 => {
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      mid.normalize().multiplyScalar(globeRadius + distance * 0.25);
      return new THREE.CatmullRomCurve3([start, mid, end]);
    };

    // Spawn new transaction
    const spawnTransaction = () => {
      const startIdx = Math.floor(Math.random() * cityPositions.length);
      let endIdx = Math.floor(Math.random() * cityPositions.length);
      while (endIdx === startIdx) {
        endIdx = Math.floor(Math.random() * cityPositions.length);
      }

      transactions.push({
        start: cityPositions[startIdx].clone(),
        end: cityPositions[endIdx].clone(),
        progress: 0,
        speed: 0.008 + Math.random() * 0.008,
        color: new THREE.Color().setHSL(0.45 + Math.random() * 0.15, 0.9, 0.55),
      });
    };

    // Initial transactions
    for (let i = 0; i < 4; i++) {
      spawnTransaction();
    }

    // Animation
    let time = 0;
    let lastSpawn = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.01;

      // Update shader time
      dotMaterial.uniforms.time.value = time;

      // Rotate globe slowly
      const rotationSpeed = 0.0008;
      oceanDots.rotation.y += rotationSpeed;
      globeOutline.rotation.y += rotationSpeed;
      cityNodes.rotation.y += rotationSpeed;
      transactionGroup.rotation.y += rotationSpeed;

      // Update transactions
      transactionGroup.children = [];

      for (let i = transactions.length - 1; i >= 0; i--) {
        const tx = transactions[i];
        tx.progress += tx.speed;

        if (tx.progress >= 1) {
          transactions.splice(i, 1);
          continue;
        }

        // Draw transaction arc
        const curve = createTransactionCurve(tx.start, tx.end);
        const points = curve.getPoints(40);

        // Only show portion of curve based on progress
        const visiblePoints = points.slice(
          0,
          Math.floor(tx.progress * points.length)
        );

        if (visiblePoints.length > 1) {
          const lineGeometry =
            new THREE.BufferGeometry().setFromPoints(visiblePoints);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: tx.color,
            transparent: true,
            opacity: 0.6,
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          transactionGroup.add(line);

          // Add moving dot at the head
          const headPos = curve.getPoint(tx.progress);
          const headGeometry = new THREE.SphereGeometry(1.5, 8, 8);
          const headMaterial = new THREE.MeshBasicMaterial({
            color: tx.color,
            transparent: true,
            opacity: 0.95,
          });
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.copy(headPos);
          transactionGroup.add(head);
        }
      }

      // Spawn new transactions periodically
      if (time - lastSpawn > 1.2) {
        spawnTransaction();
        lastSpawn = time;
      }

      // Gentle camera movement
      camera.position.x = Math.sin(time * 0.06) * 35;
      camera.position.y = Math.cos(time * 0.08) * 25 + 15;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10"
      style={{
        background:
          'radial-gradient(ellipse at center, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
      }}
    />
  );
}
