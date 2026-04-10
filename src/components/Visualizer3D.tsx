import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Scroll, ContactShadows, useTexture, useGLTF, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';

const Avatar = ({ position }: { position: [number, number, number] }) => {
  const { scene, animations } = useGLTF('/avatar.glb');
  const { actions } = useAnimations(animations, scene);
  const avatarRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  React.useEffect(() => {
    // Play the first animation found in the file
    const firstAction = Object.keys(actions)[0];
    if (firstAction && actions[firstAction]) {
      actions[firstAction]?.play();
    }
  }, [actions]);

  useFrame(() => {
    if (!avatarRef.current) return;
    // Strictly appear at p=4.0 (Section 3: Grenzenlose Möglichkeiten)
    const t = scroll.offset;
    const p = t * 10;
    const appearScale = MathUtils.clamp((p - 4.0) / 0.3, 0, 1);
    avatarRef.current.scale.setScalar(0.6 * appearScale);
  });

  return (
    <group ref={avatarRef}>
      <primitive object={scene} position={position} />
    </group>
  );
};

const AnimatedCube = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();
  const { scene } = useGLTF('/cube_finx_1.glb');

  useFrame(() => {
    if (!groupRef.current) return;

    const t = scroll.offset;
    const p = t * 10; 

    // Transition stages mapped to pages
    const s1 = MathUtils.clamp(p / 1.5, 0, 1);
    const s2 = MathUtils.clamp((p - 1.5) / 1.5, 0, 1);
    const s3 = MathUtils.clamp((p - 6.5) / 2.0, 0, 1);
    const s4 = MathUtils.clamp((p - 4.5) / 1.5, 0, 1); // Delayed rotation (wait after avatar appears)
    
    const visibilityScale = MathUtils.clamp((8.8 - p) / 0.4, 0, 1);

    // Scaling logic: Shrink to fit inside the phone screen
    const baseScale = s1 < 1 
      ? MathUtils.lerp(0.1, 1.2, s1) 
      : MathUtils.lerp(1.2, 0.22, s2); // Dramatic shrink to fix inside iPhone screen
    
    groupRef.current.scale.setScalar(baseScale * visibilityScale);
    
    // Position logic: Move and scale to match iPhone's final position (z=2.55 approx)
    groupRef.current.position.z = MathUtils.lerp(0, 2.55, s2);
    groupRef.current.position.x = 0;
    groupRef.current.position.y = 0;

    // Rotation logic
    const rotX1 = MathUtils.lerp(0, Math.PI * 0.5, s1);
    const rotXReset = MathUtils.lerp(0, Math.PI * 0.5, s2);
    groupRef.current.rotation.x = rotX1 - rotXReset;

    const rotY1 = MathUtils.lerp(0, Math.PI, s1);
    const rotY2 = MathUtils.lerp(0, Math.PI / 2, s2);
    const rotY3 = MathUtils.lerp(0, 4 * Math.PI, s3);
    const rotY4 = MathUtils.lerp(0, 2 * Math.PI, s4); // Slow 360 rotation during Section 3
    groupRef.current.rotation.y = rotY1 + rotY2 + rotY3 + rotY4;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      <Avatar position={[0, 0.5, 0]} />
    </group>
  );
};

useGLTF.preload('/cube_finx_1.glb');
useGLTF.preload('/avatar.glb');

const IphonePerspective = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 10;
    const s_total = MathUtils.clamp((p - 1.0) / 2.5, 0, 1);
    
    // Visibility: disappear before the video
    const visibilityScale = MathUtils.clamp((8.8 - p) / 0.4, 0, 1);

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
    const p = t * 10;
    // Fade in cubes as we transition to Contact section
    const intensity = MathUtils.clamp((p - 8.5) / 1.0, 0, 1);
    
    cubeData.forEach((pData: { x: number, y: number, z: number, speed: number, rotSpeed: number }, i: number) => {
      const scrollOffset = MathUtils.clamp((p - 8.5) / 1.5, 0, 1);
      // Project move towards camera
      const currentZ = pData.z + (scrollOffset * 40 * pData.speed);
      
      dummy.position.set(pData.x, pData.y, currentZ);
      dummy.rotation.set(
        state.clock.elapsedTime * pData.rotSpeed,
        state.clock.elapsedTime * pData.rotSpeed * 1.5,
        state.clock.elapsedTime * pData.rotSpeed * 0.5
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
        color="#8b5cf6" 
        roughness={0.1} 
        metalness={0.5} 
        transparent 
        opacity={0.35} 
        emissive="#8b5cf6"
        emissiveIntensity={0.6}
      />
    </instancedMesh>
  );
};

const ScrollContent = () => {
  const scroll = useScroll();
  const pinRef = useRef<HTMLDivElement>(null!);
  const pinRef2 = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!pinRef.current || !pinRef2.current) return;
    const t = scroll.offset;
    const p = t * 10; // 11 pages = max scroll 10
    
    // We pin Section 2 between p=1 and p=3
    const pinVal1 = MathUtils.clamp(p - 1, 0, 2) * 100;
    const opacity1 = 1 - MathUtils.clamp((p - 3.2) / 0.5, 0, 1);
    pinRef.current.style.transform = `translateY(${pinVal1}vh)`;
    pinRef.current.style.opacity = `${opacity1}`;
    pinRef.current.style.pointerEvents = p > 3.5 ? 'none' : 'auto';

    // We pin Section 3 between p=4 and p=6
    const pinVal2 = MathUtils.clamp(p - 4, 0, 2) * 100;
    const opacity2 = 1 - MathUtils.clamp((p - 6.2) / 0.5, 0, 1);
    pinRef2.current.style.transform = `translateY(${pinVal2}vh)`;
    pinRef2.current.style.opacity = `${opacity2}`;
    pinRef2.current.style.pointerEvents = p > 6.5 ? 'none' : 'auto';
  });

  return (
    <Scroll html>
      {/* Section 1: Hero */}
      <div className="scroll-section">
        <div className="content-wrapper hero-content">
          <span className="subheadline">Launchpad Experiences</span>
          <h1>Mixed Reality</h1>
          <p className="body-text">
            Wir transformieren digitale Interaktion in immersive physische Erlebnisse. <strong>Das nächste Level</strong> von Consulting und Marketing beginnt hier.
          </p>
        </div>
      </div>

      {/* Section 2: Core Philosophy (PINNED) */}
      <div className="scroll-section">
        <div 
          ref={pinRef}
          className="content-wrapper pinned-content"
        >
          <h2>Intuitive Interaktion.</h2>
          <p className="body-text">
            Erleben Sie Inhalte nicht nur visuell, sondern greifbar. Nutzer tauchen unmittelbar in interaktive Welten ein – direkt per Smartphone, ohne Barrieren.
          </p>
          <div className="key-message">
            Emotional. Verständlich. Nachhaltig.
          </div>
        </div>
      </div>

      {/* Spacer for pinning (2 screens as requested) */}
      <div style={{ height: '200vh' }} />

      {/* Section 3: Einsatzmöglichkeiten (PINNED) */}
      <div className="scroll-section">
        <div 
          ref={pinRef2}
          className="content-wrapper pinned-content"
        >
          <h2>Grenzenlose Möglichkeiten.</h2>
          <p className="body-text">
            Ob im <strong>Vertrieb</strong>, im <strong>Recruiting</strong> oder auf <strong>Events</strong>: Wir schaffen unvergessliche Erlebnisse, die Ihre Botschaft nachhaltig verankern.
          </p>
        </div>
      </div>

      {/* Spacer for Section 3 pinning (2 screens) */}
      <div style={{ height: '200vh' }} />

      {/* Section 4: Anwendungsmöglichkeiten (CENTERED) */}
      <div className="scroll-section centered-section">
        <div className="content-wrapper">
          <h2>Anwendungsmöglichkeiten</h2>
          <div className="applications-grid">
            <div className="application-card">
              <h3>Beratung</h3>
              <p>Physische Anker für komplexe technische Erklärungen.</p>
            </div>
            <div className="application-card">
              <h3>Marketing</h3>
              <p>Interaktive Social Media Kampagnen mit AR-Veredelung.</p>
            </div>
            <div className="application-card">
              <h3>Print</h3>
              <p>Verwandeln Sie Flyer und Visitenkarten in digitale Erlebnisse.</p>
            </div>
            <div className="application-card">
              <h3>Events</h3>
              <p>Unvergessliche Schnitzeljagden und Führungen direkt vor Ort.</p>
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
              <div className="benefit-text">
                <h4>Echtes erleben.</h4>
                <p>Interaktion statt bloßer Erklärung.</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-text">
                <h4>Fokussierte Aufmerksamkeit.</h4>
                <p>Neugier als treibende Kraft.</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-text">
                <h4>Perfekt integriert.</h4>
                <p>Nahtlos in Ihrer Customer Journey.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Abschluss */}
      <section className="scroll-section contact-section">
        <div className="content-wrapper">
          <span className="subheadline">Bereit für die nächste Dimension?</span>
          <h2>Der Würfel als innovativer Einstiegspunkt in Ihre digitale Welt.</h2>
          <button className="cta-button">
            Jetzt erleben o Demo anfragen
          </button>
        </div>
      </section>

      <div style={{ height: '100vh' }} />
    </Scroll>
  );
};

const Visualizer3D: React.FC = () => {
  return (
    <div className="visualizer-container">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={1.5} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={2.5} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={3} color="#7c3aed" />
        <pointLight position={[5, -5, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[0, 5, 5]} intensity={1.5} />
        
        <Environment preset="city" />
        
        <ScrollControls pages={11} damping={0.1}>
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
