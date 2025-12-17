'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Globe parameters
    const globeRadius = 100;
    const dotCount = 3000;

    // Create globe dots (point cloud)
    const dotGeometry = new THREE.BufferGeometry();
    const dotPositions: number[] = [];
    const dotColors: number[] = [];
    const dotSizes: number[] = [];

    // Generate dots on sphere surface with land mass distribution
    for (let i = 0; i < dotCount; i++) {
      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - 2 * (i + 0.5) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = globeRadius * Math.sin(phi) * Math.cos(theta);
      const y = globeRadius * Math.sin(phi) * Math.sin(theta);
      const z = globeRadius * Math.cos(phi);

      dotPositions.push(x, y, z);

      // Color variation - emerald/teal theme
      const colorVariation = Math.random() * 0.3;
      dotColors.push(
        0.1 + colorVariation * 0.2,  // R
        0.8 + colorVariation * 0.2,  // G
        0.6 + colorVariation * 0.3   // B
      );

      // Size variation
      dotSizes.push(1.5 + Math.random() * 1.5);
    }

    dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));
    dotGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dotColors, 3));
    dotGeometry.setAttribute('size', new THREE.Float32BufferAttribute(dotSizes, 1));

    // Custom shader for dots
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
          
          // Pulsing effect
          float pulse = sin(time * 2.0 + position.x * 0.05) * 0.5 + 0.5;
          vAlpha = 0.4 + pulse * 0.4;
          
          gl_PointSize = size * (200.0 / -mvPosition.z) * (0.8 + pulse * 0.2);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const globeDots = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(globeDots);

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
    ];

    // Convert lat/lng to 3D position
    const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    // Create city nodes
    const cityPositions: THREE.Vector3[] = cities.map(city => 
      latLngToVector3(city.lat, city.lng, globeRadius + 2)
    );

    const cityGeometry = new THREE.BufferGeometry();
    const cityPosArray: number[] = [];
    cityPositions.forEach(pos => cityPosArray.push(pos.x, pos.y, pos.z));
    cityGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cityPosArray, 3));

    const cityMaterial = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 6,
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
    const createTransactionCurve = (start: THREE.Vector3, end: THREE.Vector3): THREE.CatmullRomCurve3 => {
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      mid.normalize().multiplyScalar(globeRadius + distance * 0.3);
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
        speed: 0.005 + Math.random() * 0.01,
        color: new THREE.Color().setHSL(0.45 + Math.random() * 0.1, 0.8, 0.6),
      });
    };

    // Initial transactions
    for (let i = 0; i < 5; i++) {
      spawnTransaction();
    }

    // Floating particles (representing crypto/data)
    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = globeRadius + 20 + Math.random() * 80;

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);

      particleVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ));
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 1.5,
      transparent: true,
      opacity: 0.4,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Animation
    let time = 0;
    let lastSpawn = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.01;

      // Update shader time
      dotMaterial.uniforms.time.value = time;

      // Rotate globe slowly
      globeDots.rotation.y += 0.001;
      cityNodes.rotation.y += 0.001;
      transactionGroup.rotation.y += 0.001;

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
        const points = curve.getPoints(50);
        
        // Only show portion of curve based on progress
        const visiblePoints = points.slice(0, Math.floor(tx.progress * points.length));
        
        if (visiblePoints.length > 1) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(visiblePoints);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: tx.color,
            transparent: true,
            opacity: 0.6,
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          transactionGroup.add(line);

          // Add moving dot at the head
          const headPos = curve.getPoint(tx.progress);
          const headGeometry = new THREE.SphereGeometry(2, 8, 8);
          const headMaterial = new THREE.MeshBasicMaterial({
            color: tx.color,
            transparent: true,
            opacity: 0.9,
          });
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.copy(headPos);
          transactionGroup.add(head);
        }
      }

      // Spawn new transactions periodically
      if (time - lastSpawn > 1) {
        spawnTransaction();
        lastSpawn = time;
      }

      // Update floating particles
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVelocities[i].x;
        positions[i * 3 + 1] += particleVelocities[i].y;
        positions[i * 3 + 2] += particleVelocities[i].z;

        // Keep particles in bounds
        const dist = Math.sqrt(
          positions[i * 3] ** 2 + 
          positions[i * 3 + 1] ** 2 + 
          positions[i * 3 + 2] ** 2
        );
        
        if (dist > globeRadius + 150 || dist < globeRadius + 10) {
          particleVelocities[i].multiplyScalar(-1);
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Gentle camera movement
      camera.position.x = Math.sin(time * 0.1) * 30;
      camera.position.y = Math.cos(time * 0.15) * 20;
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
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
    />
  );
}
