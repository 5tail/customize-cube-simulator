import * as THREE from 'three'

/**
 * 產生「保留六面材質分組」的圓角方塊幾何。
 *
 * 為什麼不用 drei 的 RoundedBox：它的幾何不保留 BoxGeometry 的六個
 * material group，一顆方塊六面各自指定顏色/貼圖會全部亂掉（實測過）。
 *
 * 做法：
 * 1. 從有細分段數的 BoxGeometry 出發。
 * 2. 先把均勻的格線「重新分配」：一半格數留給平面區、一半集中到
 *    邊緣圓弧區——否則圓弧只分到一格，會變成「整面微凸＋邊緣仍銳利」
 *    的錯誤外觀（第一版踩過的坑）。
 * 3. 頂點夾進「內縮 radius 的小盒子」再沿夾出方向外推 radius：
 *    平面區保持真平面，邊與角變成真圓弧；法線＝外推方向（圓弧上精確）。
 * 4. 依各面的軸向重算 UV（貼圖按最終位置線性對應，不因格線重分配而扭曲）。
 */

// 每面 UV 對應的軸向（同 three.js BoxGeometry 的方向約定，材質順序 +x,-x,+y,-y,+z,-z）
// u/v: [軸, 正負]；uv 值 = 0.5 ± 座標/邊長
const FACE_UV_AXES = [
  { u: ['z', -1], v: ['y', 1] }, // +x 右
  { u: ['z', 1], v: ['y', 1] }, // -x 左
  { u: ['x', 1], v: ['z', -1] }, // +y 上
  { u: ['x', 1], v: ['z', 1] }, // -y 下
  { u: ['x', 1], v: ['y', 1] }, // +z 前
  { u: ['x', -1], v: ['y', 1] }, // -z 後
]

export function createRoundedBoxGeometry(size, radius, segments = 16) {
  const geo = new THREE.BoxGeometry(size, size, size, segments, segments, segments)
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const uv = geo.attributes.uv
  const half = size / 2
  const inner = Math.max(half - radius, 0)

  // 格線重分配：|c|/half ∈ [0, 0.5] → 平面區 [0, inner]；(0.5, 1] → 圓弧區 (inner, half]
  const remap = (c) => {
    const a = Math.abs(c) / half
    const b = a <= 0.5 ? (a / 0.5) * inner : inner + ((a - 0.5) / 0.5) * (half - inner)
    return Math.sign(c) * b
  }

  const v = new THREE.Vector3()
  const clamped = new THREE.Vector3()
  const dir = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    v.set(remap(v.x), remap(v.y), remap(v.z))
    clamped.set(
      THREE.MathUtils.clamp(v.x, -inner, inner),
      THREE.MathUtils.clamp(v.y, -inner, inner),
      THREE.MathUtils.clamp(v.z, -inner, inner)
    )
    dir.subVectors(v, clamped)
    if (dir.lengthSq() > 0) {
      dir.normalize()
      pos.setXYZ(
        i,
        clamped.x + dir.x * radius,
        clamped.y + dir.y * radius,
        clamped.z + dir.z * radius
      )
      nor.setXYZ(i, dir.x, dir.y, dir.z)
    } else {
      pos.setXYZ(i, v.x, v.y, v.z) // radius = 0 時退化為普通方塊，保留原法線
    }
  }

  // 依最終位置重算各面 UV（group ＝ 面，頂點不跨面共用）
  const index = geo.index
  for (const group of geo.groups) {
    const axes = FACE_UV_AXES[group.materialIndex]
    const seen = new Set()
    for (let i = group.start; i < group.start + group.count; i++) {
      const vi = index.getX(i)
      if (seen.has(vi)) continue
      seen.add(vi)
      const p = { x: pos.getX(vi), y: pos.getY(vi), z: pos.getZ(vi) }
      uv.setXY(
        vi,
        0.5 + (axes.u[1] * p[axes.u[0]]) / size,
        0.5 + (axes.v[1] * p[axes.v[0]]) / size
      )
    }
  }

  pos.needsUpdate = true
  nor.needsUpdate = true
  uv.needsUpdate = true
  return geo
}
