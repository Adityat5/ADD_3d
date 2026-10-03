const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const webDir = path.join(root, 'www');
const libsDir = path.join(webDir, 'libs');

const threeScript =
  '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>';
const controlsScript =
  '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>';

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(libsDir, { recursive: true });

for (const filename of ['index.html', 'viewport3d.js']) {
  fs.copyFileSync(path.join(root, filename), path.join(webDir, filename));
}

fs.copyFileSync(
  path.join(root, 'node_modules/three/build/three.min.js'),
  path.join(libsDir, 'three.min.js')
);
fs.copyFileSync(
  path.join(root, 'node_modules/three/examples/js/controls/OrbitControls.js'),
  path.join(libsDir, 'OrbitControls.js')
);

const copiedIndexPath = path.join(webDir, 'index.html');
const copiedIndex = fs.readFileSync(copiedIndexPath, 'utf8');
if (!copiedIndex.includes(threeScript) || !copiedIndex.includes(controlsScript)) {
  throw new Error('Could not find both Three.js CDN script tags in the copied index.html.');
}
fs.writeFileSync(
  copiedIndexPath,
  copiedIndex
    .replace(threeScript, '<script src="libs/three.min.js"></script>')
    .replace(controlsScript, '<script src="libs/OrbitControls.js"></script>')
);
