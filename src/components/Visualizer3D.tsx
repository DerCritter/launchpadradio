import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Scroll, ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';

const AnimatedCube = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!meshRef.current) return;

    const t = scroll.offset;

    // Transition stages
    const s1 = MathUtils.clamp(t / 0.2, 0, 1);
    const s2 = MathUtils.clamp((t - 0.2) / 0.2, 0, 1);
    const s3 = MathUtils.clamp((t - 0.6) / 0.3, 0, 1);
    
    // Visibility: disappear after stage 2 (during card section entry)
    const visibilityScale = MathUtils.clamp((0.625 - t) / 0.05, 0, 1);

    // Scaling logic
    const baseScale = s1 < 1 
      ? MathUtils.lerp(0.1, 1.5, s1) 
      : MathUtils.lerp(1.5, 1.0, s2);
    
    meshRef.current.scale.setScalar(baseScale * visibilityScale);

    // Position logic: Keep centered (0)
    meshRef.current.position.x = 0;

    // Rotation logic
    const rotX1 = MathUtils.lerp(0, Math.PI, s1);
    const rotXReset = MathUtils.lerp(0, Math.PI, s2);
    meshRef.current.rotation.x = rotX1 - rotXReset;

    const rotY1 = MathUtils.lerp(0, Math.PI, s1);
    const rotY2 = MathUtils.lerp(0, Math.PI / 2, s2);
    const rotY3 = MathUtils.lerp(0, 2 * Math.PI, s3);
    meshRef.current.rotation.y = rotY1 + rotY2 + rotY3;
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color="#0a0a0a" 
        roughness={0.15} 
        metalness={0.4} 
        emissive="#7c3aed"
        emissiveIntensity={0.08}
      />
    </mesh>
  );
};

const IphonePerspective = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const s_total = MathUtils.clamp((t - 0.16) / 0.34, 0, 1);
    
    // Visibility: disappear at the start of the grid transition
    const visibilityScale = MathUtils.clamp((0.625 - t) / 0.05, 0, 1);

    groupRef.current.position.x = 0;
    groupRef.current.position.z = MathUtils.lerp(7, 2.5, s_total);
    const targetScale = MathUtils.lerp(15, 1.58, s_total) * visibilityScale;
    groupRef.current.scale.setScalar(targetScale);
  });

  const texture = useTexture('/iphone-v3.png');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipMapLinearFilter;

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[0.4825, 1]} />
        <meshBasicMaterial map={texture} transparent={true} opacity={1} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Background Cubes Component
const FloatingCubes = ({ count = 80 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const scroll = useScroll();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const cubeData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        x: (Math.random() - 0.5) * 18,
        y: (Math.random() - 0.5) * 12,
        z: Math.random() * -25 - 5,
        speed: 0.8 + Math.random() * 2.5,
        rotSpeed: 0.005 + Math.random() * 0.015
      });
    }
    return data;
  }, [count]);

  useFrame((state) => {
    const t = scroll.offset;
    // Fade in cubes as we transition
    const intensity = MathUtils.clamp((t - 0.6) / 0.15, 0, 1);
    
    cubeData.forEach((p: { x: number, y: number, z: number, speed: number, rotSpeed: number }, i: number) => {
      const scrollOffset = MathUtils.clamp((t - 0.7) / 0.3, 0, 1);
      // Project move towards camera
      const currentZ = p.z + (scrollOffset * 40 * p.speed);
      
      dummy.position.set(p.x, p.y, currentZ);
      dummy.rotation.set(
        state.clock.elapsedTime * p.rotSpeed,
        state.clock.elapsedTime * p.rotSpeed * 1.5,
        state.clock.elapsedTime * p.rotSpeed * 0.5
      );
      dummy.scale.setScalar(intensity * 0.25);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color="#7c3aed" 
        roughness={0.2} 
        metalness={0.7} 
        transparent 
        opacity={0.4} 
        emissive="#7c3aed"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

const ScrollContent = () => {
  const scroll = useScroll();
  const pinRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!pinRef.current) return;
    const t = scroll.offset;
    // Section 2 enters fully at t*8=1. 
    // We pin it between t*8=1 and t*8=2 (one full screen length).
    const pinVal = MathUtils.clamp(t * 8 - 1, 0, 1) * 100;
    const opacity = 1 - MathUtils.clamp((t * 8 - 2.5) / 0.5, 0, 1);
    
    pinRef.current.style.transform = `translateY(${pinVal}vh)`;
    pinRef.current.style.opacity = `${opacity}`;
    pinRef.current.style.pointerEvents = t * 8 > 3 ? 'none' : 'auto';
  });

  return (
    <Scroll html>
      {/* Section 1: Hero */}
      <div className="scroll-section">
        <div className="content-wrapper hero-content">
          <h1>LAUNCHPAD</h1>
          <p className="subheadline">Mixed Reality Erfahrungen</p>
          <p className="body-text">
            Wir transformieren digitale Interaktion in immersive physische Erlebnisse. Das nächste Level von Consulting und Marketing beginnt hier.
          </p>
        </div>
      </div>

      {/* Section 2: Core Philosophy (PINNED) */}
      <div className="scroll-section">
        <div 
          ref={pinRef}
          className="content-wrapper pinned-content"
        >
          <h2>Eine neue Form der Kommunikation</h2>
          <p className="body-text">
            Inhalte werden nicht mehr nur erklärt, sondern direkt erlebbar gemacht. Ob im Vertrieb, Recruiting oder Marketing: Nutzer tauchen unmittelbar in interaktive Inhalte ein – einfach per Smartphone, intuitiv und jederzeit einsetzbar.
          </p>
          <div className="key-message">
            Emotional, verständlich und nachhaltig vermittelt.
          </div>
        </div>
      </div>

      {/* Spacer for pinning (1 page) */}
      <div style={{ height: '100vh' }} />

      {/* Section 3: Einsatzmöglichkeiten (RESTORED) */}
      <div className="scroll-section">
        <div className="content-wrapper">
          <h2>Einsatzmöglichkeiten</h2>
          <div className="body-text">
            <p>• <strong>Vertrieb & Sales</strong>: Emotionale Kundenansprache und Produktpräsentation.</p>
            <p>• <strong>Recruiting & HR</strong>: Ein innovativer Standard für das moderne Employer Branding.</p>
            <p>• <strong>Event & Messe</strong>: Unvergessliche, interaktive Erlebnisse direkt vor Ort.</p>
          </div>
        </div>
      </div>

      {/* Section 4: Anwendungsmöglichkeiten (CENTERED) */}
      <div className="scroll-section centered-section">
        <div className="content-wrapper">
          <h2>Anwendungsmöglichkeiten</h2>
          <div className="applications-grid">
            <div className="application-card">
              <h3>Beratungstool</h3>
              <p>Würfel, Haus oder Kärtchen für technische Erklärungen.</p>
            </div>
            <div className="application-card">
              <h3>Marketing & Social Media</h3>
              <p>Postveredelung und interaktive Kampagnen.</p>
            </div>
            <div className="application-card">
              <h3>Print-Medien</h3>
              <p>Animation von Flyern und Visitenkarten.</p>
            </div>
            <div className="application-card">
              <h3>Digitale Führungen</h3>
              <p>AR Schnitzeljagd für Events und Messen.</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '100vh' }} />

      {/* Section 5: Highlights (VIDEO) */}
      <section className="video-section">
        <iframe 
          src="https://player.vimeo.com/video/1181282543?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1" 
          frameBorder="0" 
          allow="autoplay; fullscreen" 
          className="video-background"
          title="cube_1"
        />
        <div className="content-wrapper" style={{ zIndex: 2 }}>
          <h2 className="section-title-alt">Highlights: Warum AR Würfel?</h2>
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon" />
              <span><strong>Erleben statt erklären</strong>: Direkte Interaktion.</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon" />
              <span><strong>Maximale Aufmerksamkeit</strong>: Neugier als Anker.</span>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon" />
              <span><strong>Nahtlose Integration</strong>: Perfekt für die Customer Journey.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Abschluss */}
      <div className="scroll-section centered-section">
        <div className="content-wrapper">
          <h2 className="section-title-alt">Bereit für die nächste Dimension?</h2>
          <p className="body-text">
            Der Würfel als innovativer Einstiegspunkt in Ihre digitale Welt.
          </p>
          <div className="cta-container">
            <button className="cta-button" onClick={() => window.location.href = '#contact'}>
              Jetzt erleben o Demo anfragen
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: '100vh' }} />
    </Scroll>
  );
};

const Visualizer3D: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={2} color="#7c3aed" />
        <pointLight position={[5, -5, 5]} intensity={0.5} color="#ffffff" />
        
        <ScrollControls pages={8} damping={0.1}>
          <FloatingCubes />
          <AnimatedCube />
          <IphonePerspective />
          <ScrollContent />

          <ContactShadows 
            position={[0, -1.5, 0]} 
            opacity={0.15} 
            scale={12} 
            blur={3} 
            far={4.5} 
          />
        </ScrollControls>
      </Canvas>
    </div>
  );
};

export default Visualizer3D;
