import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { easing } from 'maath'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

// 🎨 Accent colors
const accents = ['#4060ff', '#8FFE09', '#ff4060', '#ffcc00']

// Shuffle with clearcoat, roughness, and metalness
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.75, metalness: 0, clearcoat: 0 },
  { color: '#444', roughness: 0.1, metalness: 0.8, clearcoat: 1 },
  { color: '#444', roughness: 0.75, metalness: 0.2, clearcoat: 0.8 },
  { color: 'white', roughness: 0.75, metalness: 0, clearcoat: 0.5 },
  { color: 'white', roughness: 0.75, metalness: 0.8, clearcoat: 1 },
  { color: 'white', roughness: 0.1, metalness: 0.2, clearcoat: 1 },
  { color: accents[accent], roughness: 0.75, metalness: 0.2, clearcoat: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.8, clearcoat: 1, accent: true },
  { color: accents[accent], roughness: 0.1, metalness: 0.2, clearcoat: 1, accent: true }
]

export default function App() {
  const [accent, click] = useReducer((state) => ++state % accents.length, 0)
  const [triggerImpulse, setTriggerImpulse] = useState(0);
  
  const connectors = useMemo(() => shuffle(accent), [accent])

  const handleCanvasClick = () => {
    click();
    setTriggerImpulse(prev => prev + 1);
  };

  return (
    <Canvas
      onClick={handleCanvasClick}
      dpr={[1, 1.5]}
      gl={{ antialias: false }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
    >
      <color attach="background" args={['#151615']} />
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow>
        <perspectiveCamera
          attach="shadow-camera"
          args={[
            15,
            1,
            1,
            20
          ]}
        />
        <bufferAttribute attach="shadow.mapSize" array={new Float32Array([512, 512])} itemSize={2} />
      </spotLight>

      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} maxSubSteps={3}>
          <Pointer />
          {connectors.map((props, i) => <Connector key={i} triggerImpulse={triggerImpulse} {...props} />)}
        </Physics>
      </Suspense>

      <EffectComposer disableNormalPass multisampling={4}>
        <N8AO distanceFalloff={1} aoRadius={1} intensity={3.5} />
      </EffectComposer>

      <Environment resolution={256}>
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
  const pos = useMemo(() => position || [r(10), r(10), r(10)], [])

  const offset = useMemo(() => ({
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2
  }), [])

  useFrame((state, delta) => {
    if (!api.current) return
    const t = state.clock.getElapsedTime()

    const currentPosition = api.current.translation()

    const inward = {
      x: -currentPosition.x * 0.3,
      y: -currentPosition.y * 0.3,
      z: -currentPosition.z * 0.3
    }

    inward.x += Math.sin(t * 0.8 + offset.x) * 0.1
    inward.y += Math.cos(t * 1.0 + offset.y) * 0.1
    inward.z += Math.sin(t * 0.6 + offset.z) * 0.05

    api.current.applyImpulse(inward, true)

    api.current.applyTorqueImpulse({
      x: Math.sin(t + offset.x) * 0.001,
      y: Math.cos(t + offset.y) * 0.001,
      z: Math.sin(t + offset.z) * 0.001
    }, true)
  })

  useEffect(() => {
    if (api.current && triggerImpulse > 0) {
      const currentPosition = api.current.translation();
      const impulseDirection = new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z).normalize();
      const impulseMagnitude = 50;

      api.current.applyImpulse(impulseDirection.multiplyScalar(impulseMagnitude), true);
      console.log(`Applied impulse to connector at ${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}`);
    }
  }, [triggerImpulse]);

  return (
    <RigidBody
      linearDamping={2}  
      angularDamping={0.5}  
      friction={0.1}
      restitution={0.9}
      position={pos}
      colliders={false}
      canSleep={false}  
    >
      <CuboidCollider args={[0.6, 1.27, 0.6]} />
      <CuboidCollider args={[1.27, 0.6, 0.6]} />
      <CuboidCollider args={[0.6, 0.6, 1.27]} />
      {children ? children : <Model {...props} />}
      {accent && <pointLight intensity={3} distance={3} color={props.color} />}
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
  // Configure useGLTF with DRACOLoader
  const { nodes } = useGLTF('/c-transformed.glb', (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
  });

  useEffect(() => {
    if (nodes) {
      console.log("GLTF Nodes loaded:", nodes);
      console.log("Available node names:", Object.keys(nodes));
    } else {
      console.log("GLTF Nodes is undefined, model might not be loaded yet or failed.");
    }
  }, [nodes]);

  useFrame((state, delta) => {
    // Check if the specific mesh 'connector' exists and has a material
    if (nodes.connector && nodes.connector.isMesh && nodes.connector.material) {
      // Directly set the color on the material of the 'connector' mesh
      nodes.connector.material.color.set(color);
      // You can also apply other material properties here if needed, e.g.:
      // nodes.connector.material.roughness = roughness;
      // nodes.connector.material.metalness = metalness;
      // nodes.connector.material.clearcoat = clearcoat;
    }
  })

  return (
    // Render the specific 'connector' mesh from the nodes object
    // This assumes 'nodes.connector' is indeed a THREE.Mesh
    <primitive object={nodes.connector} scale={5} castShadow receiveShadow />
  )
}
