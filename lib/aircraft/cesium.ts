// Types only: the Cesium runtime is the prebuilt bundle served from
// public/cesium (see loadCesium), so Next.js never has to bundle it.
import type * as CesiumModule from "cesium";

export type Cesium = typeof CesiumModule;

const CESIUM_BASE_URL = "/cesium"; // public/cesium, see scripts/copy-cesium-assets.mjs

export const FEET_TO_METERS = 0.3048;

let cesiumPromise: Promise<Cesium> | undefined;

export function loadCesium(): Promise<Cesium> {
  cesiumPromise ??= new Promise<Cesium>((resolve, reject) => {
    const globals = window as unknown as {
      CESIUM_BASE_URL: string;
      Cesium: Cesium;
    };
    // Tells Cesium where its workers, assets and widget images live.
    globals.CESIUM_BASE_URL = CESIUM_BASE_URL;

    const script = document.createElement("script");
    script.src = `${CESIUM_BASE_URL}/Cesium.js`;
    script.async = true;
    script.onload = () => resolve(globals.Cesium);
    script.onerror = () => {
      cesiumPromise = undefined;
      reject(new Error(`Failed to load ${script.src}`));
    };
    document.head.appendChild(script);
  });
  return cesiumPromise;
}

// The 3D world comes from one of two sources:
// - Google Photorealistic 3D Tiles, fetched straight from Google with a Google
//   Maps API key. Terrain, buildings and imagery are all in the one tileset,
//   so the globe is hidden. Google's logo and attributions are shown by
//   Cesium's credit display, which must stay visible (Google Maps terms).
// - Otherwise Cesium ion: World Terrain, Bing imagery and OSM Buildings.
export function addBaseScene(
  Cesium: Cesium,
  viewer: CesiumModule.Viewer,
  googleMapsApiKey: string | undefined,
) {
  const { scene } = viewer;

  if (googleMapsApiKey) {
    scene.globe.show = false;
    Cesium.createGooglePhotorealistic3DTileset(
      {
        key: googleMapsApiKey,
        // The viewer has no geocoder, so no non-Google geocoder is used.
        onlyUsingWithGoogleGeocoder: true,
      },
      // Sharper ground and buildings (default 16), at the cost of more
      // tile downloads and memory.
      { maximumScreenSpaceError: 8 },
    )
      .then((tileset) => {
        if (viewer.isDestroyed()) tileset.destroy();
        else scene.primitives.add(tileset);
      })
      .catch((error) => {
        // Bad key, API not enabled, quota exceeded, ... Show the bare globe
        // so the aircraft and zones still have a reference.
        console.error("Failed to load Google Photorealistic 3D Tiles", error);
        if (!viewer.isDestroyed()) scene.globe.show = true;
      });
    return;
  }

  // Let mountains hide the parts of the trail that are behind them.
  scene.globe.depthTestAgainstTerrain = true;

  Cesium.createOsmBuildingsAsync()
    .then((buildings) => {
      if (viewer.isDestroyed()) buildings.destroy();
      else scene.primitives.add(buildings);
    })
    .catch(() => {
      // Buildings are a nice-to-have; the map works without them.
    });
}

/** A Cesium viewer with all of its built-in widgets turned off. */
export function createViewer(
  Cesium: Cesium,
  container: HTMLDivElement,
  googleMapsApiKey: string | undefined,
) {
  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (token) Cesium.Ion.defaultAccessToken = token;

  const viewer = new Cesium.Viewer(container, {
    // With Google tiles nothing comes from Cesium ion: no ion terrain and no
    // ion (Bing) base imagery.
    ...(googleMapsApiKey
      ? { baseLayer: false as const }
      : { terrain: Cesium.Terrain.fromWorldTerrain() }),
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
  });

  // Render at the screen's real resolution instead of CSS pixels, so the
  // scene is not blurry on scaled (HiDPI) displays.
  viewer.useBrowserRecommendedResolution = false;

  addBaseScene(Cesium, viewer, googleMapsApiKey);
  return viewer;
}
