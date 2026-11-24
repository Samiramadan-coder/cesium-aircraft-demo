// Cesium labels lay text out glyph by glyph, left to right, with no bidi or
// shaping, so Arabic comes out reversed and with its letters unjoined. The
// browser's canvas text does both, so map text that may be Arabic is drawn
// here and shown as a billboard instead.

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const STRONG_CHAR = /[A-Za-zÀ-ɏ֐-ࣿיִ-﷿ﹰ-﻿]/;

/** Direction of the text's first strong character (as `dir="auto"`). */
function textDirection(text: string): CanvasDirection {
  const first = text.match(STRONG_CHAR)?.[0];
  return first && RTL_CHAR.test(first) ? "rtl" : "ltr";
}

export type TextImage = {
  canvas: HTMLCanvasElement;
  /** Size to show it at, CSS pixels (the canvas is drawn at device pixels). */
  width: number;
  height: number;
};

export function createTextImage(
  text: string,
  {
    fontSize = 11,
    fontWeight = "normal",
    color = "#ffffff",
    background = "rgba(0, 0, 0, 0.6)",
    paddingX = 6,
    paddingY = 4,
  }: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    background?: string;
    paddingX?: number;
    paddingY?: number;
  } = {},
): TextImage {
  const scale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  const family =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const font = `${fontWeight} ${fontSize}px ${family}`;
  const lines = text.split("\n");
  const lineHeight = Math.round(fontSize * 1.35);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  const textWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width),
  );

  const width = Math.ceil(textWidth + paddingX * 2);
  const height = lines.length * lineHeight + paddingY * 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  // Resizing the canvas resets the context.
  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 4);
  ctx.fill();

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    const direction = textDirection(line);
    ctx.direction = direction;
    ctx.textAlign = direction === "rtl" ? "right" : "left";
    ctx.fillText(
      line,
      direction === "rtl" ? width - paddingX : paddingX,
      paddingY + lineHeight * (i + 0.5),
    );
  });

  return { canvas, width, height };
}
