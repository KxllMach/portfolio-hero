import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer, Text } from '@react-three/drei' // Text for Suspense fallback
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier' // Debug removed for Vercel build
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' // DRACOLoader import
import { easing } from 'maath'

// 🎨 Accent colors
const accents = ['#4060ff', '#8FFE09', '#ED141F', '#fff500']

// Shuffle with clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0, clearcoat: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.8, clearcoat: 1 },
  { color: '#444', roughness: 0.75, metalness: 0.2, clearcoat: 0.8 },
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 0.1},
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 1 },
  { color: 'white', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, clearcoat: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.5, clearcoat: 1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const [triggerImpulse, setTriggerImpulse] = useState(0);
  
  const connectors = useMemo(() => shuffle(accent), [accent])

  const handleCanvasClick = useCallback(() => {
    click();
    setTriggerImpulse(prev => prev + 1);
  }, []);

  return (
    <Canvas
      onClick={handleCanvasClick}
      dpr={[1, 1.5]}
      gl={{ 
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      // Adjusted camera position and FOV for multiple objects at scale 0.5
      camera={{ position: [0, 0, 15], fov: 30, near: 0.1, far: 50 }} 
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow
        shadow-mapSize={[256, 256]}
        shadow-camera-fov={15}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />

      {/* Suspense to handle GLTF loading */}
      <Suspense fallback={<Text color="white" anchorX="center" anchorY="middle">Loading 3D Models...</Text>}>
        <Physics 
          gravity={[0, 0, 0]} 
          maxSubSteps={2}
          timeStep={1/60}
        >
          {/* <Debug /> */} {/* Keep commented out for Vercel build */}
          <Pointer /> {/* Re-enabled Pointer */}
          {connectors.map((props, i) => <Connector key={i} triggerImpulse={triggerImpulse} {...props} />)}
        </Physics>
      </Suspense>

      <EffectComposer 
        disableNormalPass 
        multisampling={2}
      >
        <N8AO 
          distanceFalloff={1} 
          aoRadius={1} 
          intensity={3.5}
          samples={16}
        />
      </EffectComposer>

      <Environment resolution={64}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={6} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
          <Lightformer form="circle" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
        </group>
      </Environment>
    </Canvas>
  )
}

function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, triggerImpulse, ...props }) {
  const api = useRef()
  // Reduced initial spread for objects to spawn closer to the center, matching smaller scale
  const pos = useMemo(() => position || [r(5), r(5), r(5)], [position]) // r(5) for a tighter cluster

  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  const oscSpeeds = useMemo(() => ({
    x: 0.8,
    y: 1.0,
    z: 0.6
  }), [])

  useFrame((state, delta) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()

    const currentPosition = api.current.translation()

    const forceMultiplier = 0.4
    const inward = {
      x: -currentPosition.x * forceMultiplier + Math.sin(t * oscSpeeds.x + offset.x) * 0.1,
      y: -currentPosition.y * forceMultiplier + Math.cos(t * oscSpeeds.y + offset.y) * 0.1,
      z: -currentPosition.z * forceMultiplier + Math.sin(t * oscSpeeds.z + offset.z) * 0.05
    }

    api.current.applyImpulse(inward, true)

    const torqueStrength = 0.001
    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * torqueStrength,
      y: Math.cos(t + offset.y) * torqueStrength,
      z: Math.sin(t + offset.z) * torqueStrength
    }, true)
  })

  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation();
      const impulseDirection = new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z).normalize();
      // Adjusted impulse magnitude for smaller objects
      const impulseMagnitude = 10; // Re-enabled and set to 10 for a noticeable push

      api.current.applyImpulse(impulseDirection.multiplyScalar(impulseMagnitude), true);
      console.log(`Applied impulse to connector at ${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}`);
    }
  }, [triggerImpulse, vec]);

  return (
    <RigidBody
      linearDamping={2}  
      angularDamping={0.5}  
      friction={0.1}
      restitution={0.9}
      position={pos}
      ref={api}
      colliders={false}
      canSleep={false}  
    >
      {/* CuboidCollider args are now correct for Model scale={0.5} */}
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      {children ? children : <Model {...props} />}
      {accent && <pointLight intensity={3} distance={3} color={props.color} decay={2} />}
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()
  
  useFrame(({ mouse, viewport }) => {
    ref.current?.setNextKinematicTranslation(vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0))
  })
  
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      {/* Adjusted BallCollider args for smaller objects */}
      <BallCollider args={[0.04]} /> 
    </RigidBody>
  )
}

function Model({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  // Load the GLTF model (scene, nodes, materials are all available)
  const { scene } = useGLTF('/c-transformed.glb', (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
  });

  // Use a ref to hold the material properties for the loaded model
  const materialPropsRef = useRef({ color, roughness, metalness, clearcoat });

  // Update ref when props change
  useEffect(() => {
    materialPropsRef.current = { color, roughness, metalness, clearcoat };
  }, [color, roughness, metalness, clearcoat]);

  // This useEffect will fire when the GLTF scene object becomes available
  useEffect(() => {
    if (scene) {
      console.log("GLTF Scene loaded successfully:", scene); // Log the entire scene object
      console.log("Available scene children:", scene.children); // Log children to see what's inside

      // Traverse the entire scene to apply properties to all meshes
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          // Apply initial material properties or create new material if none
          if (obj.material) {
            obj.material.color.set(materialPropsRef.current.color);
            obj.material.roughness = materialPropsRef.current.roughness;
            obj.material.metalness = materialPropsRef.current.metalness;
            obj.material.clearcoat = materialPropsRef.current.clearcoat;
            obj.material.needsUpdate = true; // Important to update material
          } else {
            // If mesh has no material, create a new MeshPhysicalMaterial
            obj.material = new THREE.MeshPhysicalMaterial({
              color: materialPropsRef.current.color,
              roughness: materialPropsRef.current.roughness,
              metalness: materialPropsRef.current.metalness,
              clearcoat: materialPropsRef.current.clearcoat,
              clearcoatRoughness: 0.1,
              reflectivity: 0.6
            });
            obj.material.needsUpdate = true;
          }
        }
      });
    } else {
      console.log("GLTF Scene is null/undefined. Model might not be parsing correctly.");
    }
  }, [scene]); // Dependency on 'scene' to trigger when it's ready

  useFrame((state, delta) => {
    // Update color dynamically in useFrame
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.color.set(materialPropsRef.current.color);
        }
      });
    }
  })

  return (
    // Render the entire loaded scene
    // The ref 'ref' is not directly used on primitive, but can be used for material access if needed.
    <primitive object={scene} scale={0.5} /> 
  )
}
