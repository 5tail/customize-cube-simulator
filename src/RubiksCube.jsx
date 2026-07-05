import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { generateCubies, FACE_ORDER, getFaceTile } from './cubeGeometry.js'
import { createRoundedBoxGeometry } from './roundedBoxGeometry.js'

// 縫隙寬 = 1 - CUBIE_SIZE。使用者 2026-07-05 定案：很窄的縫（0.015）
// ?size=0.95 之類的網址參數可暫時覆蓋方便比較；圓角半徑同理用 ?radius=
const urlParams = new URLSearchParams(window.location.search)
const CUBIE_SIZE = Number(urlParams.get('size')) || 0.985
const EDGE_RADIUS = Number(urlParams.get('radius')) || 0.08

// 27 顆共用同一份幾何
const cubieGeometry = createRoundedBoxGeometry(CUBIE_SIZE, EDGE_RADIUS)

const cubies = generateCubies()

/**
 * 單一貼紙的材質：該面有圖片時，取圖片九宮格中對應的一格當貼圖；
 * 沒圖片時維持素色。
 */
function StickerMaterial({ slot, color, texture, tile }) {
  const map = useMemo(() => {
    if (!texture || !tile) return null
    const t = texture.clone()
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(1 / 3, 1 / 3)
    t.offset.set(tile.col / 3, tile.row / 3)
    t.needsUpdate = true
    return t
  }, [texture, tile])

  useEffect(() => {
    return () => {
      if (map) map.dispose()
    }
  }, [map])

  return (
    <meshStandardMaterial
      // 材質從「無貼圖」變「有貼圖」時 shader 需要重編譯；
      // 用 key 讓 React 直接重建材質，避開 needsUpdate 沒觸發的問題
      key={map ? map.uuid : 'plain'}
      attach={`material-${slot}`}
      color={map ? '#ffffff' : color}
      map={map}
      roughness={0.3}
    />
  )
}

/**
 * faceImages: { front: objectURL, up: ..., ... }，值為 null/undefined 表示該面沒圖
 */
export default function RubiksCube({ faceImages = {} }) {
  const [textures, setTextures] = useState({})

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const faces = FACE_ORDER.filter((f) => faceImages[f])
    let cancelled = false
    const loaded = {}

    Promise.all(
      faces.map(
        (face) =>
          new Promise((resolve) => {
            loader.load(
              faceImages[face],
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace
                loaded[face] = tex
                resolve()
              },
              undefined,
              () => resolve() // 載入失敗就當該面沒圖，不讓整顆方塊掛掉
            )
          })
      )
    ).then(() => {
      if (!cancelled) setTextures(loaded)
    })

    return () => {
      cancelled = true
      Object.values(loaded).forEach((t) => t.dispose())
    }
  }, [faceImages])

  return (
    <group>
      {cubies.map((cubie) => (
        <mesh key={cubie.position.join(',')} position={cubie.position} geometry={cubieGeometry}>
          {cubie.colors.map((color, i) => {
            const face = FACE_ORDER[i]
            return (
              <StickerMaterial
                key={i}
                slot={i}
                color={color}
                texture={textures[face] || null}
                tile={getFaceTile(face, cubie.position)}
              />
            )
          })}
        </mesh>
      ))}
    </group>
  )
}
