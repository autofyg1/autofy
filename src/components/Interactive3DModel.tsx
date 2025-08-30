import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  useGLTF, 
  OrbitControls, 
  Environment, 
  Float, 
  Text3D, 
  PresentationControls,
  Stage,
  ContactShadows,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import Fallback3DScene from './Fallback3DScene';

// Model component that loads and renders the GLB file with error handling
function Model({ url, ...props }: { url: string } & any) {
  const { scene, error } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const { viewport } = useThree();

  // Auto-rotation and hover effects
  useFrame((state) => {
    if (modelRef.current) {
      // Gentle auto-rotation when not being manually controlled
      if (!hovered && !clicked) {
        modelRef.current.rotation.y += 0.008;
      }
      
      // Enhanced floating animation with multiple axes
      const t = state.clock.elapsedTime;
      modelRef.current.position.y = Math.sin(t) * 0.15;
      modelRef.current.position.x += Math.sin(t * 0.5) * 0.001;
      modelRef.current.position.z += Math.cos(t * 0.3) * 0.001;
      
      // Dynamic scale effect on hover with bounce
      const targetScale = hovered ? 1.15 : clicked ? 0.95 : 1;
      modelRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Subtle rotation variations
      if (hovered) {
        modelRef.current.rotation.x += Math.sin(t * 2) * 0.01;
        modelRef.current.rotation.z += Math.cos(t * 1.5) * 0.005;
      }
    }
  });

  if (error) {
    console.error('GLTF loading error:', error);
    return null;
  }

  if (!scene) {
    return <LoadingFallback />;
  }

  return (
    <primitive
      ref={modelRef}
      object={scene}
      {...props}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={() => setClicked(true)}
      onPointerUp={() => setClicked(false)}
    />
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading 3D Model...</p>
      </div>
    </Html>
  );
}

// Enhanced particles system with multiple layers
function Particles({ performanceMode }: { performanceMode: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particles2Ref = useRef<THREE.Points>(null);
  const particleCount = performanceMode ? 30 : 80;

  // Create two layers of particles
  const particlePositions = new Float32Array(particleCount * 3);
  const particlePositions2 = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    // First layer - closer particles
    particlePositions[i * 3] = (Math.random() - 0.5) * 8;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    
    // Second layer - distant particles
    particlePositions2[i * 3] = (Math.random() - 0.5) * 15;
    particlePositions2[i * 3 + 1] = (Math.random() - 0.5) * 15;
    particlePositions2[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.03;
      particlesRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    
    if (particles2Ref.current) {
      particles2Ref.current.rotation.y = -t * 0.02;
      particles2Ref.current.rotation.z = Math.cos(t * 0.3) * 0.05;
    }
  });

  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.03} color="#8b5cf6" opacity={0.8} transparent />
      </points>
      
      <points ref={particles2Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions2}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.015} color="#ec4899" opacity={0.4} transparent />
      </points>
    </>
  );
}

// Dynamic lighting component
function DynamicLighting() {
  const lightRef = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t) * 3;
      lightRef.current.position.z = Math.cos(t) * 3;
      lightRef.current.intensity = 0.5 + Math.sin(t * 2) * 0.2;
    }
    
    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(t * 0.7) * 4;
      light2Ref.current.position.z = Math.sin(t * 0.7) * 4;
      light2Ref.current.intensity = 0.3 + Math.cos(t * 1.5) * 0.1;
    }
  });
  
  return (
    <>
      <pointLight ref={lightRef} position={[0, 5, 0]} intensity={0.5} color="#8b5cf6" />
      <pointLight ref={light2Ref} position={[0, -2, 0]} intensity={0.3} color="#ec4899" />
    </>
  );
}

// Main Interactive 3D Model component
interface Interactive3DModelProps {
  className?: string;
  modelPath?: string;
}

// Error Boundary Component
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('3D Model Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const Interactive3DModel: React.FC<Interactive3DModelProps> = ({ 
  className = "",
  modelPath = "https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/model/model.glb"
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);

  useEffect(() => {
    // Check for mobile device and performance constraints
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      const slowDevice = navigator.hardwareConcurrency <= 4;
      setIsMobile(mobile);
      setPerformanceMode(mobile || slowDevice);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    // Test model accessibility
    const testModelAccess = async () => {
      try {
        const response = await fetch(modelPath, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Model not accessible, using fallback scene');
          setShowFallback(true);
        }
      } catch (err) {
        console.warn('Model test failed, using fallback scene:', err);
        setShowFallback(true);
      }
    };
    
    testModelAccess();
    
    return () => window.removeEventListener('resize', checkDevice);
  }, [modelPath]);

  // Show fallback scene if model is not accessible
  if (showFallback) {
    return <Fallback3DScene className={className} />;
  }

  return (
    <ModelErrorBoundary fallback={<Fallback3DScene className={className} />}>
      <div className={`relative ${className}`}>
        <Canvas
          camera={{ 
            position: [0, 0, isMobile ? 6 : 5], 
            fov: isMobile ? 60 : 50,
            near: 0.1,
            far: 1000
          }}
          style={{ background: 'transparent' }}
          gl={{ 
            antialias: !performanceMode, 
            alpha: true,
            powerPreference: "high-performance",
            pixelRatio: performanceMode ? 1 : Math.min(window.devicePixelRatio, 2)
          }}
          frameloop={performanceMode ? 'demand' : 'always'}
          dpr={performanceMode ? 1 : [1, 2]}
          onCreated={({ gl }) => {
            gl.setClearColor('#000000', 0);
          }}
        >
        {/* Lighting setup for beautiful rendering */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <spotLight position={[0, 10, 0]} intensity={0.5} angle={0.3} penumbra={1} />
        
        {/* Dynamic lighting effects */}
        <DynamicLighting />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Suspense for loading */}
        <Suspense fallback={<LoadingFallback />}>
          {/* Presentation Controls for mouse interaction */}
          <PresentationControls
            global
            rotation={[0.13, 0.1, 0]}
            polar={[-0.4, 0.2]}
            azimuth={[-1, 0.75]}
            config={{ mass: 2, tension: 400 }}
            snap={{ mass: 4, tension: 400 }}
          >
            {/* Float wrapper for gentle floating animation */}
            <Float 
              speed={1.5} 
              rotationIntensity={1} 
              floatIntensity={2}
              floatingRange={[0, 0.5]}
            >
              {/* Main model */}
              <Model 
                url={modelPath} 
                scale={[1.5, 1.5, 1.5]}
                position={[0, 0, 0]}
              />
            </Float>
          </PresentationControls>

          {/* Particles for ambient effect - conditionally rendered */}
          {!performanceMode && <Particles performanceMode={performanceMode} />}

          {/* Contact shadows for grounding */}
          <ContactShadows 
            position={[0, -1.4, 0]} 
            opacity={performanceMode ? 0.2 : 0.4} 
            scale={10} 
            blur={performanceMode ? 1 : 1.5} 
            far={4.5} 
          />
        </Suspense>

        {/* OrbitControls as fallback (disabled by default since we use PresentationControls) */}
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          autoRotate={false}
          autoRotateSpeed={0.5}
          minDistance={2}
          maxDistance={10}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI - Math.PI / 6}
        />
      </Canvas>

      {/* Interaction hints */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="flex items-center space-x-2">
          <span>🖱️</span>
          <span>Drag to rotate • Scroll to zoom</span>
        </p>
      </div>

      {/* Floating UI elements */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
    </ModelErrorBoundary>
  );
};

// Preload the model for better performance
try {
  useGLTF.preload('https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/model/model.glb');
} catch (error) {
  console.warn('Model preload failed:', error);
}

export default Interactive3DModel;
