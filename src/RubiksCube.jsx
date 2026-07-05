import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { generateCubies, FACE_ORDER, getFaceTile } from './cubeGeometry.js'
import { createRoundedBoxGeometry } from './roundedBoxGeometry.js'
import { computeCropWindow, computeTileMatrix } from './faceImages.js'
import { createSolvedState, applyMove, randomScramble } from './cubeState.js'
import { dominantAxisIndex, perpAxes, chooseRotation, snapSteps } from './dragTurn.js'

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
const AXIS_NAMES = ['x', 'y', 'z']
const TURN_SPEED = 9 // 弧度/秒：一個 90 度轉約 0.17 秒
const DRAG_THRESHOLD_PX = 8 // 拖曳超過這個距離才判定為撥層（否則視為誤觸）
const DRAG_SENSITIVITY = 2.5 // 撥層靈敏度：1 = 跟手 1:1（轉 90 度要拖 400+px，太硬）

/** 觸點沿某切向移動時，對應的螢幕像素方向與速率（像素／弧度） */
function screenDelta(camera, size, point, tangent) {
  const eps = 0.001
  const a = point.clone().project(camera)
  const b = point.clone().addScaledVector(tangent, eps).project(camera)
  return {
    x: (((b.x - a.x) / eps) * size.width) / 2,
    y: ((-(b.y - a.y) / eps) * size.height) / 2, // 螢幕 y 向下，NDC y 向上
  }
}

/**
 * faceImages: { front: { url, imgW, imgH, scale, panX, panY, rot }, ... }
 * 沒選圖的面沒有 key。
 * ref 提供 scramble() / reset()；onBusyChange(bool) 通知動畫進行中。
 */
const RubiksCube = forwardRef(function RubiksCube(
  { faceImages = {}, onBusyChange, controlsRef },
  ref
) {
  const [textures, setTextures] = useState({})
  const { camera, size } = useThree()

  // ---- 單層轉動（打亂/復原＋手動撥層）----
  const meshRefs = useRef([]) // 27 顆 mesh
  const stateRef = useRef(createSolvedState(CUBIE_POSITIONS)) // 邏輯狀態
  const queueRef = useRef([]) // 打亂待執行的步驟
  const activeRef = useRef(null) // 打亂動畫中的一步 { move, angle }
  const dragRef = useRef(null) // 手動撥層進行中的資料
  const viewRef = useRef({ camera, size })
  viewRef.current = { camera, size }
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

  // 把某一層依角度轉到位（動畫的每一幀）
  function applyLayerVisual(axisIndex, layer, angle) {
    tmpQuat.setFromAxisAngle(AXIS_VECTORS[AXIS_NAMES[axisIndex]], angle)
    stateRef.current.forEach((c, i) => {
      if (c.pos[axisIndex] !== layer) return
      const mesh = meshRefs.current[i]
      if (!mesh) return
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2]).applyQuaternion(tmpQuat)
      baseQuat.set(c.quat[0], c.quat[1], c.quat[2], c.quat[3])
      mesh.quaternion.copy(tmpQuat).multiply(baseQuat)
    })
  }

  function setControlsEnabled(enabled) {
    if (controlsRef?.current) controlsRef.current.enabled = enabled
  }

  function endDrag() {
    dragRef.current = null
    setControlsEnabled(true)
  }

  useImperativeHandle(ref, () => ({
    scramble() {
      if (activeRef.current || dragRef.current) return // 動畫或撥層中不觸發
      queueRef.current = randomScramble(18)
      activeRef.current = { move: queueRef.current.shift(), angle: 0 }
      onBusyChange?.(true)
    },
    reset() {
      queueRef.current = []
      activeRef.current = null
      endDrag()
      stateRef.current = createSolvedState(CUBIE_POSITIONS)
      syncMeshes()
      onBusyChange?.(false)
    },
  }))

  // ---- 手動撥層：按在方塊上拖 ----
  function handlePointerDown(e) {
    if (activeRef.current || dragRef.current || !e.face) return
    e.stopPropagation()
    // 面法線轉到世界座標，吸到主軸（圓角區的斜法線也吸得回來）
    const n = e.face.normal.clone().transformDirection(e.object.matrixWorld)
    const p = e.object.position
    dragRef.current = {
      startX: e.nativeEvent.clientX,
      startY: e.nativeEvent.clientY,
      point: e.point.clone(),
      normalAxis: dominantAxisIndex([n.x, n.y, n.z]),
      cubiePos: [Math.round(p.x), Math.round(p.y), Math.round(p.z)],
      axisIndex: null, // 拖曳超過閾值後才決定
      layer: 0,
      screenDir: null,
      angle: 0,
      settleTarget: null,
    }
    setControlsEnabled(false) // 撥層時不轉視角
    window.addEventListener('pointermove', handleWindowMove)
    window.addEventListener('pointerup', handleWindowUp)
  }

  function handleWindowMove(ev) {
    const drag = dragRef.current
    if (!drag || drag.settleTarget != null) return
    const dx = ev.clientX - drag.startX
    const dy = ev.clientY - drag.startY
    if (drag.axisIndex == null) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
      const { camera: cam, size: sz } = viewRef.current
      const candidates = perpAxes(drag.normalAxis).map((axisIndex) => {
        const tangent = new THREE.Vector3()
          .crossVectors(AXIS_VECTORS[AXIS_NAMES[axisIndex]], drag.point)
        return { axisIndex, screenDir: screenDelta(cam, sz, drag.point, tangent) }
      })
      const pick = chooseRotation({ x: dx, y: dy }, candidates)
      if (!pick) return
      drag.axisIndex = pick.axisIndex
      drag.layer = drag.cubiePos[pick.axisIndex]
      drag.screenDir = candidates.find((c) => c.axisIndex === pick.axisIndex).screenDir
    }
    const sd = drag.screenDir
    const len2 = sd.x * sd.x + sd.y * sd.y
    const angle = ((dx * sd.x + dy * sd.y) / len2) * DRAG_SENSITIVITY
    drag.angle = Math.max(-Math.PI, Math.min(Math.PI, angle)) // 一次最多 180 度
  }

  function handleWindowUp() {
    window.removeEventListener('pointermove', handleWindowMove)
    window.removeEventListener('pointerup', handleWindowUp)
    const drag = dragRef.current
    if (!drag) return
    if (drag.axisIndex == null) {
      endDrag() // 沒超過閾值＝誤觸，什麼都不做
      return
    }
    drag.settleTarget = snapSteps(drag.angle) * (Math.PI / 2) // 吸到 90 度倍數
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleWindowMove)
      window.removeEventListener('pointerup', handleWindowUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, delta) => {
    // 模式一：打亂動畫
    const active = activeRef.current
    if (active) {
      active.angle = Math.min(active.angle + TURN_SPEED * delta, Math.PI / 2)
      const { axis, layer, dir } = active.move
      applyLayerVisual(AXIS_INDEX[axis], layer, dir * active.angle)
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
      return
    }
    // 模式二：手動撥層（跟手／放開後吸附）
    const drag = dragRef.current
    if (!drag || drag.axisIndex == null) return
    if (drag.settleTarget == null) {
      applyLayerVisual(drag.axisIndex, drag.layer, drag.angle) // 跟著手指
      return
    }
    const diff = drag.settleTarget - drag.angle
    const step = TURN_SPEED * delta
    if (Math.abs(diff) <= step) {
      // 吸附完成：把整數步寫回邏輯狀態
      const steps = Math.round(drag.settleTarget / (Math.PI / 2))
      let s = stateRef.current
      for (let i = 0; i < Math.abs(steps); i++) {
        s = applyMove(s, {
          axis: AXIS_NAMES[drag.axisIndex],
          layer: drag.layer,
          dir: Math.sign(steps),
        })
      }
      stateRef.current = s
      endDrag()
      syncMeshes()
    } else {
      drag.angle += Math.sign(diff) * step
      applyLayerVisual(drag.axisIndex, drag.layer, drag.angle)
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
    <group onPointerDown={handlePointerDown}>
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
