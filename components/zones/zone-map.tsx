"use client";

import { useEffect, useRef, useState } from "react";
import type * as CesiumModule from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {
  type Cesium,
  FEET_TO_METERS,
  createViewer,
  loadCesium,
} from "@/lib/aircraft/cesium";
import type { FlightZone } from "@/types/aircraft";
import type { LatLon } from "@/types/tracking";

/** Camera tilt looking down at the zone, and distance as a multiple of its size. */
const PITCH_DEG = -35;
const RANGE_FACTOR = 2.6;

const feet = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/** Draws `zone` extruded from floor to ceiling; returns its entities. */
function addZone(
  Cesium: Cesium,
  viewer: CesiumModule.Viewer,
  zone: FlightZone,
  highlighted: boolean,
) {
  const color = Cesium.Color.fromCssColorString(zone.color ?? "#34d399");
  const toPositions = (ring: FlightZone["coordinates"]) =>
    Cesium.Cartesian3.fromDegreesArray(ring.flatMap((c) => [c.lng, c.lat]));
  const count = zone.coordinates.length;

  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      zone.coordinates.reduce((sum, c) => sum + c.lng, 0) / count,
      zone.coordinates.reduce((sum, c) => sum + c.lat, 0) / count,
      zone.maxAltitude * FEET_TO_METERS,
    ),
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        toPositions(zone.coordinates),
        zone.holes?.map(
          (hole) => new Cesium.PolygonHierarchy(toPositions(hole)),
        ),
      ),
      height: zone.minAltitude * FEET_TO_METERS,
      extrudedHeight: zone.maxAltitude * FEET_TO_METERS,
      material: color.withAlpha(highlighted ? 0.3 : 0.08),
      outline: true,
      outlineColor: color.withAlpha(highlighted ? 1 : 0.35),
    },
    // Only the zone being viewed is labelled; the others are context.
    label: highlighted
      ? {
          text: `${zone.name} · ${feet.format(zone.maxAltitude)} ft`,
          font: "13px sans-serif",
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }
      : undefined,
  });
}

/** Numbered dots on the ceiling at each point being edited. */
function addVertices(
  Cesium: Cesium,
  viewer: CesiumModule.Viewer,
  vertices: LatLon[],
  ceilingFt: number,
  color: string,
) {
  return vertices.map((vertex, i) =>
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        vertex.lon,
        vertex.lat,
        ceilingFt * FEET_TO_METERS,
      ),
      point: {
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString(color),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: String(i + 1),
        font: "bold 12px sans-serif",
        pixelOffset: new Cesium.Cartesian2(0, -16),
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }),
  );
}

/** Points the camera at the whole zone, from the south, tilted down. */
function frameZone(
  Cesium: Cesium,
  viewer: CesiumModule.Viewer,
  zone: FlightZone,
  duration = 0,
) {
  const corners = [zone.minAltitude, zone.maxAltitude].flatMap((height) =>
    zone.coordinates.map((c) =>
      Cesium.Cartesian3.fromDegrees(c.lng, c.lat, height * FEET_TO_METERS),
    ),
  );
  const sphere = Cesium.BoundingSphere.fromPoints(corners);
  viewer.camera.flyToBoundingSphere(sphere, {
    duration,
    offset: new Cesium.HeadingPitchRange(
      0,
      Cesium.Math.toRadians(PITCH_DEG),
      sphere.radius * RANGE_FACTOR,
    ),
  });
}

type Scene = { Cesium: Cesium; viewer: CesiumModule.Viewer };

type ZoneMapProps = {
  /** The zone to show; redrawn whenever it changes (live editing). */
  zone: FlightZone | null;
  /** Points to mark with numbered dots while editing. */
  vertices?: LatLon[];
  /** Other zones, drawn faintly around it for context. */
  otherZones: FlightZone[];
  googleMapsApiKey?: string;
  /** Change it to fly the camera back to the whole zone. */
  frameKey?: number;
  onError: () => void;
};

/** A 3D map of one zone, extruded from its floor to its ceiling. */
export default function ZoneMap(props: ZoneMapProps) {
  const { zone, vertices, frameKey } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  // State, not a ref, so the drawing effects rerun once the scene is ready.
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    propsRef.current = props;
  });

  // Build the viewer once, with the context zones, and frame the zone.
  useEffect(() => {
    let cancelled = false;
    let viewer: CesiumModule.Viewer | null = null;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const { zone, otherZones, googleMapsApiKey } = propsRef.current;
        viewer = createViewer(Cesium, containerRef.current, googleMapsApiKey);
        for (const other of otherZones) addZone(Cesium, viewer, other, false);
        if (zone) frameZone(Cesium, viewer, zone);
        setScene({ Cesium, viewer });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) propsRef.current.onError();
      });

    return () => {
      cancelled = true;
      setScene(null);
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, [setScene]);

  // Redraw the zone (and the numbered points) on every change.
  useEffect(() => {
    if (!scene || !zone) return;
    const { Cesium, viewer } = scene;
    const entities = [
      addZone(Cesium, viewer, zone, true),
      ...addVertices(
        Cesium,
        viewer,
        vertices ?? [],
        zone.maxAltitude,
        zone.color ?? "#34d399",
      ),
    ];
    return () => {
      if (viewer.isDestroyed()) return;
      for (const entity of entities) viewer.entities.remove(entity);
    };
  }, [scene, zone, vertices]);

  // "Fit to zone": fly back to the whole (edited) zone.
  useEffect(() => {
    if (!scene || !frameKey) return;
    const current = propsRef.current.zone;
    if (current) frameZone(scene.Cesium, scene.viewer, current, 0.8);
  }, [scene, frameKey]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
