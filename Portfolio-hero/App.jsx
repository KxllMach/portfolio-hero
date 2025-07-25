import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer, Text } from '@react-three/drei' // Added Text for fallback
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' // Added DRACOLoader import

// Keeping other imports for completeness, though not used in this debug version
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { easing } from 'maath'

// --- NEW TEST MODEL COMPONENT (for focused GLTF debugging) ---
function TestModel() {
  // Load the GLTF model
  const { scene, nodes, materials } = useGLTF('/c-transformed.glb', (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
  });

  // This useEffect will fire when useGLTF returns its values (scene, nodes, materials)
  useEffect(() => {
    console.log("--- TestModel GLTF Load Status ---");
    console.log("Full GLTF Object (from useGLTF):", { scene, nodes, materials }); // Log all outputs

    if (scene) {
      console.log("GLTF Scene object is available.");
      console.log("Scene children:", scene.children); // Check what's directly under the scene

      let meshFound = false;
      scene.traverse((obj) => {
        if (obj.isMesh) {
          meshFound = true;
          console.log("Found mesh during scene traverse:", obj.name || "Unnamed Mesh", obj.geometry, obj.material);
          // Apply a basic material if the model has none or its material is problematic
          if (!obj.material) {
            obj.material = new THREE.MeshStandardMaterial({ color: 'hotpink' });
            console.log("Applied default hotpink material to mesh:", obj.name || "Unnamed Mesh");
          }
          // Ensure shadows are set for debugging visibility
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      if (!meshFound) {
        console.log("No meshes found in the loaded scene during traverse.");
      }
    } else {
      console.log("GLTF Scene object is null/undefined. Model might not be parsing correctly.");
    }
    console.log("----------------------------------");
  }, [scene, nodes, materials]); // Depend on all outputs of useGLTF

  // Render the entire scene if it's loaded
  if (scene) {
    return <primitive object={scene} scale={0.5} position={[0, 0, 0]} />; // Render at origin, scale 0.5
  }
  // If scene is not loaded yet, Suspense fallback will handle it.
  return null;
}
// --- END NEW TEST MODEL COMPONENT ---


export default function App() {
  // All states and handlers related to connectors/physics are removed for this debug version
  // const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  // const [triggerImpulse, setTriggerImpulse] = useState(0);
  // const connectors = useMemo(() => shuffle(accent), [accent])
  // const handleCanvasClick = useCallback(() => { ... }, []);

  return (
    <Canvas
      // onClick={handleCanvasClick} // Temporarily disabled click handler
      dpr={[1, 1.5]}
      gl={{ 
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      // Adjusted camera position and FOV for a single, scaled object
      camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 50 }} 
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow
        shadow-mapSize={[256, 256]}
        shadow-camera-fov={15}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />

      {/* Suspense with a visible fallback so you know if it's loading */}
      <Suspense fallback={<Text color="white" anchorX="center" anchorY="middle">Loading 3D Model...</Text>}>
        {/* RENDER ONLY THE TEST MODEL HERE */}
        <TestModel /> 
      </Suspense>

      {/* Temporarily removed all other components to isolate the GLTF loading issue */}
      {/* <Physics gravity={[0, 0, 0]} maxSubSteps={2} timeStep={1/60}>
        <Pointer />
        {connectors.map((props, i) => <Connector key={i} triggerImpulse={triggerImpulse} {...props} />)}
      </Physics>

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
      </Environment> */}
    </Canvas>
  )
}

// Keeping Connector, Pointer, and Model components below for reference,
// but they are NOT rendered in App for this specific debug test.
// You will re-integrate them once TestModel confirms GLTF loading.

function Connector({ position, children, vec = new THREE.Vector3(), r = THREE.MathUtils.randFloatSpread, accent, triggerImpulse, ...props }) {
  const api = useRef()
  const pos = useMemo(() => position || [r(3), r(3), r(3)], [position])

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
      const impulseMagnitude = 0;

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
      <BallCollider args={[0.4]} />
    </RigidBody>
  )
}

function Model({ color = 'white', roughness = 0.2, metalness = 0.5, clearcoat = 0.8 }) {
  const ref = useRef()
  const { nodes } = useGLTF('/c-transformed.glb', (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
  });

  useEffect(() => {
    if (nodes.connector) {
      console.log("GLTF 'connector' node loaded:", nodes.connector);
      console.log("Available node names:", Object.keys(nodes));
      
      nodes.connector.castShadow = true;
      nodes.connector.receiveShadow = true;

      if (nodes.connector.isMesh && nodes.connector.material) {
        nodes.connector.material.roughness = roughness;
        nodes.connector.material.metalness = metalness;
        nodes.connector.material.clearcoat = clearcoat;
      }
    } else {
      console.log("GLTF 'connector' node not found or model not fully loaded.");
    }
  }, [nodes.connector, roughness, metalness, clearcoat]);

  useFrame((state, delta) => {
    if (nodes.connector && nodes.connector.isMesh && nodes.connector.material) {
      nodes.connector.material.color.set(color);
    }
  })

  return (
    <primitive object={nodes.connector} scale={0.5} /> 
  )
}
