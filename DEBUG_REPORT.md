# CT Viewer debug report

Captured on 2026-09-21 while `npm run dev` served the project at `http://localhost:5173/`. No secrets are included.

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#101725" />
    <title>BodyMaps CT Viewer</title>
  </head>
  <body>
    <div id="app">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">BM</span><div><strong>BodyMaps</strong><small>JHU · CT workstation</small></div></div>
        <div class="toolbar" aria-label="Viewer controls">
          <div class="view-buttons" role="group" aria-label="View"><button data-view="grid" class="active">Grid</button><button data-view="axial">Axial</button><button data-view="coronal">Coronal</button><button data-view="sagittal">Sagittal</button><button data-view="render">3D</button></div>
          <button id="crosshair-button" title="Toggle crosshair">Crosshair: on</button>
          <button id="reset-button">Reset view</button>
          <label class="file-button">Open NIfTI<input id="file-input" type="file" accept=".nii,.gz,.nii.gz" multiple hidden /></label>
        </div>
      </header>
      <main>
        <aside class="sidebar">
          <section><div class="section-heading"><h2>Segments</h2><div><button id="show-all">Show all</button><button id="hide-all">Hide all</button></div></div><div id="segment-list" class="segment-list"></div></section>
          <section class="window-section"><h2>CT window / level</h2><div class="preset-grid" id="preset-grid"></div><label>Window <output id="window-value">400</output><input id="window-slider" type="range" min="100" max="4000" step="10" value="400" /></label><label>Level <output id="level-value">40</output><input id="level-slider" type="range" min="-1000" max="2000" step="10" value="40" /></label></section>
          <section class="hint"><h2>Controls</h2><p>Scroll to change slices. Left-click to position the crosshair. Drag files here or use <em>Open NIfTI</em>; the first file becomes CT and following files are masks.</p></section>
        </aside>
        <section id="viewer-wrap" class="viewer-wrap" aria-label="CT image viewer">
          <canvas id="gl"></canvas>
          <div id="drop-message">Drop .nii or .nii.gz files to load</div>
          <div class="orientation-labels" aria-hidden="true"><span>R</span><span>A</span><span>S</span></div>
          <div id="loading" class="loading"><div class="spinner"></div><strong>Loading BodyMaps case</strong><span id="loading-detail">Preparing viewer…</span></div>
          <div id="error" class="error" hidden></div>
          <div class="readout"><span id="organ-readout">Background</span><strong id="hu-readout">— HU</strong></div>
        </section>
      </main>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## `vite.config.js`

```js
import { defineConfig } from 'vite';

export default defineConfig({ base: './' });
```

## `package.json`

```json
{
  "name": "ct-viewer",
  "version": "1.0.0",
  "description": "Browser-based CT and organ-mask viewer for BodyMaps.",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@niivue/niivue": "^0.69.0",
    "vite": "^8.3.0"
  }
}
```

## `.gitignore`

```gitignore
node_modules/
dist/
public/data/
.DS_Store
*.log
```

## `src/data-config.js`

```js
// Case metadata is kept separate so another research case can be substituted easily.
export const ORGANS = [
  ['aorta', 'Aorta', '#ef4444'], ['gall_bladder', 'Gall bladder', '#22c55e'],
  ['kidney_left', 'Left kidney', '#38bdf8'], ['kidney_right', 'Right kidney', '#a78bfa'],
  ['liver', 'Liver', '#f59e0b'], ['pancreas', 'Pancreas', '#ec4899'],
  ['postcava', 'Postcava', '#14b8a6'], ['spleen', 'Spleen', '#e879f9'], ['stomach', 'Stomach', '#84cc16'],
].map(([id, name, color]) => ({ id, name, color, opacity: 0.58 }));

export const PRESETS = {
  'Soft tissue': { window: 400, level: 40 }, Bone: { window: 2000, level: 400 },
  Lung: { window: 1500, level: -600 }, Brain: { window: 80, level: 40 },
};

export function dataUrl(path) {
  return `${import.meta.env.BASE_URL}data/BDMAP_00000338/${path}`;
}
```

## `src/main.js`

```js
import './style.css';
import { CTViewer } from './viewer.js';
import { setupUI, showError, updateReadout } from './ui.js';

const loading = document.getElementById('loading');
const detail = document.getElementById('loading-detail');
const viewer = new CTViewer('gl', updateReadout);
setupUI(viewer);

try {
  await viewer.init();
  await viewer.loadDefault((done, total, name) => { detail.textContent = `Checking ${done}/${total}: ${name}`; });
  loading.hidden = true;
} catch (error) {
  loading.hidden = true;
  showError(error);
  console.error(error);
}
```

## `src/style.css`

```css
:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #e7eefc; background: #09111f; font-size: 14px; } * { box-sizing: border-box; } body { margin: 0; min-width: 320px; overflow: hidden; } button, input { font: inherit; } button { color: #dbeafe; background: #17243a; border: 1px solid #2b3c58; border-radius: 6px; padding: 6px 9px; cursor: pointer; } button:hover, button.active { background: #1d4e80; border-color: #3b82f6; } .topbar { height: 62px; display:flex; align-items:center; justify-content:space-between; padding: 0 18px; border-bottom: 1px solid #24334d; background:#101a2b; gap:16px; } .brand { display:flex; gap:9px; align-items:center; white-space:nowrap; } .brand strong { display:block; letter-spacing:.02em; } .brand small { color:#8da1bf; font-size:11px; }.brand-mark { display:grid; place-items:center; width:31px; height:31px; border-radius:8px; background:#2563eb; font-weight:800; font-size:11px; }.toolbar,.view-buttons { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end; }.file-button { color:#dbeafe; background:#17243a; border:1px solid #2b3c58; border-radius:6px; padding:6px 9px; cursor:pointer; } main { display:grid; grid-template-columns: 310px minmax(0,1fr); height:calc(100vh - 62px); }.sidebar { overflow:auto; padding:15px; background:#0e1727; border-right:1px solid #24334d; }.sidebar section { border-bottom:1px solid #273750; padding-bottom:14px; margin-bottom:15px; }.sidebar h2 { font-size:12px; letter-spacing:.08em; color:#95aac9; text-transform:uppercase; margin:0 0 10px; }.section-heading { display:flex; align-items:center; justify-content:space-between; }.section-heading div { display:flex; gap:4px; }.section-heading button { font-size:11px; padding:4px 6px; }.segment-list { display:grid; gap:7px; }.segment-row { display:grid; grid-template-columns:minmax(0,1fr) 26px 100px; align-items:center; gap:7px; }.segment-name { min-width:0; display:flex; align-items:center; gap:7px; cursor:pointer; }.segment-name span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.segment-name i { width:10px; height:10px; border-radius:50%; flex:none; }.segment-row input[type=color] { appearance:none; border:0; padding:0; background:transparent; width:23px; height:23px; cursor:pointer; }.opacity { display:flex; align-items:center; gap:5px; }.opacity input { width:69px; accent-color:#60a5fa; }.opacity output { color:#9db1ce; font-size:11px; width:28px; }.window-section label { display:grid; grid-template-columns:1fr auto; color:#b6c6dd; margin-top:10px; gap:4px; }.window-section input { grid-column:1 / -1; accent-color:#60a5fa; }.window-section output { color:#fff; }.preset-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }.preset-grid button { font-size:12px; }.hint { color:#91a4c2; line-height:1.45; font-size:12px; }.hint p { margin:0; }.viewer-wrap { position:relative; min-width:0; min-height:0; background:#050914; outline:none; }.viewer-wrap.dragging { box-shadow:inset 0 0 0 3px #60a5fa; }.viewer-wrap.dragging #drop-message { opacity:1; }.viewer-wrap canvas { width:100%; height:100%; display:block; }.loading, .error { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:8px; padding:18px 24px; border-radius:10px; background:rgba(14,23,39,.92); border:1px solid #334866; text-align:center; max-width:360px; }.loading span { color:#9dafc8; font-size:12px; }.spinner { width:24px; height:24px; border:3px solid #385174; border-top-color:#60a5fa; border-radius:50%; animation:spin .8s linear infinite; }.error { color:#fecaca; }.readout { position:absolute; left:16px; bottom:15px; padding:8px 11px; background:rgba(9,17,31,.85); border:1px solid #31435e; border-radius:7px; display:flex; gap:14px; }.readout span { color:#b8c8e0; }.readout strong { color:#fff; }.orientation-labels { position:absolute; right:15px; top:14px; display:flex; gap:6px; color:#7dd3fc; font-weight:700; font-size:11px; pointer-events:none; }.orientation-labels span { padding:3px 5px; background:rgba(9,17,31,.7); border-radius:3px; } #drop-message { opacity:0; pointer-events:none; transition:.15s; position:absolute; inset:25%; display:grid; place-items:center; border:2px dashed #60a5fa; color:#dbeafe; background:rgba(9,17,31,.78); font-weight:600; } @keyframes spin { to { transform:rotate(360deg); } } @media (max-width: 850px) { body { overflow:auto; } .topbar { height:auto; min-height:62px; padding:10px 12px; align-items:flex-start; }.toolbar { justify-content:flex-start; }.topbar { flex-direction:column; } main { grid-template-columns:1fr; height:auto; }.sidebar { order:2; border-right:0; border-top:1px solid #24334d; }.viewer-wrap { height:65vh; min-height:400px; }.segment-row { grid-template-columns:minmax(0,1fr) 28px 130px; } }
```

## `src/ui.js`

```js
import { ORGANS, PRESETS } from './data-config.js';

const $ = (id) => document.getElementById(id);

export function setupUI(viewer) {
  const list = $('segment-list');
  ORGANS.forEach((organ, index) => {
    const row = document.createElement('div'); row.className = 'segment-row';
    row.innerHTML = `<label class="segment-name"><input type="checkbox" checked data-visible="${index}"><i style="background:${organ.color}"></i><span>${organ.name}</span></label><input aria-label="${organ.name} color" type="color" value="${organ.color}" data-color="${index}"><label class="opacity"><input aria-label="${organ.name} opacity" type="range" min="0" max="1" step="0.05" value="${organ.opacity}" data-opacity="${index}"><output>${Math.round(organ.opacity * 100)}%</output></label>`;
    list.append(row);
  });
  list.addEventListener('input', (event) => {
    const target = event.target; const index = Number(target.dataset.visible ?? target.dataset.color ?? target.dataset.opacity);
    if (target.dataset.visible !== undefined) viewer.setMaskVisible(index, target.checked);
    if (target.dataset.color !== undefined) { ORGANS[index].color = target.value; viewer.setMaskColor(index, target.value); target.closest('.segment-row').querySelector('i').style.background = target.value; }
    if (target.dataset.opacity !== undefined) { viewer.setMaskOpacity(index, target.value); target.nextElementSibling.value = `${Math.round(target.value * 100)}%`; }
  });
  $('show-all').onclick = () => list.querySelectorAll('[data-visible]').forEach((box) => { box.checked = true; viewer.setMaskVisible(Number(box.dataset.visible), true); });
  $('hide-all').onclick = () => list.querySelectorAll('[data-visible]').forEach((box) => { box.checked = false; viewer.setMaskVisible(Number(box.dataset.visible), false); });
  const presets = $('preset-grid');
  Object.entries(PRESETS).forEach(([name, values]) => { const button = document.createElement('button'); button.textContent = name; button.onclick = () => setWindowLevel(values.window, values.level); presets.append(button); });
  const setWindowLevel = (window, level) => { $('window-slider').value = window; $('level-slider').value = level; $('window-value').value = window; $('level-value').value = level; viewer.setWindowLevel(window, level); };
  ['window', 'level'].forEach((name) => $( `${name}-slider`).addEventListener('input', () => setWindowLevel($('window-slider').value, $('level-slider').value)));
  document.querySelector('.view-buttons').addEventListener('click', (event) => { if (!event.target.dataset.view) return; document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button === event.target)); viewer.setView(event.target.dataset.view); });
  $('crosshair-button').onclick = () => { const on = viewer.toggleCrosshair(); $('crosshair-button').textContent = `Crosshair: ${on ? 'on' : 'off'}`; };
  $('reset-button').onclick = () => { viewer.resetView(); document.querySelector('[data-view="grid"]').click(); };
  const acceptFiles = async (files) => { try { await viewer.loadFiles(files); } catch (error) { showError(error); } };
  $('file-input').onchange = (event) => acceptFiles(event.target.files);
  const wrap = $('viewer-wrap'); ['dragenter', 'dragover'].forEach((type) => wrap.addEventListener(type, (event) => { event.preventDefault(); wrap.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((type) => wrap.addEventListener(type, (event) => { event.preventDefault(); wrap.classList.remove('dragging'); }));
  wrap.addEventListener('drop', (event) => acceptFiles([...event.dataTransfer.files].filter((file) => /\.nii(\.gz)?$/i.test(file.name))));
}

export function updateReadout(location, volumes) {
  const values = location?.values ?? []; const base = values[0]?.value;
  const mask = values.slice(1).find((value) => Number(value.value) > 0.5);
  const organ = ORGANS.find((item) => mask?.name?.startsWith(item.id));
  $('organ-readout').textContent = organ?.name || 'Background';
  $('hu-readout').textContent = Number.isFinite(base) ? `${Math.round(base)} HU` : '— HU';
}
export function showError(error) { const el = $('error'); el.textContent = `Unable to load the study: ${error.message}`; el.hidden = false; }
```

## `src/viewer.js`

```js
import { Niivue, NVImage } from '@niivue/niivue';
import { ORGANS, dataUrl } from './data-config.js';

const rgb = (hex) => hex.match(/\w\w/g).map((v) => parseInt(v, 16));

/** Thin NiiVue adapter: UI never needs to know volume indices or WebGL details. */
export class CTViewer {
  constructor(canvasId, onLocation) {
    this.nv = new Niivue({
      backColor: [0.035, 0.055, 0.1, 1], crosshairColor: [0.2, 0.85, 1, 0.9],
      crosshairWidth: 1, isColorbar: false, isOrientCube: true, isNearestInterpolation: true,
      // Slice constants are instance properties in the installed NiiVue API.
      sliceType: 3, multiplanarForceRender: true, loadingText: '',
    });
    this.canvasId = canvasId;
    this.crosshairOn = true;
    this.nv.onLocationChange = (location) => onLocation(location, this.nv.volumes);
  }

  async init() { await this.nv.attachTo(this.canvasId); }

  async loadDefault(onProgress) {
    const volumes = [
      // NiiVue determines a loader from `name` before fetching, so names retain their extensions.
      { url: dataUrl('ct.nii.gz'), name: 'ct.nii.gz', colormap: 'gray', cal_min: -160, cal_max: 240, trustCalMinMax: true },
      ...ORGANS.map((organ) => ({ url: dataUrl(`segmentations/${organ.id}.nii.gz`), name: `${organ.id}.nii.gz`, opacity: organ.opacity, cal_min: 0.5, cal_max: 1, trustCalMinMax: true })),
    ];
    // Fetch first: failures identify the exact file before NiiVue decodes it.
    await Promise.all(volumes.map(async (volume, index) => {
      const response = await fetch(volume.url, { method: 'HEAD' });
      if (!response.ok) throw new Error(`Could not load ${volume.name} (${response.status})`);
      onProgress(index + 1, volumes.length, volume.name);
    }));
    await this.nv.loadVolumes(volumes);
    ORGANS.forEach((organ, index) => this.setMaskColor(index, organ.color));
    this.nv.setSliceType(this.nv.sliceTypeMultiplanar);
    this.nv.drawScene();
  }

  setMaskColor(index, color) {
    const [r, g, b] = rgb(color);
    const key = `bodymaps-${index}`;
    this.nv.addColormap(key, { R: [0, r], G: [0, g], B: [0, b], A: [0, 255], I: [0, 1] });
    const volume = this.nv.volumes[index + 1];
    if (volume) this.nv.setColormap(volume.id, key);
  }
  setMaskVisible(index, visible) { this.nv.setOpacity(index + 1, visible ? Number(ORGANS[index].opacity) : 0); }
  setMaskOpacity(index, opacity) { ORGANS[index].opacity = Number(opacity); this.nv.setOpacity(index + 1, Number(opacity)); }
  setWindowLevel(window, level) {
    const ct = this.nv.volumes[0]; if (!ct) return;
    ct.cal_min = Number(level) - Number(window) / 2; ct.cal_max = Number(level) + Number(window) / 2;
    this.nv.updateGLVolume();
  }
  setView(view) {
    const types = { grid: this.nv.sliceTypeMultiplanar, axial: this.nv.sliceTypeAxial, coronal: this.nv.sliceTypeCoronal, sagittal: this.nv.sliceTypeSagittal, render: this.nv.sliceTypeRender };
    this.nv.setSliceType(types[view]); this.nv.drawScene();
  }
  toggleCrosshair() { this.crosshairOn = !this.crosshairOn; this.nv.opts.crosshairWidth = this.crosshairOn ? 1 : 0; this.nv.drawScene(); return this.crosshairOn; }
  resetView() { this.nv.setSliceType(this.nv.sliceTypeMultiplanar); this.nv.drawScene(); }
  async loadFiles(files) {
    if (!files.length) return;
    this.nv.volumes.slice().forEach((volume) => this.nv.removeVolume(volume));
    const loaded = await Promise.all([...files].map((file) => NVImage.loadFromFile({ file, name: file.name, colormap: 'gray' })));
    loaded.forEach((volume, i) => this.nv.addVolume(volume));
    loaded.slice(1).forEach((_, index) => { this.nv.volumes[index + 1].cal_min = 0.5; this.nv.volumes[index + 1].cal_max = 1; this.setMaskColor(index % ORGANS.length, ORGANS[index % ORGANS.length].color); });
    this.nv.drawScene();
  }
}
```

## Environment and data listing

```text
$ node -v
v24.16.0

$ npm -v
11.13.0

$ git status --short --branch
## main...origin/main
 M src/viewer.js

$ directory listing: public/data
public/data/BDMAP_00000338/ct.nii.gz                              16040151 bytes
public/data/BDMAP_00000338/segmentations/aorta.nii.gz                59669 bytes
public/data/BDMAP_00000338/segmentations/gall_bladder.nii.gz         57348 bytes
public/data/BDMAP_00000338/segmentations/kidney_left.nii.gz          68163 bytes
public/data/BDMAP_00000338/segmentations/kidney_right.nii.gz         67400 bytes
public/data/BDMAP_00000338/segmentations/liver.nii.gz               128476 bytes
public/data/BDMAP_00000338/segmentations/pancreas.nii.gz             67030 bytes
public/data/BDMAP_00000338/segmentations/postcava.nii.gz             62007 bytes
public/data/BDMAP_00000338/segmentations/spleen.nii.gz               71375 bytes
public/data/BDMAP_00000338/segmentations/stomach.nii.gz              86039 bytes
```

## Browser console at the hang

The page visibly remained at `Checking 1/10: ct.nii.gz`. No `console.error` entries were captured. The browser emitted the following exact warning repeatedly (the browser-log capture contained 100 warning entries, all with exactly this message):

```text
niivue-warn padding colormap: indices expected end with 255 not  1
```

## Network result: `/data/BDMAP_00000338/ct.nii.gz`

While the Vite development server was running, a `HEAD` request completed successfully:

```text
HTTP/1.1 200 OK
Content-Type:
Content-Encoding: gzip
Content-Length: 16040151
Elapsed: 0.044036s
```

## Development-server terminal output

Startup output:

```text
> ct-viewer@1.0.0 dev
> vite

VITE v8.3.0  ready in 468 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

After loading the hanging page, the Vite terminal continuously relayed the same client warning shown above, for example:

```text
8:13:20 pm [vite] (client) [console.warn] niivue-warn padding colormap: indices expected end with 255 not  1
```
