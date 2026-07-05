import { generateCubies } from './cubeGeometry.js'

const CUBIE_SIZE = 0.95 // 略小於 1，讓小方塊之間有縫，看得出是 27 顆

const cubies = generateCubies()

export default function RubiksCube() {
  return (
    <group>
      {cubies.map((cubie) => (
        <mesh key={cubie.position.join(',')} position={cubie.position}>
          <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
          {cubie.colors.map((color, i) => (
            <meshStandardMaterial
              key={i}
              attach={`material-${i}`}
              color={color}
              roughness={0.3}
            />
          ))}
        </mesh>
      ))}
    </group>
  )
}
