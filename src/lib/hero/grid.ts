import { VS, FS } from './shaders';
import { PRESETS, DPR_MAX, GRID_DESKTOP, GRID_SMALL, FRAME_MS_DESKTOP, FRAME_MS_SMALL } from './config';

const smooth = (f: number) => f * f * (3 - 2 * f);

export function mountHero(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
  });
  if (!gl) return () => {};

  const small = innerWidth < 768 || (navigator.hardwareConcurrency || 4) <= 4;
  const [cols, rows] = small ? GRID_SMALL : GRID_DESKTOP;
  const frameMs = small ? FRAME_MS_SMALL : FRAME_MS_DESKTOP;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tilt = !matchMedia('(hover: none)').matches;

  const program = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(program, sh);
  }
  gl.linkProgram(program);

  let raf = 0, stopped = false;
  let tx = 0, ty = 0, px = 0, py = 0, pr = 0, tr = 0;
  let scroll = 0, tScroll = 0, elapsed = still ? 20 : 0, prev = 0, last = 0;
  let u: Record<string, WebGLUniformLocation | null>;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
    canvas.width = Math.max(1, Math.round(innerWidth * dpr));
    canvas.height = Math.max(1, Math.round(innerHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    measure();
    gl.uniform1f(u.aspect, innerWidth / Math.max(1, innerHeight));
    gl.uniform1f(u.vh, canvas.height);
    onScroll();
    kick();
  };
  // Preset position: 0 landing, 1 about (held while its text is revealed), 2 contact.
  let tops: number[] = [];
  const measure = () => {
    tops = [...document.querySelectorAll<HTMLElement>('[data-screen]')].map((s) => s.offsetTop);
  };
  const position = () => {
    const y = scrollY, n = tops.length;
    let i = 0;
    while (i < n - 1 && y >= tops[i + 1]) i++;
    if (i >= n - 1) return n - 1;
    // Landing/about hold their preset, then blend over the last viewport; later screens drift across their whole length.
    const start = i >= 2 ? tops[i] : Math.max(tops[i], tops[i + 1] - innerHeight);
    return i + Math.max(0, Math.min(1, (y - start) / Math.max(1, tops[i + 1] - start)));
  };
  const onScroll = () => {
    tScroll = position();
    if (still) scroll = tScroll;
    kick();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
    ty = 1 - (e.clientY / Math.max(1, innerHeight)) * 2;
    tr = Math.max(-1, Math.min(1, (tx - ty) * 0.5));
  };
  const onBlur = () => { tx = ty = tr = 0; };
  const onVis = () => { prev = 0; kick(); };

  const view = new Float32Array(6);
  const frame = (now: number) => {
    raf = 0;
    if (stopped || document.hidden) return;
    if (!still && now - last < frameMs - 1) { raf = requestAnimationFrame(frame); return; }
    last = now;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    if (!still) elapsed += dt;
    const k = 1 - Math.exp(-2.7 * dt);
    px += (tx - px) * k; py += (ty - py) * k; pr += (tr - pr) * (1 - Math.exp(-2 * dt));
    scroll += (tScroll - scroll) * (still ? 1 : 1 - Math.exp(-5 * dt));
    const i = Math.min(PRESETS.length - 2, Math.floor(scroll));
    const f = smooth(scroll - i);
    for (let j = 0; j < 6; j++) view[j] = PRESETS[i][j] + (PRESETS[i + 1][j] - PRESETS[i][j]) * f;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3f(u.pointer, px, py, pr);
    gl.uniform4f(u.view, view[0], view[1], view[2], view[3]);
    gl.uniform2f(u.shift, view[4], view[5]);
    gl.uniform1f(u.time, elapsed);
    gl.drawArrays(gl.POINTS, 0, cols * rows);
    canvas.dataset.ready = '';
    if (!still || Math.abs(tScroll - scroll) > 1e-3) kick();
  };
  const kick = () => { if (!raf && !stopped && !document.hidden) raf = requestAnimationFrame(frame); };

  const ext = gl.getExtension('KHR_parallel_shader_compile');
  const start = () => {
    if (stopped) return;
    if (ext && !gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR)) { raf = requestAnimationFrame(start); return; }
    raf = 0;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    u = {};
    for (const [k, n] of Object.entries({
      grid: 'uGrid', pointer: 'uPointer', view: 'uView', shift: 'uShift', time: 'uTime', aspect: 'uAspect', vh: 'uViewportHeight',
    })) u[k] = gl.getUniformLocation(program, n);
    gl.uniform2f(u.grid, cols, rows);
    addEventListener('resize', resize, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    if (tilt && !still) {
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('blur', onBlur);
    }
    measure();
    scroll = tScroll = position();
    resize();
  };
  const onLost = (e: Event) => { e.preventDefault(); stopped = true; cancelAnimationFrame(raf); delete canvas.dataset.ready; };
  canvas.addEventListener('webglcontextlost', onLost);
  start();

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('scroll', onScroll);
    removeEventListener('pointermove', onMove);
    removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost);
  };
}
