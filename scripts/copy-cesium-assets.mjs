// Copies Cesium's prebuilt runtime (Cesium.js plus its web workers,
// imagery/terrain assets, third-party wasm and widget images) into
// public/cesium so Next.js serves it at /cesium in both dev and production.
// Runs automatically before dev/build.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "cesium", "Build", "Cesium");
const target = join(root, "public", "cesium");

if (!existsSync(source)) {
  console.error("Cesium build not found. Run `npm install` first.");
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const entry of ["Cesium.js", "Workers", "Assets", "ThirdParty", "Widgets"]) {
  cpSync(join(source, entry), join(target, entry), { recursive: true });
}

console.log("Copied Cesium static assets to public/cesium");
