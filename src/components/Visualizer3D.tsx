import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Scroll, ContactShadows, useTexture, useGLTF, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';

const Avatar = ({ position }: { position: [number, number, number] }) => {
  const { scene, animations } = useGLTF('/avatar_2.glb');
  const { actions } = useAnimations(animations, scene);
  const avatarRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  // Offsets to align the base of the feet on the surface and center it in XZ
  const offsets = useMemo(() => {
    // Force matrix update to get current geometry positions
    scene.updateMatrixWorld(true);
    
    // Ensure all materials have depthTest enabled to prevent transparency glitches
    scene.traverse((obj) => {
      // Hide shadow planes or ground planes that might be in the model
      if (obj.name.toLowerCase().includes('plane') || obj.name.toLowerCase().includes('floor') || obj.name.toLowerCase().includes('shadow')) {
        obj.visible = false;
      }

      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false; // Prevents self-shadowing artifacts
        mesh.renderOrder = 10; // Ensure Avatar is drawn AFTER the cube
        
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            mat.depthTest = true;
            // Only force depthWrite for opaque materials to avoid culling artifacts in hair/eyes
            if (!mat.transparent) {
              mat.depthWrite = true;
            }
            // Use a much lighter offset to prevent internal avatar mesh conflicts
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = -0.1;
            mat.polygonOffsetUnits = -0.1;
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    
    // Centering in X and Z
    const targetX = -(box.max.x + box.min.x) / 2;
    const targetZ = -(box.max.z + box.min.z) / 2;
    
    // Vertical alignment using the absolute lowest point (feet)
    const targetY = -box.min.y;

    return { x: targetX, y: targetY, z: targetZ };
  }, [scene]);

  React.useEffect(() => {
    const action = actions['mixamo.com.001'];
    if (action) {
      action.play();
    } else {
      const firstAction = Object.keys(actions)[0];
      if (firstAction && actions[firstAction]) actions[firstAction]?.play();
    }
  }, [actions]);

  useFrame(() => {
    if (!avatarRef.current) return;
    const t = scroll.offset;
    const p = t * 15;
    
    // Synced with Section 3 Pinned: starts at p=5.0 (shifted from 4.0)
    // It fades out exactly when the iPhone fades out (p=7.0)
    const appearState = MathUtils.clamp((p - 5.0) / 0.8, 0, 1);
    const fadeOutState = 1 - MathUtils.clamp((p - 7.0) / 0.5, 0, 1);
    const finalScale = 0.86 * appearState * fadeOutState;
    avatarRef.current.scale.setScalar(finalScale);
    avatarRef.current.visible = finalScale > 0.001;
  });

  return (
    <group ref={avatarRef} position={position}>
      <primitive object={scene} position={[offsets.x, offsets.y, offsets.z]} />
    </group>
  );
};

const AnimatedCube = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const immRef = useRef<THREE.Group>(null!);
  const baseRef = useRef<THREE.Group>(null!);
  const fesRef = useRef<THREE.Group>(null!);
  const ulmRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();
  
  const { scene: immScene } = useGLTF('/cube_immblend.glb');
  const { scene: baseScene } = useGLTF('/cube_finx_2.glb');
  const { scene: fesScene } = useGLTF('/cube_fes.glb');
  const { scene: ulmScene } = useGLTF('/cube_ulm.glb');
  
  const immMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const baseMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const fesMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const ulmMats = useRef<THREE.MeshStandardMaterial[]>([]);

  // Setup helper for scenes
  const setupScene = (
    scene: THREE.Group, 
    matArrayRef: React.MutableRefObject<THREE.MeshStandardMaterial[]>, 
    initialOpacity: number,
    polyOffset: number
  ) => {
    // Clear array to prevent duplicates in strict mode re-renders
    matArrayRef.current = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              if (!matArrayRef.current.includes(mat)) {
                matArrayRef.current.push(mat);
                
                // Configure materials for zero-glitch fading
                mat.transparent = true;
                mat.opacity = initialOpacity;
                mat.depthWrite = true; 
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = polyOffset;
                mat.polygonOffsetUnits = polyOffset;
              }
            }
          });
        }
      }
    });
  };

  useEffect(() => {
    // Stagger polygon offsets so overlapping cross-fading meshes never Z-fight
    setupScene(immScene, immMats, 1, 0);
    setupScene(baseScene, baseMats, 0, -1);
    setupScene(fesScene, fesMats, 0, -2);
    setupScene(ulmScene, ulmMats, 0, -3);
  }, [immScene, baseScene, fesScene, ulmScene]);

  // Dynamic height detection (using base scene as reference)
  const topY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(baseScene);
    return box.max.y;
  }, [baseScene]);

  useFrame(() => {
    if (!groupRef.current) return;

    const t = scroll.offset;
    const p = t * 15; 

    // Transition stages mapped to pages
    const s1 = MathUtils.clamp((p - 1.0) / 1.5, 0, 1);
    const s2 = MathUtils.clamp((p - 2.5) / 1.5, 0, 1);
    
    // NEW Sequence Transitions
    const s_spin1 = MathUtils.clamp((p - 5.0) / 1.5, 0, 1);  // Avatar spin (starts p=5)
    const s_iso = MathUtils.clamp((p - 7.5) / 1.0, 0, 1);    // 45-deg isometric tilt
    const s_spin2 = MathUtils.clamp((p - 8.5) / 4.5, 0, 1);  // Long spin during Section 4
    
    // Extended lifecycle: starts fading out at p = 14.0
    const visibilityScale = MathUtils.clamp((15.0 - p) / 0.5, 0, 1);

    // Scaling logic: Shrink to fit inside the phone screen
    const baseScale = p < 2.5 
      ? MathUtils.lerp(0.1, 1.2, s1) 
      : MathUtils.lerp(1.2, 0.22, s2); // Dramatic shrink to fix inside iPhone screen
    
    groupRef.current.scale.setScalar(baseScale * visibilityScale);
    
    // Position logic: starts near iPhone base (-0.3), centers to 0.0 during iso transition
    const baseCubeY = MathUtils.lerp(0, -0.3, s2);
    const isoCenteredY = MathUtils.lerp(0, 0.3, s_iso); 
    groupRef.current.position.z = MathUtils.lerp(0, 2.55, s2);
    groupRef.current.position.x = 0;
    groupRef.current.position.y = baseCubeY + isoCenteredY;

    // Rotation logic
    const rotX1 = MathUtils.lerp(0, Math.PI * 0.5, s1);
    const rotXReset = MathUtils.lerp(0, Math.PI * 0.5, s2);
    const rotXIso = MathUtils.lerp(0, Math.PI * (35 / 180), s_iso); // EXACT 35 deg pitch as requested
    groupRef.current.rotation.x = (rotX1 - rotXReset) + rotXIso;

    const rotY1 = MathUtils.lerp(0, Math.PI, s1);
    const rotY2 = MathUtils.lerp(0, Math.PI / 2, s2);
    
    // Isometric view requires a 45-degree angle in Y to corner it properly
    const rotYIso = MathUtils.lerp(0, Math.PI * 0.25, s_iso); 
    const rotYSpin1 = MathUtils.lerp(0, 2 * Math.PI, s_spin1);
    const rotYSpin2 = MathUtils.lerp(0, 2 * Math.PI, s_spin2);
    groupRef.current.rotation.y = rotY1 + rotY2 + rotYSpin1 + rotYIso + rotYSpin2;

    // Quad Cross-fade logic (Evolution stages)
    // 1. Immblend -> Finx (starts p=4.5)
    const s_fuse1 = MathUtils.clamp((p - 4.5) / 1.0, 0, 1);
    // 2. Finx -> Fes (starts p=8.0)
    const s_fuse2 = MathUtils.clamp((p - 8.0) / 1.0, 0, 1);
    // 3. Fes -> Ulm (starts p=11.5)
    const s_fuse3 = MathUtils.clamp((p - 11.5) / 1.0, 0, 1);
    
    // O(1) Fast Material Opacity Updates preventing lag 
    immMats.current.forEach(mat => mat.opacity = 1 - s_fuse1);
    baseMats.current.forEach(mat => mat.opacity = s_fuse1 * (1 - s_fuse2));
    fesMats.current.forEach(mat => mat.opacity = s_fuse2 * (1 - s_fuse3));
    ulmMats.current.forEach(mat => mat.opacity = s_fuse3);
    
    // Safety check for visibility
    immRef.current.visible = (1 - s_fuse1) > 0.001;
    baseRef.current.visible = s_fuse1 > 0.001 && (1 - s_fuse2) > 0.001;
    fesRef.current.visible = s_fuse2 > 0.001 && (1 - s_fuse3) > 0.001;
    ulmRef.current.visible = s_fuse3 > 0.001;
  });

  return (
    <group ref={groupRef}>
      <group ref={immRef}>
        <primitive object={immScene} />
      </group>
      <group ref={baseRef} visible={false}>
        <primitive object={baseScene} />
      </group>
      <group ref={fesRef} visible={false}>
        <primitive object={fesScene} />
      </group>
      <group ref={ulmRef} visible={false}>
        <primitive object={ulmScene} />
      </group>
      {/* 0.01 micro-offset is enough with polygonOffset to prevent Z-fighting */}
      <Avatar position={[0, topY + 0.01, 0]} />
      <Home position={[0, topY + 0.01, 0]} />
    </group>
  );
};

// House/Home Component for Section 4
const Home = ({ position }: { position: [number, number, number] }) => {
  const { scene } = useGLTF('/home_1.glb');
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useMemo(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            mat.depthWrite = true;
            mat.transparent = false;
          });
        }
      }
    });
  }, [scene]);

  const offsets = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return {
      x: -center.x,
      y: -box.min.y,
      z: -center.z
    };
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 15;
    
    // Sync appearance with the Isometric transition (starting p=7.5)
    // Appear when Cube begins tilt
    const appearScale = MathUtils.clamp((p - 7.5) / 0.8, 0, 1);
    
    // Extended lifecycle: starts fading out at p = 14.0
    const visibilityScale = MathUtils.clamp((15.0 - p) / 0.5, 0, 1);
    
    const scale = 0.1 * appearScale * visibilityScale; 
    groupRef.current.scale.setScalar(scale);
    groupRef.current.visible = scale > 0.001;
  });

  return (
    <group ref={groupRef} position={position} visible={false}>
      <primitive object={scene} position={[offsets.x, offsets.y, offsets.z]} />
    </group>
  );
};

useGLTF.preload('/cube_immblend.glb');
useGLTF.preload('/cube_finx_2.glb');
useGLTF.preload('/cube_fes.glb');
useGLTF.preload('/cube_ulm.glb');
useGLTF.preload('/avatar_2.glb');
useGLTF.preload('/home_1.glb');

// Holographic Scan Line Effect
const ScanLine = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 15;
    
    // Scan triggers when the phone is settled (p > 4.4) and stops exactly when avatar STARTS spawning (p = 5.0)
    const isActive = p > 4.4 && p < 5.0;
    
    if (isActive) {
      groupRef.current.visible = true;
      
      // Even slower up-down scanning as requested (frequency reduced from 6 to 3)
      const frequency = 3;
      const pingPong = Math.abs(Math.sin(p * frequency));
      
      groupRef.current.position.y = MathUtils.lerp(0.48, -0.48, pingPong);
      
      // Face out as scan period ends
      const fade = MathUtils.clamp((p - 4.4) * 8, 0, 1) * MathUtils.clamp((5.0 - p) * 20, 0, 1);
      groupRef.current.scale.set(1, fade, 1);
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* 1. Core Fine White Line */}
      <mesh>
        <planeGeometry args={[0.46, 0.003]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      
      {/* 2. Primary Internal Blur */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[0.465, 0.012]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      
      {/* 3. Secondary Medium Glow */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.47, 0.03]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 4. Wide Atmospheric Blur */}
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[0.475, 0.08]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 5. Edge Highlight Glow */}
      <mesh position={[0, 0, -0.004]}>
        <planeGeometry args={[0.48, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.03} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

const IphonePerspective = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 15;
    const s_total = MathUtils.clamp((p - 2.0) / 2.5, 0, 1);
    
    // Visibility: disappear after Avatar spins (p=7.0)
    const fade = 1 - MathUtils.clamp((p - 7.0) / 0.5, 0, 1);
    const visibilityScale = MathUtils.clamp((9.8 - p) / 0.4, 0, 1) * fade;

    groupRef.current.position.x = 0;
    groupRef.current.position.y = MathUtils.lerp(0, -0.1, s_total); // Re-centered to match original layout
    groupRef.current.position.z = MathUtils.lerp(7, 2.5, s_total);
    const targetScale = MathUtils.lerp(15, 1.58, s_total) * visibilityScale;
    groupRef.current.scale.setScalar(targetScale);
    groupRef.current.visible = visibilityScale > 0.001;
  });

  const texture = useTexture('/iphone-v3.png');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipMapLinearFilter;

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[0.4825, 1]} />
        <meshBasicMaterial map={texture} transparent={true} opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Scan line overlay inside the phone screen */}
      <ScanLine />
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
    const p = t * 15;
    // Fade in cubes as we transition to Contact section
    const intensity = MathUtils.clamp((p - 9.5) / 1.0, 0, 1);
    
    cubeData.forEach((pData: { x: number, y: number, z: number, speed: number, rotSpeed: number }, i: number) => {
      const scrollOffset = MathUtils.clamp((p - 9.5) / 1.5, 0, 1);
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
  const pinRef3 = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!pinRef.current || !pinRef2.current || !pinRef3.current) return;
    const t = scroll.offset;
    const p = t * 15;
    
    // Section 2: Philosophy (p=2 to 4)
    const pinVal1 = MathUtils.clamp(p - 2, 0, 2) * 100;
    const opacity1 = MathUtils.clamp((p - 2) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 4.2) / 0.5, 0, 1));
    pinRef.current.style.transform = `translateY(${pinVal1}vh)`;
    pinRef.current.style.opacity = `${opacity1}`;
    pinRef.current.style.pointerEvents = p > 4.5 || p < 1.8 ? 'none' : 'auto';

    // Section 3: Einsatz (p=5 to 7)
    const pinVal2 = MathUtils.clamp(p - 5, 0, 2) * 100;
    const opacity2 = MathUtils.clamp((p - 5) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 7.2) / 0.5, 0, 1));
    pinRef2.current.style.transform = `translateY(${pinVal2}vh)`;
    pinRef2.current.style.opacity = `${opacity2}`;
    pinRef2.current.style.pointerEvents = p > 7.5 || p < 4.8 ? 'none' : 'auto';

    // Section 4: Anwendungen (p=8.5 to 13.5)
    const pinVal3 = MathUtils.clamp(p - 8.5, 0, 5) * 100;
    const opacity3 = MathUtils.clamp((p - 8.5) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 14.5) / 0.5, 0, 1));
    pinRef3.current.style.transform = `translateY(${pinVal3}vh)`;
    pinRef3.current.style.opacity = `${opacity3}`;
    pinRef3.current.style.pointerEvents = p > 14.5 || p < 8.2 ? 'none' : 'auto';
  });

  return (
    <Scroll html>
      {/* 0. Hero: 100vh, p=0 to 1 */}
      <div className="new-hero-banner">
        <div className="new-hero-content">
          <span className="new-hero-sub">Launchpad Experiences</span>
          <h1>Mixed Reality</h1>
          <p>
            Wir transformieren digitale Interaktion in immersive physische Erlebnisse. 
            <strong>Das nächste Level</strong> von Consulting und Marketing comienza aquí.
          </p>
        </div>
      </div>

      {/* 1. Gap for Cube emergence: 100vh, p=1 to 2 */}
      <div style={{ height: '100vh' }} />

      {/* 2. Philosophy: 100vh, p=2 */}
      <div className="scroll-section">
        <div ref={pinRef} className="content-wrapper pinned-content">
          <h2>Intuitive Interaktion.</h2>
          <p className="body-text">
            Erleben Sie Inhalte nicht nur visuell, sondern greifbar. Nutzer tauchen unmittelbar in interaktive Welten ein – direkt per Smartphone, ohne Barrieren.
          </p>
          <div className="key-message">Emotional. Verständlich. Nachhaltig.</div>
        </div>
      </div>
      {/* 2. Pin Spacer: 200vh, p=2 to 4 */}
      <div style={{ height: '200vh' }} />

      {/* 3. Einsatz: 100vh, p=5 */}
      <div className="scroll-section">
        <div ref={pinRef2} className="content-wrapper pinned-content">
          <h2>Grenzenlose Möglichkeiten.</h2>
          <p className="body-text">
            Ob im <strong>Vertrieb</strong>, im <strong>Recruiting</strong> oder auf <strong>Events</strong>: Wir schaffen unvergessliche Erlebnisse, die Ihre Botschaft nachhaltig verankern.
          </p>
        </div>
      </div>
      {/* 3. Pin Spacer: 200vh, p=5 to 7 */}
      <div style={{ height: '200vh' }} />

      {/* 3.5 Gap to Section 4: 50vh (adjusts entry to exactly p=8.5) */}
      <div style={{ height: '50vh' }} />

      {/* 4. Anwendung: 100vh, p=8.5 */}
      <div className="scroll-section">
        <div ref={pinRef3} className="content-wrapper pinned-content pinned-right">
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
      {/* 4. Pin Spacer: 450vh (tailored), p=8.5 to 13 */}
      <div style={{ height: '450vh' }} />

      {/* 5. Video: 100vh, p=14 */}
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

      {/* 6. Contact: 100vh, p=15 */}
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

const Scene = () => {
  return (
    <>
      <ambientLight intensity={1.5} />
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.25} 
        penumbra={1} 
        intensity={2.5} 
        castShadow 
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      
      <IphonePerspective />
      <AnimatedCube />
      <FloatingCubes />
      <Environment preset="city" />
    </>
  );
};

const Visualizer3D: React.FC = () => {
  return (
    <div className="visualizer-container">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ScrollControls pages={16} damping={0.1}>
          <Scene />
          <ScrollContent />
          <ContactShadows 
            position={[0, -1.2, 0]} 
            opacity={0.15} 
            scale={10} 
            blur={2.5} 
            far={4} 
          />
        </ScrollControls>
      </Canvas>
    </div>
  );
};

export default Visualizer3D;
