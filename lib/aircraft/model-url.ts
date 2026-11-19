/**
 * An aircraft's "photo" may be a 3D model (.glb) instead of an image: the API
 * keeps either in `photoUrl`. A model is drawn on the map; an image is shown
 * as the aircraft's picture.
 */

const GLB_EXTENSION = ".glb";

/** Whether a picked file is a .glb (by name: browsers often give no type). */
export function isModelFile(file: File) {
  return file.name.toLowerCase().endsWith(GLB_EXTENSION);
}

/** Whether a URL points to a .glb, ignoring any query string or hash. */
export function isModelUrl(url: string | null | undefined): url is string {
  return (
    !!url && url.split(/[?#]/)[0].toLowerCase().endsWith(GLB_EXTENSION)
  );
}

/** The URL when it's an image; null when it's a model (or missing). */
export function photoImageUrl(url: string | null | undefined) {
  return url && !isModelUrl(url) ? url : null;
}
