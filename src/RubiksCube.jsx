import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { generateCubies, FACE_ORDER, getFaceTile } from './cubeGeometry.js'
import { createRoundedBoxGeometry } from './roundedBoxGeometry.js'
import { computeCropWindow, computeTileMatrix } from './faceImages.js'
import { createSolvedState, applyMove, randomScramble } from './cubeState.js'

// 縫隙寬 = 1 - CUBIE_SIZE。使用者 2026-07-05 定案：很窄的縫（0.015）
// ?size=0.95 之類的網址參數可暫時覆蓋方便比較；圓角半徑同理用 ?radius=
const urlParams = new URLSearchParams(window.location.search)
const CUBIE_SIZE = Number(urlParams.get('size')) || 0.985
const EDGE_RADIUS = Number(urlParams.get('radius')) || 0.08

// 27 顆共用同一份幾何
const cubieGeometry = createRoundedBoxGeometry(CUBIE_SIZE, EDGE_RADIUS)

const cubies = generateCubies()

/** 單一貼紙的材質：有貼圖用貼圖，沒貼圖維持素色 */
function StickerMaterial({ slot, color, map }) {
  return (
    <meshStandardMaterial
      // 材質從「無貼圖」變「有貼圖」時 shader 需要重編譯；
      // 用 key 讓 React 直接重建材質，避開 needsUpdate 沒觸發的問題
      key={map ? map.uuid : 'plain'}
      attach={`material-${slot}`}
      color={map ? '#ffffff' : color}
      map={map || null}
      roughness={0.3}
    />
  )
}

const CUBIE_POSITIONS = cubies.map((c) => c.position)
const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}
const AXIS_INDEX = { x: 0, y: 1, z: 2 }
const TURN_SPEED = 9 // 弧度/秒：一個 90 度轉約 0.17 秒

/**
 * faceImages: { front: { url, imgW, imgH, scale, panX, panY, rot }, ... }
 * 沒選圖的面沒有 key。
 * ref 提供 scramble() / reset()；onBusyChange(bool) 通知動畫進行中。
 */
const RubiksCube = forwardRef(function RubiksCube({ faceImages = {}, onBusyChange }, ref) {
  const [textures, setTextures] = useState({})

  // ---- 單層轉動（打亂/復原）----
  const meshRefs = useRef([]) // 27 顆 mesh
  const stateRef = useRef(createSolvedState(CUBIE_POSITIONS)) // 邏輯狀態
  const queueRef = useRef([]) // 待執行的步驟
  const activeRef = useRef(null) // { move, angle }
  const tmpQuat = useRef(new THREE.Quaternion()).current
  const baseQuat = useRef(new THREE.Quaternion()).current

  // 把邏輯狀態一次寫回全部 27 顆 mesh
  function syncMeshes() {
    stateRef.current.forEach((c, i) => {
      const mesh = meshRefs.current[i]
      if (!mesh) return
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2])
      mesh.quaternion.set(c.quat[0], c.quat[1], c.quat[2], c.quat[3])
    })
  }

  useImperativeHandle(ref, () => ({
    scramble() {
      if (activeRef.current) return // 動畫中不重複觸發
      queueRef.current = randomScramble(18)
      activeRef.current = { move: queueRef.current.shift(), angle: 0 }
      onBusyChange?.(true)
    },
    reset() {
      queueRef.current = []
      activeRef.current = null
      stateRef.current = createSolvedState(CUBIE_POSITIONS)
      syncMeshes()
      onBusyChange?.(false)
    },
  }))

  useFrame((_, delta) => {
    const active = activeRef.current
    if (!active) return
    active.angle = Math.min(active.angle + TURN_SPEED * delta, Math.PI / 2)
    const { axis, layer, dir } = active.move
    const ai = AXIS_INDEX[axis]
    tmpQuat.setFromAxisAngle(AXIS_VECTORS[axis], dir * active.angle)
    stateRef.current.forEach((c, i) => {
      if (c.pos[ai] !== layer) return
      const mesh = meshRefs.current[i]
      if (!mesh) return
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2]).applyQuaternion(tmpQuat)
      baseQuat.set(c.quat[0], c.quat[1], c.quat[2], c.quat[3])
      mesh.quaternion.copy(tmpQuat).multiply(baseQuat)
    })
    if (active.angle >= Math.PI / 2 - 1e-9) {
      stateRef.current = applyMove(stateRef.current, active.move)
      syncMeshes()
      const next = queueRef.current.shift()
      if (next) {
        activeRef.current = { move: next, angle: 0 }
      } else {
        activeRef.current = null
        onBusyChange?.(false)
      }
    }
  })

  // 只有「圖片本身」換了才重新載入貼圖；拉滑桿（裁切參數）不觸發
  const urlKey = FACE_ORDER.map((f) => faceImages[f]?.url || '').join('|')

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const faces = FACE_ORDER.filter((f) => faceImages[f]?.url)
    let cancelled = false
    const loaded = {}

    Promise.all(
      faces.map(
        (face) =>
          new Promise((resolve) => {
            loader.load(
              faceImages[face].url,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey])

  // 每面預先做好 9 個貼紙格的貼圖（同一張圖的 9 個視窗），只在換圖時重建
  const tileTextures = useMemo(() => {
    const result = {}
    for (const face of FACE_ORDER) {
      const tex = textures[face]
      if (!tex) continue
      result[face] = Array.from({ length: 9 }, () => {
        const t = tex.clone()
        t.wrapS = THREE.ClampToEdgeWrapping
        t.wrapT = THREE.ClampToEdgeWrapping
        // UV 變換（含旋轉）由我們自己算好整個矩陣塞進去，不用內建的 offset/repeat
        t.matrixAutoUpdate = false
        t.needsUpdate = true
        return t
      })
    }
    return result
  }, [textures])

  useEffect(() => {
    return () => {
      Object.values(tileTextures).forEach((arr) => arr.forEach((t) => t.dispose()))
    }
  }, [tileTextures])

  // 拉滑桿時只改各格貼圖的 UV 矩陣（改 uniform，不重傳圖片、不重建材質）
  useEffect(() => {
    for (const face of FACE_ORDER) {
      const arr = tileTextures[face]
      const info = faceImages[face]
      if (!arr || !info) continue
      const win = computeCropWindow(info.imgW, info.imgH, info.scale, info.panX, info.panY)
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const m = computeTileMatrix(win, { col, row }, info.rot || 0)
          arr[row * 3 + col].matrix.set(m.a, m.b, m.tx, m.c, m.d, m.ty, 0, 0, 1)
        }
      }
    }
  }, [tileTextures, faceImages])

  return (
    <group>
      {cubies.map((cubie, ci) => (
        <mesh
          key={cubie.position.join(',')}
          ref={(el) => (meshRefs.current[ci] = el)}
          position={cubie.position}
          geometry={cubieGeometry}
        >
          {cubie.colors.map((color, i) => {
            const face = FACE_ORDER[i]
            const tile = getFaceTile(face, cubie.position)
            const map =
              tile && tileTextures[face] ? tileTextures[face][tile.row * 3 + tile.col] : null
            return <StickerMaterial key={i} slot={i} color={color} map={map} />
          })}
        </mesh>
      ))}
    </group>
  )
})

export default RubiksCube
