// Original, locally generated demo assets. No external model or license required.
import { TorusKnotGeometry, IcosahedronGeometry } from 'three';
import { writeFile } from 'node:fs/promises';

async function writeMesh(filename, color, roughness) {
  const geometries = [new TorusKnotGeometry(0.8, 0.23, 96, 12), new IcosahedronGeometry(1.1, 2)];
  const buffers = [], views = [], accessors = [], meshes = [];
  let offset = 0;
  const append = (array, type, componentType, count, min, max) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    buffers.push(padded); offset += padded.length;
    const accessor = { bufferView: views.length - 1, componentType, count, type };
    if (min) accessor.min = min; if (max) accessor.max = max;
    accessors.push(accessor); return accessors.length - 1;
  };
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    const p = append(position.array, 'VEC3', 5126, position.count, geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray());
    const n = append(normal.array, 'VEC3', 5126, normal.count);
    const primitive = { attributes: { POSITION: p, NORMAL: n }, material: 0 };
    if (geometry.index) primitive.indices = append(geometry.index.array, 'SCALAR', geometry.index.array instanceof Uint32Array ? 5125 : 5123, geometry.index.count);
    meshes.push({ primitives: [primitive] });
    geometry.dispose();
  }
  const json = { asset: { version: '2.0', generator: 'CyDoc original demo' }, scene: 0, scenes: [{ name: 'Torus knot', nodes: [0] }, { name: 'Faceted sphere', nodes: [1] }], nodes: [{ mesh: 0 }, { mesh: 1 }], meshes, materials: [{ name: 'PBR demo', pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0.75, roughnessFactor: roughness } }], buffers: [{ byteLength: offset }], bufferViews: views, accessors };
  const text = Buffer.from(JSON.stringify(json)); const paddedJson = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20); text.copy(paddedJson);
  const binary = Buffer.concat(buffers); const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + binary.length, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(paddedJson.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  await writeFile(filename, Buffer.concat([header, jsonHeader, paddedJson, binHeader, binary]));
}
await writeMesh('assets/sample-a.glb', [0.12, 0.65, 0.43], 0.2);
await writeMesh('assets/sample-b.glb', [0.65, 0.35, 0.12], 0.65);
