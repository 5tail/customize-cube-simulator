import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import RubiksCube from './RubiksCube.jsx'

export default function App() {
  return (
    <Canvas camera={{ position: [4.5, 4.5, 4.5], fov: 45 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} />
      <RubiksCube />
      {/* 只允許拖曳旋轉與縮放，關掉平移避免方塊被拖出畫面 */}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
    </Canvas>
  )
}
