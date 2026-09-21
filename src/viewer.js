import { Niivue, NVImage } from '@niivue/niivue';
import { ORGANS, dataUrl } from './data-config.js';

const rgb = (hex) => hex.match(/\w\w/g).map((v) => parseInt(v, 16));

/** Thin NiiVue adapter: UI never needs to know volume indices or WebGL details. */
export class CTViewer {
  constructor(canvasId, onLocation) {
    this.nv = new Niivue({
      backColor: [0.035, 0.055, 0.1, 1], crosshairColor: [0.2, 0.85, 1, 0.9],
      crosshairWidth: 1, isColorbar: false, isOrientCube: true, isNearestInterpolation: true,
      sliceType: Niivue.sliceTypeMultiplanar, multiplanarForceRender: true, loadingText: '',
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
    this.nv.setSliceType(Niivue.sliceTypeMultiplanar);
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
    const types = { grid: Niivue.sliceTypeMultiplanar, axial: Niivue.sliceTypeAxial, coronal: Niivue.sliceTypeCoronal, sagittal: Niivue.sliceTypeSagittal, render: Niivue.sliceTypeRender };
    this.nv.setSliceType(types[view]); this.nv.drawScene();
  }
  toggleCrosshair() { this.crosshairOn = !this.crosshairOn; this.nv.opts.crosshairWidth = this.crosshairOn ? 1 : 0; this.nv.drawScene(); return this.crosshairOn; }
  resetView() { this.nv.setSliceType(Niivue.sliceTypeMultiplanar); this.nv.drawScene(); }
  async loadFiles(files) {
    if (!files.length) return;
    this.nv.volumes.slice().forEach((volume) => this.nv.removeVolume(volume));
    const loaded = await Promise.all([...files].map((file) => NVImage.loadFromFile({ file, name: file.name, colormap: 'gray' })));
    loaded.forEach((volume, i) => this.nv.addVolume(volume));
    loaded.slice(1).forEach((_, index) => { this.nv.volumes[index + 1].cal_min = 0.5; this.nv.volumes[index + 1].cal_max = 1; this.setMaskColor(index % ORGANS.length, ORGANS[index % ORGANS.length].color); });
    this.nv.drawScene();
  }
}
