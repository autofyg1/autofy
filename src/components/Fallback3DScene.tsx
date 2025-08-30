import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PresentationControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Animated geometric shapes as fallback
function GeometricModel() {
  const groupRef = useRef<THREE.Group>(null);
  const cube1Ref = useRef<THREE.Mesh>(null);
  const cube2Ref = useRef<THREE.Mesh>(null);
  const sphere1Ref = useRef<THREE.Mesh>(null);
  const sphere2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.5;
    }
    
    if (cube1Ref.current) {
      cube1Ref.current.rotation.x = t;
      cube1Ref.current.rotation.z = t * 0.5;
      cube1Ref.current.position.y = Math.sin(t * 2) * 0.3;
    }
    
    if (cube2Ref.current) {
      cube2Ref.current.rotation.y = -t * 0.8;
      cube2Ref.current.rotation.x = t * 0.3;
      cube2Ref.current.position.y = Math.cos(t * 1.5) * 0.2;
    }
    
    if (sphere1Ref.current) {
      sphere1Ref.current.position.x = Math.sin(t) * 1.2;
      sphere1Ref.current.position.z = Math.cos(t) * 1.2;
    }
    
    if (sphere2Ref.current) {
      sphere2Ref.current.position.x = Math.cos(t * 0.8) * 1.5;
      sphere2Ref.current.position.z = Math.sin(t * 0.8) * 1.5;
      sphere2Ref.current.rotation.y = t * 2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central cube with gradient material */}
      <mesh ref={cube1Ref} position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color="#8b5cf6" 
          metalness={0.8} 
          roughness={0.2}
          emissive="#4c1d95"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Secondary cube */}
      <mesh ref={cube2Ref} position={[0, 1.5, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial 
          color="#ec4899" 
          metalness={0.7} 
          roughness={0.3}
          emissive="#be185d"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Floating spheres */}
      <mesh ref={sphere1Ref} position={[1.2, 0.5, 1.2]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color="#06b6d4" 
          metalness={0.9} 
          roughness={0.1}
          emissive="#0891b2"
          emissiveIntensity={0.15}
        />
      </mesh>
      
      <mesh ref={sphere2Ref} position={[-1.5, -0.5, -1.5]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color="#10b981" 
          metalness={0.6} 
          roughness={0.4}
          emissive="#059669"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Connecting lines/wireframes */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[2, 0.05, 8, 32]} />
        <meshStandardMaterial 
          color="#f59e0b" 
          metalness={0.8} 
          roughness={0.2}
          emissive="#d97706"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

interface Fallback3DSceneProps {
  className?: string;
}

const Fallback3DScene: React.FC<Fallback3DSceneProps> = ({ 
  className = "" 
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0, 6], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{ background: 'transparent' }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />
        
        {/* Environment */}
        <Environment preset="city" />
        
        {/* Interactive controls */}
        <PresentationControls
          global
          rotation={[0.2, 0.1, 0]}
          polar={[-0.3, 0.3]}
          azimuth={[-0.5, 0.5]}
          config={{ mass: 2, tension: 400 }}
          snap={{ mass: 4, tension: 400 }}
        >
          <Float 
            speed={2} 
            rotationIntensity={0.5} 
            floatIntensity={1}
            floatingRange={[0, 0.3]}
          >
            <GeometricModel />
          </Float>
        </PresentationControls>
        
        {/* Ground shadow */}
        <ContactShadows 
          position={[0, -2, 0]} 
          opacity={0.3} 
          scale={8} 
          blur={1} 
          far={4} 
        />
      </Canvas>
      
      {/* Info overlay */}
      <div className="absolute top-6 left-6 right-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
            <span className="w-3 h-3 bg-orange-400 rounded-full mr-3 animate-pulse"></span>
            Demo 3D Scene
          </h3>
          <p className="text-sm text-gray-600">
            Interactive geometric shapes (your custom model will appear here)
          </p>
        </div>
      </div>
      
      {/* Interaction hints */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="flex items-center space-x-2">
          <span>🖱️</span>
          <span>Drag to rotate • Scroll to zoom</span>
        </p>
      </div>
    </div>
  );
};

export default Fallback3DScene;
