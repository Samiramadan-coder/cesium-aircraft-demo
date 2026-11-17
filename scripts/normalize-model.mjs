// Normalizes an aircraft .glb in place so the app needs no per-model
// settings: nose along glTF +Z (which Cesium flies forward), Y up, meters.
//
//   npm run normalize-model -- public/models/aircraft-6.glb --nose +x
//   npm run normalize-model -- public/models/big.glb --nose -z --scale 0.02
//
// --nose   the axis the nose points along in the file as it is now
//          (+x, -x, +z or -z; open it in any glTF viewer to check).
// --scale  optional size multiplier, for models not modelled in meters.
//
// The correction is a new root node wrapping the scene, so the geometry is
// untouched. The file is stamped, and a second run on it is refused.

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

function normalize(file, nose, scale) {
  const glb = readFileSync(file);
  if (glb.readUInt32LE(0) !== GLB_MAGIC || glb.readUInt32LE(16) !== JSON_CHUNK) {
    throw new Error(`${file} is not a binary glTF (.glb) file`);
  }
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  const rest = glb.subarray(20 + jsonLength); // BIN chunk, copied as is

  json.asset.extras ??= {};
  if (json.asset.extras[STAMP]) {
    console.log(`${file}: already normalized, skipped`);
    return;
  }

  const sceneIndex = json.scene ?? 0;
  const scene = json.scenes[sceneIndex];
  const root = { name: "normalized-root", children: scene.nodes };
  if (nose !== "+z") root.rotation = ROTATIONS[nose];
  if (scale !== 1) root.scale = [scale, scale, scale];
  json.nodes.push(root);
  scene.nodes = [json.nodes.length - 1];
  json.asset.extras[STAMP] = { nose, scale };

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
  console.log(`${file}: nose ${nose} -> +z${scale !== 1 ? `, scale ${scale}` : ""}`);
}

const { files, nose, scale } = parseArgs(process.argv.slice(2));
for (const file of files) normalize(file, nose, scale);
