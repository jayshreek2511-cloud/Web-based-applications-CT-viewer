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
