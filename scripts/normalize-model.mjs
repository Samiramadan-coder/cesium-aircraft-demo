// Normalizes an aircraft .glb in place so the app needs no per-model
// settings: nose along glTF +Z (which Cesium flies forward), Y up, meters,
// and the origin at the bottom of the wheels, so an aircraft placed on the
// ground sits on it (and grows upward, not into it, when Cesium enlarges it).
//
//   npm run normalize-model -- public/models/aircraft-6.glb --nose +x
//   npm run normalize-model -- public/models/big.glb --nose -z --scale 0.02
//
// --nose   the axis the nose points along in the file as it is now
//          (+x, -x, +z or -z; open it in any glTF viewer to check).
// --scale  optional size multiplier, for models not modelled in meters.
//
// The correction is a new root node wrapping the scene, so the geometry is
// untouched. The file is stamped; running it again on a stamped file only
// re-levels the wheels (--nose and --scale are then ignored).

import { readFileSync, writeFileSync } from "node:fs";

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"
const STAMP = "normalizedForCesiumAircraftDemo";

// Rotation about +Y (as a glTF [x, y, z, w] quaternion) that turns each nose
// axis into +Z.
const s = Math.SQRT1_2;
const ROTATIONS = {
  "+z": [0, 0, 0, 1],
  "+x": [0, -s, 0, s], // -90° about Y
  "-x": [0, s, 0, s], // +90° about Y
  "-z": [0, 1, 0, 0], // 180° about Y
};

function parseArgs(argv) {
  const files = [];
  let nose;
  let scale = 1;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--nose") nose = argv[++i]?.toLowerCase();
    else if (argv[i] === "--scale") scale = Number(argv[++i]);
    else files.push(argv[i]);
  }
  if (!files.length || !(nose in ROTATIONS) || !(scale > 0)) {
    console.error(
      "Usage: npm run normalize-model -- <file.glb>... --nose <+x|-x|+z|-z> [--scale <n>]",
    );
    process.exit(1);
  }
  return { files, nose, scale };
}

// --- Lowest point of the scene, through the node hierarchy ---------------

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

/** Column-major 4x4 matrix of a glTF node (matrix or TRS). */
function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Lowest Y of every mesh under `nodeIndex`, using the accessors' bounds. */
function lowestY(json, nodeIndex, parent = IDENTITY) {
  const node = json.nodes[nodeIndex];
  const matrix = multiply(parent, nodeMatrix(node));
  let lowest = Infinity;
  for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
    const { min, max } = json.accessors[primitive.attributes.POSITION];
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) {
          const worldY =
            matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
          lowest = Math.min(lowest, worldY);
        }
  }
  for (const child of node.children ?? []) {
    lowest = Math.min(lowest, lowestY(json, child, matrix));
  }
  return lowest;
}

function normalize(file, nose, scale) {
  const glb = readFileSync(file);
  if (
    glb.readUInt32LE(0) !== GLB_MAGIC ||
    glb.readUInt32LE(16) !== JSON_CHUNK
  ) {
    throw new Error(`${file} is not a binary glTF (.glb) file`);
  }
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  const rest = glb.subarray(20 + jsonLength); // BIN chunk, copied as is

  json.asset.extras ??= {};
  const scene = json.scenes[json.scene ?? 0];
  const stamped = Boolean(json.asset.extras[STAMP]);

  let root;
  if (stamped) {
    root = json.nodes[scene.nodes[0]];
  } else {
    root = { name: "normalized-root", children: scene.nodes };
    if (nose !== "+z") root.rotation = ROTATIONS[nose];
    if (scale !== 1) root.scale = [scale, scale, scale];
    json.nodes.push(root);
    scene.nodes = [json.nodes.length - 1];
    json.asset.extras[STAMP] = { nose, scale };
  }

  // Wheels on the origin: lift the whole scene by its lowest point.
  delete root.translation;
  const lift = -lowestY(json, scene.nodes[0]);
  if (Math.abs(lift) > 1e-6) root.translation = [0, lift, 0];

  // The JSON chunk must stay 4-byte aligned, padded with spaces.
  let text = Buffer.from(JSON.stringify(json), "utf8");
  const padding = (4 - (text.length % 4)) % 4;
  text = Buffer.concat([text, Buffer.alloc(padding, 0x20)]);

  const header = Buffer.alloc(20);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + text.length + rest.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.writeUInt32LE(JSON_CHUNK, 16);
  writeFileSync(file, Buffer.concat([header, text, rest]));
  console.log(
    stamped
      ? `${file}: already normalized; wheels lifted ${lift.toFixed(2)} m`
      : `${file}: nose ${nose} -> +z${scale !== 1 ? `, scale ${scale}` : ""}, wheels lifted ${lift.toFixed(2)} m`,
  );
}

const { files, nose, scale } = parseArgs(process.argv.slice(2));
for (const file of files) normalize(file, nose, scale);
