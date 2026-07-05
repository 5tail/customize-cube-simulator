import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import RubiksCube from './RubiksCube.jsx'
import { FACE_COLORS } from './cubeGeometry.js'
import {
  FACE_LABELS,
  MAX_FILE_SIZE_MB,
  MIN_SCALE,
  MAX_SCALE,
  MAX_ROTATION,
  validateImageFile,
} from './faceImages.js'
import { computeQuote, toggleOption } from './quote.js'
import pricing from './pricing.json'
import './App.css'

export default function App() {
  // { front: { url, imgW, imgH, scale, panX, panY, rot }, ... }；沒選圖的面不會有 key
  const [faceImages, setFaceImages] = useState({})
  const [error, setError] = useState('')
  const cubeRef = useRef(null)
  const glRef = useRef(null)
  const controlsRef = useRef(null)
  const [scrambling, setScrambling] = useState(false)
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState([])
  // 手機上面板預設收合（避免擋到方塊）；電腦預設展開
  const [panelOpen, setPanelOpen] = useState(
    () => window.matchMedia('(min-width: 601px)').matches
  )

  const quote = computeQuote(pricing, qty, selectedOptions)
  const money = (n) => `${pricing.currency}${n.toLocaleString('zh-TW')}`

  function handleScreenshot() {
    const canvas = glRef.current?.domElement
    if (!canvas) return
    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '_')
      .replaceAll(':', '')
      .replaceAll('-', '')
    // 用 Blob 而不是 dataURL：檔名才會生效，大圖也不受 dataURL 長度限制
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `小丸號方塊模擬_${stamp}.png`
      link.href = url
      document.body.appendChild(link) // Firefox 需要掛進頁面 download 屬性才生效
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    }, 'image/png')
  }

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
            rot: 0,
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
      <div className={panelOpen ? 'panel' : 'panel panel-closed'}>
        <button
          className="panel-header"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <span className="panel-title">小丸號客製方塊模擬器</span>
          <span className="panel-arrow">{panelOpen ? '▼ 收合' : '▲ 展開'}</span>
        </button>
        {panelOpen && (
        <div className="panel-body">
        <p className="hint">拖曳旋轉方塊，選圖片貼到各面（jpg/png，{MAX_FILE_SIZE_MB}MB 以內）</p>
        <div className="actions">
          <button
            className="btn"
            disabled={scrambling}
            onClick={() => cubeRef.current?.scramble()}
          >
            {scrambling ? '打亂中…' : '打亂'}
          </button>
          <button className="btn" onClick={() => cubeRef.current?.reset()}>
            復原
          </button>
          <button className="btn" onClick={handleScreenshot}>
            截圖下載
          </button>
        </div>
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
                <label>
                  旋轉
                  <input
                    type="range"
                    min={-MAX_ROTATION}
                    max={MAX_ROTATION}
                    step="1"
                    value={faceImages[face].rot}
                    data-crop={`${face}-rot`}
                    onChange={(e) => updateCrop(face, 'rot', Number(e.target.value))}
                  />
                  <span className="deg">{faceImages[face].rot}°</span>
                </label>
              </div>
            )}
          </div>
        ))}
        {error && <p className="error">{error}</p>}

        <div className="quote">
          <h2>訂做費用試算</h2>
          <label className="qty-row">
            數量
            <input
              type="number"
              min="1"
              value={qty}
              data-quote="qty"
              onChange={(e) => setQty(Number(e.target.value))}
            />
            顆
          </label>
          {pricing.options.map((opt) => (
            <label className="opt-row" key={opt.id}>
              <input
                type="checkbox"
                checked={selectedOptions.includes(opt.id)}
                data-quote={opt.id}
                onChange={() =>
                  setSelectedOptions((prev) => toggleOption(pricing.options, prev, opt.id))
                }
              />
              {opt.label}（每顆 +{money(opt.perUnit)}）
            </label>
          ))}
          <p className="quote-line">
            單價 {money(quote.perUnit)}／顆
            {quote.optionsPerUnit > 0 && (
              <span className="hint">
                （{money(quote.tier.unitPrice)} ＋加購 {money(quote.optionsPerUnit)}）
              </span>
            )}
          </p>
          <p className="quote-total" data-quote="total">
            總計 {money(quote.total)}
          </p>
          {quote.next && (
            <p className="hint">
              滿 {quote.next.minQty} 顆單價降為 {money(quote.next.unitPrice)}／顆
            </p>
          )}
          <p className="hint">{pricing.note}</p>
          <div className="contact">
            <p className="contact-title">點我諮詢客服小幫手</p>
            <div className="contact-links">
              <a className="btn" href={`mailto:${pricing.contact.email}`}>
                ✉️ Email
              </a>
              <a
                className="btn"
                href={pricing.contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                💬 LINE
              </a>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>

      <Canvas
        camera={{ position: [4.5, 4.5, 4.5], fov: 45 }}
        // 截圖需要保留繪圖緩衝，否則 toDataURL 會是空白
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          glRef.current = state.gl
          // 窄螢幕（手機直向）鏡頭拉遠，方塊才不會超出左右邊緣
          if (state.size.width / state.size.height < 0.7) {
            state.camera.position.setLength(10.5)
          }
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} />
        <RubiksCube
          ref={cubeRef}
          faceImages={faceImages}
          onBusyChange={setScrambling}
          controlsRef={controlsRef}
        />
        {/* 按空白處拖＝轉視角；按方塊上拖＝撥層（撥層時 controls 會被暫時關閉） */}
        <OrbitControls ref={controlsRef} enablePan={false} minDistance={4} maxDistance={12} />
      </Canvas>
    </div>
  )
}
