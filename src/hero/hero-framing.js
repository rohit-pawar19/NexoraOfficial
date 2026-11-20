/** Find the camera distance needed to contain every ribbon vertex in view space. */
export function fitRibbonVertices(positions, rotation, offset, tanX, topTan, bottomTan, distance) {
  const invX = 1 / tanX, invTop = 1 / topTan, invBottom = 1 / bottomTan;
  const right = .025 * invX, top = .025 * invTop, bottom = .025 * invBottom;
  const xx = rotation[0], xy = rotation[3], xz = rotation[6];
  const yx = rotation[1], yy = rotation[4], yz = rotation[7];
  const zx = rotation[2], zy = rotation[5], zz = rotation[8];
  const ox = offset.x, oy = offset.y, oz = offset.z;
  for (let i = 0; i < positions.length; i += 3) {
    const a = positions[i], b = positions[i + 1], c = positions[i + 2];
    const x = xx * a + xy * b + xz * c + ox;
    const y = yx * a + yy * b + yz * c + oy;
    const z = zx * a + zy * b + zz * c + oz;
    const candidate = z + Math.max(Math.abs(x) * invX + right, y * invTop + top, -y * invBottom + bottom);
    if (candidate > distance) distance = candidate;
  }
  return distance;
}
