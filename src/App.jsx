import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import RubiksCube from './RubiksCube.jsx'
import { FACE_COLORS } from './cubeGeometry.js'
import {
  FACE_LABELS,
  MAX_FILE_SIZE_MB,
  MIN_SCALE,
  MAX_SCALE,
  validateImageFile,
} from './faceImages.js'
import './App.css'

export default function App() {
  // { front: { url, imgW, imgH, scale, panX, panY }, ... }；沒選圖的面不會有 key
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
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setFaceImages((prev) => {
        if (prev[face]) URL.revokeObjectURL(prev[face].url)
        return {
          ...prev,
          [face]: {
            url,
            imgW: img.naturalWidth,
            imgH: img.naturalHeight,
            scale: 1,
            panX: 0.5,
            panY: 0.5,
          },
        }
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError(`${FACE_LABELS[face]}：無法讀取這個檔案`)
    }
    img.src = url
  }

  function handleClear(face) {
    setError('')
    setFaceImages((prev) => {
      if (!prev[face]) return prev
      URL.revokeObjectURL(prev[face].url)
      const next = { ...prev }
      delete next[face]
      return next
    })
  }

  function updateCrop(face, key, value) {
    setFaceImages((prev) =>
      prev[face] ? { ...prev, [face]: { ...prev[face], [key]: value } } : prev
    )
  }

  return (
    <div className="app">
      <div className="panel">
        <h1>小丸號客製方塊模擬器</h1>
        <p className="hint">拖曳旋轉方塊，選圖片貼到各面（jpg/png，{MAX_FILE_SIZE_MB}MB 以內）</p>
        {Object.keys(FACE_LABELS).map((face) => (
          <div className="face-block" key={face}>
            <div className="face-row">
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
                  <img className="thumb" src={faceImages[face].url} alt="" />
                  <button className="btn btn-clear" onClick={() => handleClear(face)}>
                    清除
                  </button>
                </>
              )}
            </div>
            {faceImages[face] && (
              <div className="crop-row">
                <label>
                  縮放
                  <input
                    type="range"
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step="0.05"
                    value={faceImages[face].scale}
                    data-crop={`${face}-scale`}
                    onChange={(e) => updateCrop(face, 'scale', Number(e.target.value))}
                  />
                </label>
                <label>
                  左右
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={faceImages[face].panX}
                    data-crop={`${face}-panX`}
                    onChange={(e) => updateCrop(face, 'panX', Number(e.target.value))}
                  />
                </label>
                <label>
                  上下
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={faceImages[face].panY}
                    data-crop={`${face}-panY`}
                    onChange={(e) => updateCrop(face, 'panY', Number(e.target.value))}
                  />
                </label>
              </div>
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
