/**
 * Puts an aircraft model's wheels on its origin, at load time.
 *
 * Cesium places a model's origin on the position it is given, so a model
 * whose origin is its middle (most uploaded .glb files) sinks into the runway
 * by the distance down to its wheels, more as Cesium enlarges it to keep it
 * visible from far away. The bundled models are fixed in the file by
 * scripts/normalize-model.mjs; uploaded ones are fixed here the same way: the
 * scene is wrapped in a new root node lifted by its lowest point, and served
 * to Cesium as a blob URL. The geometry (BIN chunk) is copied as is.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"
const HEADER_BYTES = 20; // GLB header (12) + JSON chunk header (8)
/** Set by scripts/normalize-model.mjs; such a file is already right. */
const NORMALIZED_STAMP = "normalizedForCesiumAircraftDemo";
/** Smaller lifts than this (meters) aren't worth a rewrite. */
const MIN_LIFT_M = 0.01;

type Matrix = number[];

type GltfNode = {
  name?: string;
  children?: number[];
  mesh?: number;
  matrix?: Matrix;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};

type Gltf = {
  asset: { extras?: Record<string, unknown> };
  scene?: number;
  scenes: { nodes: number[] }[];
  nodes: GltfNode[];
  meshes?: { primitives: { attributes: { POSITION?: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
  buffers?: { uri?: string }[];
  images?: { uri?: string }[];
};

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Column-major 4x4 product a·b. */
function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

/** Column-major 4x4 matrix of a glTF node (matrix or TRS). */
function nodeMatrix(node: GltfNode): Matrix {
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

/** Lowest Y (glTF up) of every mesh under a node, from the accessor bounds. */
function lowestY(json: Gltf, nodeIndex: number, parent = IDENTITY): number {
  const node = json.nodes[nodeIndex];
  const matrix = multiply(parent, nodeMatrix(node));
  let lowest = Infinity;
  const primitives =
    node.mesh !== undefined ? (json.meshes?.[node.mesh]?.primitives ?? []) : [];
  for (const primitive of primitives) {
    const accessor =
      primitive.attributes.POSITION !== undefined
        ? json.accessors[primitive.attributes.POSITION]
        : undefined;
    // min/max are required on POSITION accessors by the glTF spec.
    if (!accessor?.min || !accessor.max) continue;
    const { min, max } = accessor;
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) {
          lowest = Math.min(
            lowest,
            matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
          );
        }
  }
  for (const child of node.children ?? []) {
    lowest = Math.min(lowest, lowestY(json, child, matrix));
  }
  return lowest;
}

/**
 * The model, rewritten so its wheels are on the origin; the same bytes when
 * already so. Throws if it isn't a .glb.
 */
export function groundGlb(glb: ArrayBuffer, sourceUrl: string): ArrayBuffer {
  const view = new DataView(glb);
  if (
    glb.byteLength < HEADER_BYTES ||
    view.getUint32(0, true) !== GLB_MAGIC ||
    view.getUint32(16, true) !== JSON_CHUNK
  ) {
    throw new Error("Not a binary glTF (.glb) file");
  }
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(glb, HEADER_BYTES, jsonLength),
    ),
  ) as Gltf;
  if (json.asset.extras?.[NORMALIZED_STAMP]) return glb;

  const scene = json.scenes[json.scene ?? 0];
  const lowest = Math.min(
    ...scene.nodes.map((nodeIndex) => lowestY(json, nodeIndex)),
  );
  if (!Number.isFinite(lowest) || Math.abs(lowest) < MIN_LIFT_M) return glb;

  json.nodes.push({
    name: "grounded-root",
    children: scene.nodes,
    translation: [0, -lowest, 0],
  });
  scene.nodes = [json.nodes.length - 1];

  // A blob URL has no folder, so files the model refers to (rare in a .glb)
  // are resolved against where it came from.
  for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (item.uri && !item.uri.startsWith("data:")) {
      item.uri = new URL(item.uri, sourceUrl).href;
    }
  }

  // The JSON chunk stays 4-byte aligned, padded with spaces.
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const paddedLength = Math.ceil(encoded.length / 4) * 4;
  const rest = new Uint8Array(glb, HEADER_BYTES + jsonLength); // BIN chunk
  const out = new Uint8Array(HEADER_BYTES + paddedLength + rest.length);
  out.fill(0x20, HEADER_BYTES + encoded.length, HEADER_BYTES + paddedLength);
  out.set(encoded, HEADER_BYTES);
  out.set(rest, HEADER_BYTES + paddedLength);

  const header = new DataView(out.buffer);
  header.setUint32(0, GLB_MAGIC, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, out.length, true);
  header.setUint32(12, paddedLength, true);
  header.setUint32(16, JSON_CHUNK, true);
  return out.buffer;
}

// One load per model URL, shared by every aircraft using it.
const groundedModels = new Map<string, Promise<string | null>>();

/**
 * A URL Cesium can load the model from with its wheels on the origin: the
 * original URL when the file is already so, else a blob URL. Null when the
 * model can't be loaded (missing, blocked by CORS, not a .glb).
 */
export function groundedModelUrl(url: string): Promise<string | null> {
  let grounded = groundedModels.get(url);
  if (!grounded) {
    grounded = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((glb) => {
        const fixed = groundGlb(glb, new URL(url, location.href).href);
        if (fixed === glb) return url;
        return URL.createObjectURL(
          new Blob([fixed], { type: "model/gltf-binary" }),
        );
      })
      .catch((error: unknown) => {
        console.warn(`Aircraft model ${url} could not be loaded:`, error);
        return null;
      });
    groundedModels.set(url, grounded);
  }
  return grounded;
}
