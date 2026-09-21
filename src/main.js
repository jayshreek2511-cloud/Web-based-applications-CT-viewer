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
