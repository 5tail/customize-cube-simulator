import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import RubiksCube from './RubiksCube.jsx'
import { FACE_COLORS } from './cubeGeometry.js'
import { FACE_LABELS, validateImageFile } from './faceImages.js'
import './App.css'

export default function App() {
  // { front: objectURL, ... }；沒選圖的面不會有 key
  const [faceImages, setFaceImages] = useState({})
  const [error, setError] = useState('')

  function handleSelect(face, fileList) {
    const file = fileList && fileList[0]
    if (!file) return
    const result = validateImageFile(file)
    if (!result.ok) {
      setError(`${FACE_LABELS[face]}：${result.error}`)
      return
    }
    setError('')
    setFaceImages((prev) => {
      if (prev[face]) URL.revokeObjectURL(prev[face])
      return { ...prev, [face]: URL.createObjectURL(file) }
    })
  }

  function handleClear(face) {
    setError('')
    setFaceImages((prev) => {
      if (!prev[face]) return prev
      URL.revokeObjectURL(prev[face])
      const next = { ...prev }
      delete next[face]
      return next
    })
  }

  return (
    <div className="app">
      <div className="panel">
        <h1>客製化魔術方塊</h1>
        <p className="hint">拖曳旋轉方塊，選圖片貼到各面（jpg/png，5MB 以內）</p>
        {Object.keys(FACE_LABELS).map((face) => (
          <div className="face-row" key={face}>
            <span
              className="swatch"
              style={{ background: FACE_COLORS[face] }}
              aria-hidden="true"
            />
            <span className="face-name">{FACE_LABELS[face]}</span>
            <label className="btn">
              {faceImages[face] ? '換圖' : '選圖'}
              <input
                type="file"
                accept="image/jpeg,image/png"
                data-face={face}
                onChange={(e) => {
                  handleSelect(face, e.target.files)
                  e.target.value = '' // 讓同一張圖可以重選
                }}
              />
            </label>
            {faceImages[face] && (
              <>
                <img className="thumb" src={faceImages[face]} alt="" />
                <button className="btn btn-clear" onClick={() => handleClear(face)}>
                  清除
                </button>
              </>
            )}
          </div>
        ))}
        {error && <p className="error">{error}</p>}
      </div>

      <Canvas camera={{ position: [4.5, 4.5, 4.5], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} />
        <RubiksCube faceImages={faceImages} />
        {/* 只允許拖曳旋轉與縮放，關掉平移避免方塊被拖出畫面 */}
        <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
      </Canvas>
    </div>
  )
}
