/**
 * A 360° viewer that moves through a house the way a 3D scan does.
 *
 * Every spot is a panorama (colour) plus a depth image (how far the first surface is along each ray). Each is drawn
 * as a shell: a grid of vertices pushed out along its ray to that distance and textured with the panorama. Seen from
 * the spot it was taken at, the shell is the panorama exactly. When the visitor walks to the next spot the camera
 * glides along the line between the two while the next spot's shell fades in over the last one's, so near things
 * (a door frame, a wall beside you) slide past faster than far things and the room opens up as it would in life.
 *
 * Plain WebGL2, no library. Anything that cannot be drawn this way (no WebGL2, a lost context, a depth image that
 * will not load) is reported, and the page falls back to the flat viewer.
 *
 * World axes are the plan's, in metres: x to the right of the plan, y up the plan (into the plot), z up. A panorama's
 * centre looks along +y and turning right is turning clockwise, so yaw 0 looks along +y and yaw 90° along +x.
 */

export interface DepthScene {
  id: string;
  /** The 4096 × 2048 panorama and its 800 px poster */
  image: string;
  thumb: string;
  /** 512 × 256 PNG: metres packed into red (high byte) and green (low byte), 65535 = DEPTH_MAX */
  depth: string;
  /** Eye position in metres */
  pos: [number, number, number];
}

export interface Marker {
  to: string;
  el: HTMLElement;
  /** Where it stands: the floor under the next spot, in metres */
  target: [number, number, number];
}

export interface ViewerOptions {
  minHfov: number;
  maxHfov: number;
  /** Called whenever the visitor turns or zooms, so the map can follow */
  onLook: () => void;
  /** Called when a scene could not be loaded or the context was lost */
  onFail: (reason: string) => void;
  /** The visitor chose a spot: clicked the floor beside it, or walked towards it with the arrow keys */
  onPick: (id: string) => void;
}

const DEPTH_MAX = 100;
const GRID_W = 512;
const GRID_H = 256;
const EYE = 1.55;
/** How many spots besides the current one and its neighbours (which are always kept) keep their textures */
const KEEP = 2;
/** How fast the arrow keys turn the view, degrees a second, and how quickly it speeds up and slows down (seconds) */
const TURN = 80;
const TURN_EASE = 0.09;
/** A click goes to a spot at most this many degrees off the pointer's direction */
const REACH = 38;
const RAD = Math.PI / 180;

const VERT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uDepth;
uniform mat4 uViewProj;
uniform vec3 uOffset;
out vec2 vUV;
out float vEdge;

float metres(ivec2 t) {
  t.x = (t.x + ${GRID_W}) % ${GRID_W};
  t.y = clamp(t.y, 0, ${GRID_H - 1});
  vec4 c = floor(texelFetch(uDepth, t, 0) * 255.0 + 0.5);
  return (c.r * 256.0 + c.g) / 65535.0 * ${DEPTH_MAX.toFixed(1)};
}

void main() {
  int cols = ${GRID_W + 1};
  int ix = gl_VertexID % cols;
  int iy = gl_VertexID / cols;
  ivec2 t = ivec2(ix % ${GRID_W}, iy);
  float d = max(metres(t), 0.05);
  // how sharply the depth jumps beside this vertex: a stretched triangle will join it to the far side of an edge
  float jump = max(max(abs(metres(t + ivec2(1, 0)) - d), abs(metres(t - ivec2(1, 0)) - d)),
                   max(abs(metres(t + ivec2(0, 1)) - d), abs(metres(t - ivec2(0, 1)) - d)));
  vEdge = jump / max(d, 0.4);
  vUV = vec2((float(ix) + 0.5) / ${GRID_W}.0, (float(iy) + 0.5) / ${GRID_H}.0);
  float lon = (vUV.x - 0.5) * 6.28318530718;
  float lat = (0.5 - vUV.y) * 3.14159265359;
  vec3 dir = vec3(sin(lon) * cos(lat), cos(lon) * cos(lat), sin(lat));
  gl_Position = uViewProj * vec4(uOffset + dir * d, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uColor;
uniform float uAlpha;
uniform float uStretch;
in vec2 vUV;
in float vEdge;
out vec4 outColor;
void main() {
  // seen from where it was taken a shell is the panorama itself, so nothing is faded until the camera has moved
  float edge = smoothstep(0.07, 0.22, vEdge * uStretch);
  outColor = vec4(texture(uColor, vUV).rgb, uAlpha * (1.0 - edge));
}`;

type Vec3 = [number, number, number];

interface Loaded {
  color: WebGLTexture;
  depth: WebGLTexture;
  full: boolean;
  used: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// a gentler in and out than `ease`, for the walk itself
const glide = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** What the visitor asked for while a move was under way: done the moment it ends, from where they then are */
type Request = { kind: "pick"; x: number; y: number } | { kind: "key"; back: boolean; repeat: boolean } | { kind: "id"; id: string };

export class DepthViewer {
  /** Whether this browser can draw it */
  static supported(): boolean {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  yaw = 0;
  pitch = 0;
  hfov = 100;

  private canvas = document.createElement("canvas");
  private layer = document.createElement("div");
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private uni!: Record<string, WebGLUniformLocation | null>;
  private vao!: WebGLVertexArrayObject;
  private indexCount = 0;
  private loaded = new Map<string, Loaded>();
  private pending = new Map<string, Promise<Loaded>>();
  private tick = 0;
  private current = "";
  private markers: Marker[] = [];
  private markersVisible = true;
  // the marker the visitor's pointer is over (the ring under the cursor), if any
  private hover?: Marker;
  private camera: Vec3 = [0, 0, 0];
  // an animation in progress: the shell being left, the one being walked to, and how far
  private travelling?: { from: DepthScene; to: DepthScene; t: number; cut?: boolean };
  private raf = 0;
  private dirty = true;
  private anim?: { cancel: () => void };
  private resizeObserver: ResizeObserver;
  private dead = false;
  private velocity = [0, 0];
  private drag?: { x: number; y: number; id: number; t: number; sx: number; sy: number };
  private pinch = new Map<number, [number, number]>();
  private pinchStart = 0;
  private busy = false;
  // each loaded spot's depth in metres, kept on the CPU so a click can find the surface under the pointer
  private depthCpu = new Map<string, Float32Array>();
  // the spots next to the current one: never evicted, so a click is never waiting on a load
  private neighbours = new Set<string>();
  private queued?: Request;
  private reticle = document.createElement("div");
  // where the mouse is over the view, if it is
  private pointer?: [number, number];
  private held = new Set<string>();
  private spin = 0;
  private last = 0;

  constructor(
    private host: HTMLElement,
    private scenes: Map<string, DepthScene>,
    private opt: ViewerOptions,
    private reduced: boolean,
  ) {
    const gl = this.canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.canvas.className = "wt-gl";
    this.canvas.setAttribute("aria-hidden", "true");
    this.layer.className = "wt-markers";
    this.reticle.className = "wt-reticle";
    this.reticle.setAttribute("aria-hidden", "true");
    host.classList.add("wt-depth");
    host.replaceChildren(this.canvas, this.layer, this.reticle);
    host.tabIndex = 0;
    this.build();
    this.controls();
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.opt.onFail("The graphics context was lost");
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  // ---- setup

  private shader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader failed");
    return s;
  }

  private build() {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link failed");
    this.program = p;
    this.uni = {};
    for (const n of ["uDepth", "uColor", "uViewProj", "uOffset", "uAlpha", "uStretch"]) this.uni[n] = gl.getUniformLocation(p, n);
    // one grid of vertices (no attributes: the vertex shader works its position out from gl_VertexID), two triangles a cell
    const cols = GRID_W + 1;
    const idx = new Uint32Array(GRID_W * (GRID_H - 1) * 6);
    let k = 0;
    for (let y = 0; y < GRID_H - 1; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const a = y * cols + x;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        idx.set([a, c, b, b, c, d], k);
        k += 6;
      }
    }
    this.indexCount = idx.length;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.07, 0.07, 0.07, 1);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.host.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.host.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.want();
  }

  // ---- loading

  private texture(source: TexImageSource, mip: boolean, nearest: boolean): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    } else {
      const f = nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    }
    // longitude wraps round; the poles do not
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private async fetchImage(url: string, data: boolean): Promise<ImageBitmap | HTMLImageElement> {
    if (data && "createImageBitmap" in window) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      // the bytes are numbers, not a picture: no colour management, no premultiplying
      return createImageBitmap(await res.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none", imageOrientation: "none" });
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`${url} did not load`));
      img.src = url;
    });
  }

  /** The depth image as metres, row by row, the same numbers the vertex shader reads */
  private decode(img: ImageBitmap | HTMLImageElement): Float32Array {
    const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(GRID_W, GRID_H) : Object.assign(document.createElement("canvas"), { width: GRID_W, height: GRID_H });
    // the image is already decoded without colour management; the canvas is sRGB and the PNG is opaque, so nothing is altered
    const ctx = c.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx.drawImage(img, 0, 0, GRID_W, GRID_H);
    const px = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    const out = new Float32Array(GRID_W * GRID_H);
    for (let i = 0; i < out.length; i++) out[i] = ((px[i * 4] * 256 + px[i * 4 + 1]) / 65535) * DEPTH_MAX;
    return out;
  }

  /** Make a scene ready to draw: its poster at once, then the full image and the depth */
  load(id: string): Promise<Loaded> {
    const have = this.loaded.get(id);
    if (have?.full) {
      have.used = ++this.tick;
      return Promise.resolve(have);
    }
    let p = this.pending.get(id);
    if (!p) {
      p = this.read(id).finally(() => this.pending.delete(id));
      this.pending.set(id, p);
    }
    return p;
  }

  private async read(id: string): Promise<Loaded> {
    const s = this.scenes.get(id)!;
    const [depthImg, colorImg] = await Promise.all([this.fetchImage(s.depth, true), this.fetchImage(s.image, false)]);
    if (this.dead) throw new Error("closed");
    if (!this.depthCpu.has(id)) this.depthCpu.set(id, this.decode(depthImg));
    const old = this.loaded.get(id);
    const entry: Loaded = {
      color: this.texture(colorImg, true, false),
      depth: old?.depth ?? this.texture(depthImg, false, true),
      full: true,
      used: ++this.tick,
    };
    if (old) {
      this.gl.deleteTexture(old.color);
      if (old.depth !== entry.depth) this.gl.deleteTexture(old.depth);
    }
    this.loaded.set(id, entry);
    this.evict();
    this.want();
    return entry;
  }

  /** A poster to show while the full image comes (its depth is the real one, so the poster is already a room) */
  async poster(id: string): Promise<void> {
    const s = this.scenes.get(id)!;
    if (this.loaded.has(id)) return;
    const [depthImg, thumb] = await Promise.all([this.fetchImage(s.depth, true), this.fetchImage(s.thumb, false)]);
    if (this.dead || this.loaded.has(id)) return;
    this.depthCpu.set(id, this.decode(depthImg));
    this.loaded.set(id, { color: this.texture(thumb, false, false), depth: this.texture(depthImg, false, true), full: false, used: ++this.tick });
    this.want();
  }

  /** Load every spot the visitor can walk to from here, so a click never waits, and keep them loaded */
  prefetch(ids: string[]) {
    // a phone has too little graphics memory to hold every neighbour's panorama at once
    if (matchMedia("(pointer: coarse)").matches) ids = ids.slice(0, 4);
    this.neighbours = new Set(ids);
    for (const id of ids) void this.load(id).catch(() => undefined);
    this.evict();
  }

  private evict() {
    const keep = new Set([this.current, this.travelling?.to.id, this.travelling?.from.id, ...this.neighbours]);
    const order = [...this.loaded.entries()].filter(([id]) => !keep.has(id)).sort((a, b) => a[1].used - b[1].used);
    while (this.loaded.size > KEEP + 1 + this.neighbours.size && order.length) {
      const [id, e] = order.shift()!;
      this.gl.deleteTexture(e.color);
      this.gl.deleteTexture(e.depth);
      this.loaded.delete(id);
      this.depthCpu.delete(id);
    }
  }

  // ---- looking

  get sceneId() {
    return this.current;
  }

  async start(id: string, yaw: number, pitch: number, hfov: number) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.hfov = hfov;
    this.current = id;
    this.camera = [...this.scenes.get(id)!.pos];
    void this.poster(id).catch(() => undefined);
    try {
      await this.load(id);
    } catch (e) {
      this.opt.onFail(String((e as Error).message));
      return;
    }
    this.want();
  }

  setMarkers(markers: Marker[]) {
    this.layer.replaceChildren(...markers.map((m) => m.el));
    this.markers = markers;
    this.hover = undefined;
    // A spot on this floor is a small dot until the pointer is near it, then the ring; stairs are always a whole circle
    const floorZ = this.camera[2] - EYE;
    for (const m of markers) m.el.classList.toggle("is-dot", Math.abs(m.target[2] - floorZ) < 0.5);
    this.markersVisible = true;
    this.layer.classList.remove("is-hidden");
    this.want();
    this.track();
  }

  private clampLook() {
    this.pitch = clamp(this.pitch, -85, 85);
    this.hfov = clamp(this.hfov, this.opt.minHfov, this.opt.maxHfov);
    this.yaw = wrap180(this.yaw);
  }

  setHfov(h: number, ms = 0) {
    this.animate(ms, (k, from) => {
      this.hfov = from.hfov + (h - from.hfov) * k;
    });
  }

  lookAt(pitch: number, yaw: number, hfov?: number, ms = 0): Promise<void> {
    return this.animate(ms, (k, from) => {
      this.yaw = from.yaw + wrap180(yaw - from.yaw) * k;
      this.pitch = from.pitch + (pitch - from.pitch) * k;
      if (hfov !== undefined) this.hfov = from.hfov + (hfov - from.hfov) * k;
    });
  }

  private animate(ms: number, step: (k: number, from: { yaw: number; pitch: number; hfov: number }) => void): Promise<void> {
    this.anim?.cancel();
    const from = { yaw: this.yaw, pitch: this.pitch, hfov: this.hfov };
    if (!ms || this.reduced) {
      step(1, from);
      this.clampLook();
      this.opt.onLook();
      this.want();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      let live = true;
      const frame = (now: number) => {
        if (!live || this.dead) return;
        const k = ease(clamp((now - t0) / ms, 0, 1));
        step(k, from);
        this.clampLook();
        this.want();
        if (now - t0 < ms) requestAnimationFrame(frame);
        else {
          live = false;
          this.opt.onLook();
          resolve();
        }
      };
      this.anim = {
        cancel: () => {
          live = false;
          resolve();
        },
      };
      requestAnimationFrame(frame);
    });
  }

  // ---- choosing where to walk

  /** The ray through a point of the view (pixels from the top left of the host), as a unit direction */
  private rayAt(px: number, py: number): Vec3 {
    const { right, up, fwd } = this.viewMatrices();
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const f = 1 / Math.tan((this.hfov * RAD) / 2);
    const nx = ((px / w - 0.5) * 2) / f;
    const ny = ((0.5 - py / h) * 2) / (f * (w / h));
    const d: Vec3 = [fwd[0] + right[0] * nx + up[0] * ny, fwd[1] + right[1] * nx + up[1] * ny, fwd[2] + right[2] * nx + up[2] * ny];
    const len = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / len, d[1] / len, d[2] / len];
  }

  /** How far the first surface is along a direction from the current spot, in metres (from the depth image kept for the click) */
  private depthAt(d: Vec3): number | undefined {
    const m = this.depthCpu.get(this.current);
    if (!m) return undefined;
    const lon = Math.atan2(d[0], d[1]);
    const lat = Math.asin(clamp(d[2], -1, 1));
    const x = Math.floor((lon / (2 * Math.PI) + 0.5) * GRID_W) % GRID_W;
    const y = clamp(Math.floor((0.5 - lat / Math.PI) * GRID_H), 0, GRID_H - 1);
    return m[y * GRID_W + x];
  }

  /**
   * What is under a point of the view, and the spot a click there would walk to. The surface is found in the depth
   * image (the floor plane if there is none). The spot is the one best along the pointer's direction: its bearing
   * must be within REACH of the pointer's, and among those the cost is the angle off, plus a little for each metre it
   * stops short of the surface, plus a lot for each metre it is beyond it (never through the wall that was clicked).
   * So the floor beside a spot picks that spot, and a far wall or a doorway picks the furthest spot in front of it.
   */
  private probe(px: number, py: number): { marker?: Marker; t: number; floor: boolean; down: number } {
    const d = this.rayAt(px, py);
    const floorZ = this.camera[2] - EYE;
    let t = this.depthAt(d);
    if (t === undefined) t = d[2] < -0.03 ? (floorZ - this.camera[2]) / d[2] : DEPTH_MAX;
    const floor = Math.abs(this.camera[2] + d[2] * t - floorZ) < 0.12;
    const flat = Math.hypot(d[0], d[1]);
    const out = { t, floor, down: Math.abs(d[2]) };
    if (flat < 0.1) return out; // straight up or down: no direction to walk in
    const heading = Math.atan2(d[0], d[1]);
    const reach = Math.min(t * flat, 12);
    let best: Marker | undefined;
    let bestCost = Infinity;
    for (const m of this.markers) {
      const dx = m.target[0] - this.camera[0];
      const dy = m.target[1] - this.camera[1];
      const away = Math.abs(wrap180((Math.atan2(dx, dy) - heading) / RAD));
      if (away > REACH) continue;
      const dist = Math.hypot(dx, dy);
      const cost = away + 3 * Math.max(0, reach - dist) + 12 * Math.max(0, dist - reach - 0.5);
      if (cost < bestCost) {
        best = m;
        bestCost = cost;
      }
    }
    return { ...out, marker: best };
  }

  private pickAt(px: number, py: number): Marker | undefined {
    return this.probe(px, py).marker;
  }

  private setHover(m: Marker | undefined) {
    if (m === this.hover) return;
    this.hover?.el.classList.remove("is-target");
    this.hover = m;
    m?.el.classList.add("is-target");
    this.host.style.cursor = m ? "pointer" : "";
  }

  /** The reticle and the highlighted spot follow the mouse: where a click would take the visitor is always on show */
  private track() {
    const r = this.reticle;
    const p = this.pointer;
    if (!p || this.drag || this.busy || this.travelling || this.pinch.size) {
      r.classList.remove("is-on");
      this.setHover(undefined);
      return;
    }
    const info = this.probe(p[0], p[1]);
    this.setHover(info.marker);
    // a ring of fixed size in the world, so it is smaller the further the surface is; flat on the floor
    const f = 1 / Math.tan((this.hfov * RAD) / 2);
    const size = clamp((0.3 * (this.host.clientWidth / 2) * f) / Math.max(info.t, 0.5), 16, 64);
    const height = info.floor ? size * clamp(info.down, 0.25, 1) : size;
    r.style.left = `${p[0].toFixed(1)}px`;
    r.style.top = `${p[1].toFixed(1)}px`;
    r.style.setProperty("--wt-w", `${size.toFixed(1)}px`);
    r.style.setProperty("--wt-h", `${height.toFixed(1)}px`);
    r.classList.add("is-on");
    r.classList.toggle("is-idle", !info.marker);
  }

  /** Walk forward (or back): the spot on this floor whose direction is nearest the way the visitor is facing */
  private walkAlong(back: boolean) {
    const want = this.yaw + (back ? 180 : 0);
    let best: Marker | undefined;
    let bestScore = Infinity;
    for (const m of this.markers) {
      if (!m.el.classList.contains("is-dot")) continue;
      const dx = m.target[0] - this.camera[0];
      const dy = m.target[1] - this.camera[1];
      const away = Math.abs(wrap180((Math.atan2(dx, dy) * 180) / Math.PI - want));
      if (away > 50) continue;
      // nearly straight ahead beats a nearer one off to the side
      const score = away + 4 * Math.hypot(dx, dy);
      if (score < bestScore) {
        best = m;
        bestScore = score;
      }
    }
    if (best) this.opt.onPick(best.to);
  }

  /** Do what the visitor asked, now if the view is at rest, otherwise as soon as the move ends (the latest ask wins) */
  request(r: Request) {
    if (this.busy || this.travelling) {
      this.queued = r;
      return;
    }
    this.run(r);
  }

  private run(r: Request) {
    if (r.kind === "pick") {
      const m = this.pickAt(r.x, r.y);
      if (m) this.opt.onPick(m.to);
    } else if (r.kind === "key") this.walkAlong(r.back);
    else if (this.markers.some((m) => m.to === r.id)) this.opt.onPick(r.id);
  }

  /** The move is over and the new spot's circles are up: carry out what was asked meanwhile */
  flush() {
    const r = this.queued;
    this.queued = undefined;
    if (r && !this.busy && !this.travelling && !this.dead) this.run(r);
    this.track();
  }

  // ---- walking

  /** Where the floor under a spot is, for its marker */
  floor(id: string): Vec3 {
    const p = this.scenes.get(id)!.pos;
    return [p[0], p[1], p[2] - EYE];
  }

  /**
   * Walk to another spot: glide along the line to it with the two views blended. The visitor keeps looking where they
   * were looking (and may look round during the glide). Starts at once if the spot is loaded, otherwise as soon as it
   * is. Resolves when the new spot is the one on screen.
   */
  async travel(id: string): Promise<void> {
    const from = this.scenes.get(this.current)!;
    const to = this.scenes.get(id)!;
    if (!to || this.busy || this.travelling) return;
    this.busy = true;
    this.setMarkersVisible(false);
    this.track();
    try {
      await this.load(id);
    } catch (e) {
      this.busy = false;
      this.setMarkersVisible(true);
      this.opt.onFail(String((e as Error).message));
      return;
    }
    if (this.dead) return;
    const dx = to.pos[0] - from.pos[0];
    const dy = to.pos[1] - from.pos[1];
    const dz = to.pos[2] - from.pos[2];
    const metres = Math.hypot(dx, dy, dz);
    const ms = this.reduced ? 0 : clamp(350 + 150 * metres, 450, 1100);
    this.travelling = { from, to, t: 0 };
    if (!ms) {
      this.finish(to);
      return;
    }
    await new Promise<void>((resolve) => {
      const t0 = performance.now();
      const frame = (now: number) => {
        if (this.dead) return resolve();
        const t = clamp((now - t0) / ms, 0, 1);
        const k = glide(t);
        this.travelling!.t = k;
        this.camera = [from.pos[0] + dx * k, from.pos[1] + dy * k, from.pos[2] + dz * k];
        this.want();
        this.opt.onLook();
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    this.finish(to);
  }

  /**
   * Go to a spot that is not in sight (from the map): the two views are blended where each was taken, not moved
   * between, and the view opens facing `yaw`.
   */
  async cut(id: string, yaw: number): Promise<void> {
    const from = this.scenes.get(this.current)!;
    const to = this.scenes.get(id)!;
    if (!to || this.busy || this.travelling) return;
    this.busy = true;
    this.setMarkersVisible(false);
    try {
      await this.load(id);
    } catch (e) {
      this.busy = false;
      this.setMarkersVisible(true);
      this.opt.onFail(String((e as Error).message));
      return;
    }
    this.yaw = yaw;
    this.travelling = { from, to, t: 0, cut: true };
    const ms = this.reduced ? 0 : 450;
    if (ms) {
      await new Promise<void>((resolve) => {
        const t0 = performance.now();
        const frame = (now: number) => {
          if (this.dead) return resolve();
          const t = clamp((now - t0) / ms, 0, 1);
          this.travelling!.t = t;
          this.want();
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    }
    this.finish(to);
  }

  private finish(to: DepthScene) {
    this.current = to.id;
    this.camera = [...to.pos];
    this.travelling = undefined;
    this.busy = false;
    this.evict();
    this.want();
    this.opt.onLook();
  }

  private setMarkersVisible(on: boolean) {
    this.markersVisible = on;
    this.layer.classList.toggle("is-hidden", !on);
  }

  // ---- drawing

  private want() {
    this.dirty = true;
    if (!this.raf && !this.dead) this.raf = requestAnimationFrame((t) => this.draw(t));
  }

  private viewMatrices(): { vp: Float32Array; right: Vec3; up: Vec3; fwd: Vec3; aspect: number } {
    const yaw = this.yaw * RAD;
    const pitch = this.pitch * RAD;
    const fwd: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch)];
    const right: Vec3 = [Math.cos(yaw), -Math.sin(yaw), 0];
    const up: Vec3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const aspect = this.canvas.width / this.canvas.height;
    const f = 1 / Math.tan((this.hfov * RAD) / 2); // x scale: the horizontal field of view is the one the visitor sets
    const fy = f * aspect;
    const near = 0.05;
    const far = 400;
    // rotation (world to view: x right, y up, -z forward), then the projection, column-major
    const m = new Float32Array(16);
    const r = [right, up, [-fwd[0], -fwd[1], -fwd[2]] as Vec3];
    const sx = [f, fy, 1];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) m[col * 4 + row] = r[row][col] * (row < 2 ? sx[row] : 1);
    // clip z and w
    for (let col = 0; col < 3; col++) {
      m[col * 4 + 2] = r[2][col] * ((far + near) / (near - far));
      m[col * 4 + 3] = -r[2][col]; // w is the distance ahead, so what is behind the camera is clipped
    }
    m[14] = (2 * far * near) / (near - far);
    m[15] = 0;
    return { vp: m, right, up, fwd, aspect };
  }

  private shell(scene: DepthScene, alpha: number, vp: Float32Array) {
    const gl = this.gl;
    const have = this.loaded.get(scene.id);
    if (!have) return;
    have.used = ++this.tick;
    const off: Vec3 = this.travelling?.cut ? [0, 0, 0] : [scene.pos[0] - this.camera[0], scene.pos[1] - this.camera[1], scene.pos[2] - this.camera[2]];
    // how far the camera has moved from this shell's centre: a shell seen from where it was taken is never faded
    const moved = Math.hypot(off[0], off[1], off[2]);
    gl.uniformMatrix4fv(this.uni.uViewProj, false, vp);
    gl.uniform3f(this.uni.uOffset, off[0], off[1], off[2]);
    gl.uniform1f(this.uni.uAlpha, alpha);
    gl.uniform1f(this.uni.uStretch, smooth(0.02, 0.6, moved));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, have.color);
    gl.uniform1i(this.uni.uColor, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, have.depth);
    gl.uniform1i(this.uni.uDepth, 1);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
  }

  private draw(now = performance.now()) {
    this.raf = 0;
    if (this.dead || !this.dirty) return;
    this.dirty = false;
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const scene = this.scenes.get(this.current);
    if (!scene) return;
    // turn while an arrow key is held: speed eases in and out rather than stepping
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 1 / 60;
    this.last = now;
    const goal = ((this.held.has("ArrowRight") ? 1 : 0) - (this.held.has("ArrowLeft") ? 1 : 0)) * TURN;
    if (goal !== this.spin) {
      this.spin += (goal - this.spin) * (1 - Math.exp(-dt / TURN_EASE));
      if (Math.abs(goal - this.spin) < 0.5) this.spin = goal;
    }
    if (this.spin) {
      this.yaw += this.spin * dt;
      this.clampLook();
      this.opt.onLook();
      this.dirty = true;
      this.track();
    }
    // coast after a flick
    if (this.velocity[0] || this.velocity[1]) {
      this.yaw += this.velocity[0];
      this.pitch += this.velocity[1];
      this.velocity = this.velocity.map((v) => (Math.abs(v) < 0.02 ? 0 : v * 0.92));
      this.clampLook();
      this.opt.onLook();
      this.dirty = true;
    }
    const { vp, right, up, fwd } = this.viewMatrices();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    const tr = this.travelling;
    if (!tr) {
      gl.disable(gl.BLEND);
      this.shell(scene, 1, vp);
    } else {
      // The one the camera is nearer to goes down opaque; the other is laid over it with the weight that makes the
      // two add up to a smooth change from one to the other, so the cross-fade has no jump where they swap
      const w = smooth(0.2, 0.85, tr.t);
      const baseIsFrom = tr.t < 0.5;
      gl.disable(gl.BLEND);
      this.shell(baseIsFrom ? tr.from : tr.to, 1, vp);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.shell(baseIsFrom ? tr.to : tr.from, baseIsFrom ? w : 1 - w, vp);
      gl.disable(gl.BLEND);
    }
    this.placeMarkers(right, up, fwd);
    if (this.dirty) this.raf = requestAnimationFrame((t) => this.draw(t));
    else this.last = 0;
  }

  private placeMarkers(right: Vec3, up: Vec3, fwd: Vec3) {
    if (!this.markersVisible || this.travelling) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const f = 1 / Math.tan((this.hfov * RAD) / 2);
    const aspect = w / h;
    for (const m of this.markers) {
      const v: Vec3 = [m.target[0] - this.camera[0], m.target[1] - this.camera[1], m.target[2] - this.camera[2]];
      const z = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
      if (z < 0.2) {
        m.el.style.display = "none";
        continue;
      }
      const x = (v[0] * right[0] + v[1] * right[1] + v[2] * right[2]) / z;
      const y = (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / z;
      const px = (0.5 + (x * f) / 2) * w;
      const py = (0.5 - (y * f * aspect) / 2) * h;
      if (px < -60 || px > w + 60 || py < -60 || py > h + 60) {
        m.el.style.display = "none";
        continue;
      }
      const feet = Math.hypot(v[0], v[1], v[2]) / 0.3048;
      const horizontal = Math.hypot(v[0], v[1]);
      const down = Math.atan2(EYE, Math.max(horizontal, 0.3));
      // wider view, smaller circle: the size is the one the flat viewer used, scaled by how zoomed in the visitor is
      const size = Math.round(clamp(260 / Math.max(feet, 1), 34, 88) * clamp(100 / this.hfov, 0.8, 1.6));
      const height = Math.round(size * Math.max(0.3, Math.sin(down)));
      m.el.style.display = "";
      m.el.style.left = `${px.toFixed(1)}px`;
      m.el.style.top = `${py.toFixed(1)}px`;
      m.el.style.setProperty("--wt-w", `${size}px`);
      m.el.style.setProperty("--wt-h", `${height}px`);
    }
  }

  // ---- the visitor's hands

  private controls() {
    const el = this.host;
    const perPx = () => this.hfov / Math.max(1, this.host.clientWidth);
    el.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".wt-marker, .wt-zoom")) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // a pointer that is already gone (or a synthetic one) cannot be captured; dragging still works without
      }
      this.pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.pinch.size === 2) {
        const [a, b] = [...this.pinch.values()];
        this.pinchStart = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        this.drag = undefined;
      } else {
        this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now(), sx: e.clientX, sy: e.clientY };
      }
      this.velocity = [0, 0];
      this.anim?.cancel();
      this.track();
    });
    const local = (e: PointerEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    el.addEventListener("pointermove", (e) => {
      // a mouse over the view: the reticle and the spot a click would walk to follow it (not over the circles or buttons)
      if (e.pointerType === "mouse") {
        this.pointer = (e.target as HTMLElement).closest(".wt-marker, .wt-zoom") ? undefined : local(e);
        this.track();
      }
      if (!this.pinch.has(e.pointerId)) return;
      this.pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.pinch.size === 2) {
        const [a, b] = [...this.pinch.values()];
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        this.hfov = clamp(this.hfov * (this.pinchStart / dist), this.opt.minHfov, this.opt.maxHfov);
        this.pinchStart = dist;
        this.want();
        return;
      }
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const k = perPx();
      const dyaw = -(e.clientX - d.x) * k;
      const dpitch = (e.clientY - d.y) * k;
      this.yaw += dyaw;
      this.pitch += dpitch;
      this.velocity = [dyaw * 0.6, dpitch * 0.6];
      d.x = e.clientX;
      d.y = e.clientY;
      this.clampLook();
      this.opt.onLook();
      this.want();
    });
    el.addEventListener("pointerleave", () => {
      this.pointer = undefined;
      this.track();
    });
    const up = (e: PointerEvent) => {
      this.pinch.delete(e.pointerId);
      const d = this.drag;
      // a click or tap, not a drag: walk to the spot under it
      if (e.type === "pointerup" && d?.id === e.pointerId && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6 && performance.now() - d.t < 600) {
        const [x, y] = local(e);
        this.request({ kind: "pick", x, y });
      }
      if (this.drag?.id === e.pointerId) {
        // a pause before letting go means no flick
        if (performance.now() - this.drag.t > 0 && Math.abs(this.velocity[0]) + Math.abs(this.velocity[1]) < 0.05) this.velocity = [0, 0];
        this.drag = undefined;
      }
      this.track();
      this.opt.onLook();
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.hfov = clamp(this.hfov + Math.sign(e.deltaY) * 6, this.opt.minHfov, this.opt.maxHfov);
        this.want();
      },
      { passive: false },
    );
    el.addEventListener("keydown", (e) => {
      const step = this.hfov / 12;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        e.preventDefault();
        if (this.reduced) {
          this.yaw += key === "ArrowLeft" ? -step : step;
          this.clampLook();
          this.opt.onLook();
        } else this.held.add(key);
        this.want();
        return;
      } else if (key === "ArrowUp" || key === "w" || key === "ArrowDown" || key === "s") {
        e.preventDefault();
        this.request({ kind: "key", back: key === "ArrowDown" || key === "s", repeat: e.repeat });
        return;
      } else if (key === "Home") this.pitch += step;
      else if (key === "End") this.pitch -= step;
      else if (key === "+" || key === "=" || key === "PageUp") this.hfov -= 10;
      else if (key === "-" || key === "_" || key === "PageDown") this.hfov += 10;
      else return;
      e.preventDefault();
      this.clampLook();
      this.opt.onLook();
      this.want();
    });
    el.addEventListener("keyup", (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.held.delete(key);
      // letting go of a held walking key ends the walk: the key repeats that were waiting for the glide to end are dropped
      if (this.queued?.kind === "key" && this.queued.repeat) this.queued = undefined;
    });
    el.addEventListener("blur", () => {
      this.held.clear();
      if (this.queued?.kind === "key") this.queued = undefined;
    });
  }

  destroy() {
    this.dead = true;
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.raf);
    this.anim?.cancel();
    const gl = this.gl;
    for (const e of this.loaded.values()) {
      gl.deleteTexture(e.color);
      gl.deleteTexture(e.depth);
    }
    this.loaded.clear();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.host.classList.remove("wt-depth");
    this.host.replaceChildren();
  }
}
