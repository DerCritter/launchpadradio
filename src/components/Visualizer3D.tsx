import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll, Scroll, ContactShadows, useTexture, useGLTF, Environment, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';

const CrypticDataStream = ({ alignRight = false }: { alignRight?: boolean }) => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
      const mem = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      
      setLines(prev => {
        const next = [...prev, `SYS_MEM[${mem}] 0x${hex} ... OK`];
        if (next.length > 20) next.shift();
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`cryptic-stream ${alignRight ? 'cryptic-stream-right' : ''}`}>
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
};

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
    const p = t * 26;
    
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
  
  const { viewport } = useThree();
  const isMobile = viewport.width < 5; // Simple check for mobile aspect
  const responsiveScale = isMobile ? 0.7 : 1.0;
  
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
    const p = t * 26; 

    // Transition stages mapped to pages
    // s1: Initial emergence zoom (starts p=0.3, duration 1.0)
    const s1 = MathUtils.clamp((p - 0.3) / 1.0, 0, 1);
    // s2: Shrink into Phone (syncs perfectly with phone movement p=2.0 to 4.5)
    const s2 = MathUtils.clamp((p - 2.0) / 2.5, 0, 1);
    
    // NEW Sequence Transitions
    const s_spin1 = MathUtils.clamp((p - 5.0) / 1.5, 0, 1);  // Avatar spin (starts p=5)
    const s_iso = MathUtils.clamp((p - 7.5) / 1.0, 0, 1);    // 45-deg isometric tilt
    const s_endgame_spin = MathUtils.clamp((p - 8.5) / 7.5, 0, 1); // Continuous spin p=8.5 to 16.0
    
    // Lifecycle: starts fading out immediately after Section 4 (ends p=16)
    const visibilityScale = MathUtils.clamp((16.5 - p) / 0.5, 0, 1);

    // Scaling logic: Shrink to fit inside the phone screen
    const baseScale = p < 2.0 
      ? MathUtils.lerp(0.1, 0.85, s1) 
      : MathUtils.lerp(0.85, 0.22, s2); // Dramatic shrink to fix inside iPhone screen
    
    groupRef.current.scale.setScalar(baseScale * visibilityScale * responsiveScale);
    
    // Position logic: starts near iPhone base (-0.3), centers to 0.0 during iso transition
    const baseCubeY = MathUtils.lerp(0, -0.3, s2);
    const isoCenteredY = MathUtils.lerp(0, 0.05, s_iso); // Lowered from 0.3
    groupRef.current.position.z = MathUtils.lerp(0, 2.55, s2);
    groupRef.current.position.x = 0;
    // On mobile, nudge the cube SLIGHTLY higher to avoid overlap, but keep it centered
    const mobileOffset = isMobile ? 0.2 : 0; 
    groupRef.current.position.y = baseCubeY + isoCenteredY + mobileOffset;

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
    const rotYEndgame = MathUtils.lerp(0, 4 * Math.PI, s_endgame_spin); // Two full 360-turns continuously
    groupRef.current.rotation.y = rotY1 + rotY2 + rotYSpin1 + rotYIso + rotYEndgame;

    // Quad Cross-fade logic (Evolution stages)
    // 1. Immblend -> Finx (starts early at p=4.0 for seamless overlap)
    const s_fuse1 = MathUtils.clamp((p - 4.0) / 1.0, 0, 1);
    // 2. Finx -> Fes (starts p=8.0)
    const s_fuse2 = MathUtils.clamp((p - 8.0) / 1.0, 0, 1);
    // 3. Fes -> Ulm (starts p=11.5 - identical transition style as before)
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
      {/* Force contact with cube surface by lowering slightly more */}
      <Avatar position={[0, topY - 0.04, 0]} />
      <Home position={[0, topY + 0.01, 0]} />
      <FloatingIcons topY={topY} />
    </group>
  );
};

// Floating Icons Component for Section 4 (Ulm Stage)
const FloatingIcons = ({ topY }: { topY: number }) => {
  const { scene } = useGLTF('/icons_float.glb');
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        if (mesh.material) {
          const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.roughness = 0.5;
          mat.metalness = 0.2;
          // Removed lilac emissive to show natural model colors
          mat.emissive = new THREE.Color("#000000"); 
          mat.emissiveIntensity = 0;
        }
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 26;
    
    // Appear with Ulm (s_fuse3 sync: starts p=11.5)
    const s_appear = MathUtils.clamp((p - 11.5) / 1.0, 0, 1);
    const fadeOut = 1 - MathUtils.clamp((p - 16.0) / 0.5, 0, 1);
    
    const finalScale = s_appear * fadeOut;
    groupRef.current.scale.setScalar(finalScale);
    groupRef.current.visible = finalScale > 0.001;

    // Gentle oscillation logic - Increased height offset to +0.40
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = topY + 0.40 + Math.sin(time * 2) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
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
    const p = t * 26;
    
    // Sync appearance with the Isometric transition (starting p=7.5)
    // Appear when Cube begins tilt
    const appearScale = MathUtils.clamp((p - 7.5) / 0.8, 0, 1);
    
    // Extended lifecycle: starts fading out when Ulm/Icons appear (p = 11.5)
    const visibilityScale = MathUtils.clamp((12.5 - p) / 1.0, 0, 1);
    
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
useGLTF.preload('/icons_float.glb');
useGLTF.preload('/avatar_2.glb');
useGLTF.preload('/home_1.glb');

// Holographic Scan Line Effect
const ScanLine = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current || !matRef.current) return;
    const t = scroll.offset;
    const p = t * 26;
    
    // Scan starts perfectly when phone finishes settling (p=4.5) and ends as avatar starts to appear (p=5.0)
    const isActive = p > 4.5 && p < 5.0;
    
    if (isActive) {
      groupRef.current.visible = true;
      
      // Perform a full sweep: top -> bottom -> top before the avatar appears
      const progress = MathUtils.clamp((p - 4.5) / 0.5, 0, 1);
      const cycleY = Math.cos(progress * Math.PI * 2) * 0.42;
      groupRef.current.position.y = cycleY;
      
      // Smooth fade in/out at the boundaries of the scan window
      const fade = MathUtils.clamp((p - 4.5) * 20, 0, 1) * MathUtils.clamp((5.0 - p) * 20, 0, 1);
      matRef.current.uniforms.uOpacity.value = fade;
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, 0, 0.1]} renderOrder={999}>
        <planeGeometry args={[0.415, 0.08]} />
        <shaderMaterial
          ref={matRef}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uProgress: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color('#8b5cf6') },
            uIntensity: { value: 2.5 } // Higher intensity for Bloom
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uIntensity;
            void main() {
              float dist = abs(vUv.y - 0.5) * 2.0;
              float aura = pow(1.0 - dist, 3.0);
              float core = pow(1.0 - dist, 60.0);
              vec3 baseColor = mix(uColor, vec3(1.0), core * 0.7);
              vec3 finalColor = baseColor * uIntensity;
              gl_FragColor = vec4(finalColor, (aura * 0.5 + core * 0.5) * uOpacity);
            }
          `}
        />
      </mesh>
    </group>
  );
};

const IphonePerspective = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 26;
    const s_total = MathUtils.clamp((p - 2.0) / 2.5, 0, 1);
    
    // Visibility: disappear after Avatar spins (p=7.0)
    const fade = 1 - MathUtils.clamp((p - 7.0) / 0.5, 0, 1);
    const visibilityScale = MathUtils.clamp((9.8 - p) / 0.4, 0, 1) * fade;

    groupRef.current.position.x = 0;
    groupRef.current.position.y = MathUtils.lerp(0, isMobile ? 0.2 : -0.1, s_total); 
    groupRef.current.position.z = MathUtils.lerp(7, 2.5, s_total);
    const targetScale = MathUtils.lerp(isMobile ? 12 : 15, isMobile ? 1.4 : 1.58, s_total) * visibilityScale;
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
    const p = t * 26;
    // Fade in cubes exactly when Section 4 starts (p=8.5)
    // they stay until the end of the site (p=20)
    const intensity = MathUtils.clamp((p - 8.5) / 0.5, 0, 1);
    
    cubeData.forEach((pData: { x: number, y: number, z: number, speed: number, rotSpeed: number }, i: number) => {
      // Linear motion based on p, starting from Section 4's reveal
      const scrollOffset = MathUtils.clamp((p - 8.5) / 11.5, 0, 1);
      const currentZ = pData.z + (scrollOffset * 40 * pData.speed);
      
      // Add noticeably stronger vertical oscillation (hover effect)
      const oscillation = Math.sin(state.clock.elapsedTime * pData.speed) * 1.5;
      
      dummy.position.set(pData.x, pData.y + 5.5 + oscillation, currentZ); // Extremely raised + strong oscillation
      dummy.rotation.set(
        state.clock.elapsedTime * pData.rotSpeed * 2,
        state.clock.elapsedTime * pData.rotSpeed * 2.5,
        state.clock.elapsedTime * pData.rotSpeed * 1.5
      );
      dummy.scale.setScalar(intensity * 0.3);
      
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
        emissiveIntensity={1.2}
      />
    </instancedMesh>
  );
};

// Background Cryptics (Behind the Cube)
const IntroCryptic3D = () => {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null!);
  const introCrypticRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const p = t * 26;
    
    // Initial emergence timing: p=0.8 to 3.2
    const introOpacity = MathUtils.clamp((p - 0.8) / 0.4, 0, 1) * (1 - MathUtils.clamp((p - 3.2) / 0.4, 0, 1));
    groupRef.current.position.y = -p * 1.5; // Drift vertically in 3D space
    groupRef.current.visible = introOpacity > 0.001;
    
    if (introCrypticRef.current) {
      introCrypticRef.current.style.opacity = `${introOpacity}`;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -2.5]}>
      <Html transform distanceFactor={5}>
        <div ref={introCrypticRef} className="intro-cryptics" style={{ opacity: 0 }}>
          <div className="cryptic-line">SCANNING SECTOR: VII</div>
          <div className="cryptic-line">INIT_SEQ_v2.0</div>
          <div className="cryptic-line">GRID_LOAD: 88%</div>
        </div>
      </Html>
    </group>
  );
};

const ScrollContent = ({ gridRef }: { gridRef: React.RefObject<HTMLDivElement> }) => {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;
  const scroll = useScroll();
  const pinRef = useRef<HTMLDivElement>(null!);
  const pinRef2 = useRef<HTMLDivElement>(null!);
  const pinRef3 = useRef<HTMLDivElement>(null!);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoPinRef = useRef<HTMLDivElement>(null!);
  const contactPinRef = useRef<HTMLDivElement>(null!);
  const demoButtonRef = useRef<HTMLButtonElement>(null!);
  const introCrypticRef = useRef<HTMLDivElement>(null!);
  const introForegroundRef = useRef<HTMLDivElement>(null!);
  const contactCrypticRef = useRef<HTMLDivElement>(null!);
  const prevScrollOffset = useRef(0);
  const navbarVisible = useRef(true);

  useEffect(() => {
    const handleScrollTo = (e: any) => {
      const targetPage = e.detail;
      if (scroll.el) {
        scroll.el.scrollTo({
          top: targetPage * window.innerHeight,
          behavior: 'smooth'
        });
      }
    };
    window.addEventListener('scroll-to', handleScrollTo);
    return () => window.removeEventListener('scroll-to', handleScrollTo);
  }, [scroll]);

  useFrame(() => {
    if (!pinRef.current || !pinRef2.current || !pinRef3.current || !gridRef.current || !videoPinRef.current || !contactPinRef.current || !demoButtonRef.current || !introCrypticRef.current || !introForegroundRef.current || !contactCrypticRef.current) return;
    const t = scroll.offset;
    const p = t * 26;

    // Detect Scroll Direction for Navbar Visibility
    const delta = t - prevScrollOffset.current;
    if (Math.abs(delta) > 0.001) {
      const shouldBeVisible = delta < 0 || t < 0.02; // Visible if scrolling up or at the very top
      if (shouldBeVisible !== navbarVisible.current) {
        navbarVisible.current = shouldBeVisible;
        window.dispatchEvent(new CustomEvent('navbar-visibility', { detail: { visible: shouldBeVisible } }));
      }
    }
    prevScrollOffset.current = t;
    
    // Introductory Cryptics (Only with the Cube emergence, NOT over Hero)
    // Fades in starting at p=0.8, fully visible by p=1.2. Fades out by p=3.2.
    const introOpacity = MathUtils.clamp((p - 0.8) / 0.4, 0, 1) * (1 - MathUtils.clamp((p - 3.2) / 0.4, 0, 1));
    introCrypticRef.current.style.transform = `translateY(${p * 100}vh)`;
    introCrypticRef.current.style.opacity = `${introOpacity}`;
    
    // Sync foreground lines
    introForegroundRef.current.style.transform = `translateY(${p * 100}vh)`;
    introForegroundRef.current.style.opacity = `${introOpacity}`;
    
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

    // Section 4: Anwendungen (p=8.5 to 16.0 - Extended for Ulm reveal)
    const pinVal3 = MathUtils.clamp(p - 8.5, 0, 7.5) * 100;
    const opacity3 = MathUtils.clamp((p - 8.5) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 16.5) / 0.5, 0, 1));
    pinRef3.current.style.transform = `translateY(${pinVal3}vh)`;
    pinRef3.current.style.opacity = `${opacity3}`;
    pinRef3.current.style.pointerEvents = p > 17.0 || p < 8.2 ? 'none' : 'auto';
    
    // Tech grid sync (Inside fixed container, only needs opacity)
    gridRef.current.style.opacity = `${opacity3}`;

    // Highlight HUD cards sequentially based on the p=8.5 to 16.0 timeframe
    const cardProgress = MathUtils.clamp((p - 8.5) / 7.5, 0, 1);
    cardRefs.current.forEach((el, index) => {
      if (el) {
        // Calculate smooth scroll-driven opacity (triangular pulse)
        // Each card peaks at its center point and fades in/out gradually
        const peak = (index + 0.5) / 4;
        const dist = Math.abs(cardProgress - peak);
        const cardOpacity = MathUtils.clamp(1 - dist * 8, 0, 1); // "8" controls the width of the fade window
        
        el.style.opacity = `${cardOpacity}`;
        el.style.pointerEvents = cardOpacity > 0.1 ? 'auto' : 'none';
        
        // Also animate the node height based on individual opacity
        const node = el.querySelector('.hud-node') as HTMLElement;
        if (node) {
          node.style.height = `${cardOpacity * 45}%`;
        }
      }
    });

    // Section 5: Video Highlights (p=17.0 to 21.0 - Pinned for 4.0 pages)
    const videoPinVal = MathUtils.clamp(p - 17.0, 0, 4.0) * 100;
    const videoOpacity = MathUtils.clamp((p - 16.5) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 21.5) / 0.5, 0, 1));
    videoPinRef.current.style.transform = `translateY(${videoPinVal}vh)`;
    videoPinRef.current.style.opacity = `${videoOpacity}`;
    videoPinRef.current.style.pointerEvents = p > 22.0 || p < 16.5 ? 'none' : 'auto';

    // Highlight Video cards sequentially (p=17.0 to 21.0)
    const videoProgress = MathUtils.clamp((p - 17.0) / 4.0, 0, 0.99);
    const activeVideoIndex = Math.floor(videoProgress * 3); // 3 items
    videoCardRefs.current.forEach((el, index) => {
      if (el) {
        if (index === activeVideoIndex) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Section 6: Contact Pinning (p=22.0 to 25.0 - Pinned for 3.0 pages)
    const contactPinVal = MathUtils.clamp(p - 22.0, 0, 3.0) * 100;
    const contactOpacity = MathUtils.clamp((p - 21.5) / 0.5, 0, 1) * (1 - MathUtils.clamp((p - 26.0) / 0.5, 0, 1));
    contactPinRef.current.style.transform = `translateY(${contactPinVal}vh)`;
    contactPinRef.current.style.opacity = `${contactOpacity}`;
    contactPinRef.current.style.pointerEvents = p > 26.5 || p < 21.5 ? 'none' : 'auto';

    // Direct Scroll Highlight for CTA (p=22.8 to 26.0)
    const ctaIntensity = MathUtils.clamp((p - 22.8) / 0.8, 0, 1) * (1 - MathUtils.clamp((p - 25.5) / 0.5, 0, 1));
    // Reduce scale intensity on mobile to prevent viewport overflow
    const maxScaleFactor = isMobile ? 0.1 : 0.4;
    const scale = 1.0 + (ctaIntensity * maxScaleFactor);
    const glow = ctaIntensity * 80;
    const brightness = 1.0 + (ctaIntensity * 0.4);
    
    demoButtonRef.current.style.transform = `scale(${scale})`;
    demoButtonRef.current.style.filter = `brightness(${brightness})`;
    demoButtonRef.current.style.boxShadow = `0 0 ${glow}px rgba(139, 92, 246, ${ctaIntensity * 0.9}), inset 0 0 ${ctaIntensity * 30}px rgba(255,255,255,0.5)`;
    demoButtonRef.current.style.borderColor = `rgba(255, 255, 255, ${0.2 + ctaIntensity * 0.8})`;

    // Subtle drift for contact cryptics (parallax effect)
    const drift = (p - 22.0) * 40; // Drifts 40px per page
    contactCrypticRef.current.style.transform = `translateY(${drift}px)`;
  });

  return (
    <Scroll html>
      {/* Global Interface Layers (Front) */}
      <div ref={introCrypticRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, pointerEvents: 'none', willChange: 'transform, opacity' }}>
        <CrypticDataStream alignRight />
      </div>

      <div ref={introForegroundRef} className="intro-cryptics" style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 110, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      </div>

      {/* 0. Hero: 100vh, p=0 to 1 */}
      <div className="new-hero-banner">
        <div className="new-hero-content">
          <h1>AR Würfel</h1>
          <p>
            Wir transformieren digitale Interaktion in immersive physische Erlebnisse. 
            <strong>Das nächste Level</strong> von Consulting und Marketing beginnt hier.
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

        <div className="scroll-section">
          <div ref={pinRef3} className="content-wrapper pinned-content hud-pinned-left">
          <div className="hud-header">
            <h2>Anwendungsmöglichkeiten</h2>
          </div>
          <div className="hud-cards">
            <div className="hud-card" ref={el => cardRefs.current[0] = el}>
              <div className="hud-node"></div>
              <h3>Beratung</h3>
              <p>Physische Anker für komplexe technische Erklärungen.</p>
            </div>
            <div className="hud-card" ref={el => cardRefs.current[1] = el}>
              <div className="hud-node"></div>
              <h3>Marketing</h3>
              <p>Interaktive Social Media Kampagnen mit AR-Veredelung.</p>
            </div>
            <div className="hud-card" ref={el => cardRefs.current[2] = el}>
              <div className="hud-node"></div>
              <h3>Print</h3>
              <p>Verwandeln Sie Flyer und Visitenkarten in digitale Erlebnisse.</p>
            </div>
            <div className="hud-card" ref={el => cardRefs.current[3] = el}>
              <div className="hud-node"></div>
              <h3>Events</h3>
              <p>Unvergessliche Schnitzeljagden und Führungen direkt vor Ort.</p>
            </div>
          </div>
        </div>
      </div>
      {/* 4. Pin Spacer: 750vh (Endgame rotation sequence), p=8.5 to 16 */}
      <div style={{ height: '750vh' }} />

      {/* 5. Video: 100vh, p=17.0 to 21.0 */}
      <section className="video-section" ref={videoPinRef}>
        <iframe 
          src="https://player.vimeo.com/video/1181282543?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1" 
          frameBorder="0" 
          allow="autoplay; fullscreen" 
          className="video-background"
          title="cube_1"
        />
        <div className="video-overlay"></div>
        <div className="content-wrapper" style={{ zIndex: 2 }}>
          <h2 className="section-title-alt">Highlights: Warum AR Würfel?</h2>
          <div className="benefits-list">
            <div className="benefit-item" ref={el => videoCardRefs.current[0] = el}>
              <div className="benefit-text">
                <h4>Echtes erleben.</h4>
                <p>Interaktion statt bloßer Erklärung.</p>
              </div>
            </div>
            <div className="benefit-item" ref={el => videoCardRefs.current[1] = el}>
              <div className="benefit-text">
                <h4>Fokussierte Aufmerksamkeit.</h4>
                <p>Neugier als treibende Kraft.</p>
              </div>
            </div>
            <div className="benefit-item" ref={el => videoCardRefs.current[2] = el}>
              <div className="benefit-text">
                <h4>Perfekt integriert.</h4>
                <p>Nahtlos in Ihrer Customer Journey.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pin Spacer: 400vh, corresponds to p=17.0 to 21.0 pin duration */}
      <div style={{ height: '400vh' }} />

      {/* 6. Contact: 100vh, p=22.0 to 25.0 */}
      <section ref={contactPinRef} className="scroll-section contact-section" style={{ zIndex: 5, willChange: 'transform, opacity' }}>
        <div className="contact-grid"></div>
        <div ref={contactCrypticRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <CrypticDataStream />
          <CrypticDataStream alignRight />
        </div>
        <div className="content-wrapper" style={{ zIndex: 2, textAlign: 'center', width: '100%' }}>
          <span className="subheadline">Bereit für die nächste Dimension?</span>
          <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, color: 'white', textShadow: '0 0 40px rgba(124, 58, 237, 0.5)', marginBottom: '2rem' }}>Der Würfel als innovativer Einstiegspunkt in Ihre digitale Welt.</h2>
          <button ref={demoButtonRef} className="cta-button" onClick={() => window.dispatchEvent(new CustomEvent('open-contact-modal'))}>
            Jetzt erleben oder Demo anfragen
          </button>
        </div>
      </section>

      {/* 6. Contact Pin Spacer: 300vh */}
      <div style={{ height: '300vh' }} />

      {/* 7. Footer: immediate arrival at p=26.0+ */}
      <footer className="tech-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>ImmBlend GmbH</h3>
            <p>Deutschlands führende AR VR Agentur.</p>
          </div>
          <div className="footer-links">
            <a href="https://www.immblend.de/policies/impressum" target="_blank" rel="noreferrer">Impressum</a>
            <a href="https://www.immblend.de/policies/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a>
            <a href="https://www.immblend.de" target="_blank" rel="noreferrer">Website</a>
          </div>
          <div className="footer-copy">
            &copy; 2024 ImmBlend GmbH. All rights reserved.
          </div>
        </div>
      </footer>
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
      <IntroCryptic3D />
      <FloatingCubes />
      <Environment preset="city" />
    </>
  );
};

const Visualizer3D: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null!);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  useEffect(() => {
    const handleVisibility = (e: any) => {
      setIsNavbarVisible(e.detail.visible);
    };
    window.addEventListener('navbar-visibility', handleVisibility);
    return () => window.removeEventListener('navbar-visibility', handleVisibility);
  }, []);

  return (
    <div className="visualizer-container">
      <div className={`tech-panel-container ${!isNavbarVisible ? 'tech-panel--expanded' : ''}`} ref={gridRef}>
        <div className="tech-grid" />
        <div className="tech-panel-frame">
          <div className="corner top-left" />
          <div className="corner top-right" />
          <div className="corner bottom-left" />
          <div className="corner bottom-right" />
          <div className="panel-side left" />
          <div className="panel-side right" />
          <div className="tech-data-point top-left">SCN_TYPE: AR_CUBE</div>
          <div className="tech-data-point bottom-right">IMM_SYS_v2.0</div>
        </div>
      </div>
      
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ScrollControls pages={27} damping={0.1}>
          <Scene />
          <ScrollContent gridRef={gridRef} />
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
