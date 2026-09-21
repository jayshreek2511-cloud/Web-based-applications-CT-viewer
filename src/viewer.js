import { Niivue, NVImage } from '@niivue/niivue';
import { ORGANS, dataUrl } from './data-config.js';

const rgb = (hex) => hex.match(/\w\w/g).map((v) => parseInt(v, 16));
const hasGzipMagic = (bytes) => bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

/** Thin NiiVue adapter: UI never needs to know volume indices or WebGL details. */
export class CTViewer {
  constructor(canvasId, onLocation) {
    this.nv = new Niivue({
      backColor: [0.035, 0.055, 0.1, 1], crosshairColor: [0.2, 0.85, 1, 0.9],
      crosshairWidth: 1, isColorbar: false, isOrientCube: true, isNearestInterpolation: true,
      // NiiVue draws this marker at scene.crosshairPos in the volume render.
      show3Dcrosshair: true,
      // Slice constants are instance properties in the installed NiiVue API.
      sliceType: 3, multiplanarForceRender: true, loadingText: '',
    });
    this.canvasId = canvasId;
    this.crosshairOn = true;
    this.cutAtCrosshair = false;
    this.nv.onLocationChange = (location) => {
      if (this.cutAtCrosshair) this.updateCrosshairClip();
      onLocation(location, this.nv.volumes);
    };
  }

  async init() { await this.nv.attachTo(this.canvasId); }

  async loadDefault(onProgress, maskCount = ORGANS.length) {
    const volumes = [
      // Keep the filename so NiiVue can select its NIfTI loader.
      { url: dataUrl('ct.nii.gz'), name: 'ct.nii.gz', colormap: 'gray', cal_min: -160, cal_max: 240, trustCalMinMax: true },
      ...ORGANS.slice(0, maskCount).map((organ) => ({ url: dataUrl(`segmentations/${organ.id}.nii.gz`), name: `${organ.id}.nii.gz`, opacity: organ.opacity, cal_min: 0.5, cal_max: 1, trustCalMinMax: true })),
    ];

    let completed = 0;
    const loaded = [];
    for (const volume of volumes) {
      const response = await fetch(volume.url);
      if (!response.ok) throw new Error(`Could not load ${volume.name} (${response.status})`);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const magic = [...bytes.slice(0, 4)].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
      const compressed = hasGzipMagic(bytes);
      console.info(`BodyMaps load: ${volume.name}; first bytes ${magic}; ${compressed ? 'gzip payload' : 'already decompressed'}`);
      // CDN hosts vary: a Content-Encoding response reaches Fetch already
      // decompressed, while a raw .nii.gz file keeps its gzip magic. NiiVue
      // uses the supplied extension to choose the matching decoder.
      const name = compressed ? volume.name : volume.name.replace(/\.gz$/i, '');
      loaded.push(await NVImage.loadFromUrl({ ...volume, url: buffer, name }));
      completed += 1;
      onProgress(completed, volumes.length, volume.name);
    }
    onProgress(completed, volumes.length, 'adding volumes');
    this.nv.volumes = [];
    loaded.forEach((volume) => this.nv.addVolume(volume));
    onProgress(completed, volumes.length, 'applying colormaps');
    this.configureMaskColormaps(maskCount);
    // The initial NiiVue options already select the multiplanar layout.
    // Avoid a redundant setSliceType() here: it synchronously redraws while
    // the loading overlay is still visible and was the CT-only hang point.
  }

  configureMaskColormaps(maskCount) {
    ORGANS.slice(0, maskCount).forEach((organ, index) => {
      const [r, g, b] = rgb(organ.color);
      const key = `bodymaps-${index}`;
      this.nv.addColormap(key, { R: [0, r], G: [0, g], B: [0, b], A: [0, 255], I: [0, 255] });
      this.nv.volumes[index + 1].colormap = key;
    });
    this.nv.updateGLVolume();
  }

  setMaskColor(index, color) {
    const [r, g, b] = rgb(color);
    const key = `bodymaps-${index}`;
    this.nv.addColormap(key, { R: [0, r], G: [0, g], B: [0, b], A: [0, 255], I: [0, 255] });
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
  updateCrosshairClip() {
    // setClipPlanes() takes [depth, azimuth, elevation]. An elevation of -90
    // gives an axial (Z) plane; depth is measured from the volume centre.
    const z = this.nv.scene.crosshairPos[2];
    this.nv.setClipPlanes([[z - 0.5, 0, -90]]);
  }
  setCutAtCrosshair(enabled) {
    this.cutAtCrosshair = enabled;
    if (enabled) this.updateCrosshairClip();
    // NiiVue documents depth > 2 as its no-clip sentinel, restoring the
    // untouched render whenever this control is switched off.
    else this.nv.setClipPlanes([[2, 0, 0]]);
    return this.cutAtCrosshair;
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
