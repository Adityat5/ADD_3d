(() => {
  'use strict';

  // Resolve the mount and confirm the requested runtime dependencies are loaded.
  const mount = document.getElementById('viewport3d');
  if (!mount || !window.THREE || !window.THREE.OrbitControls) {
    throw new Error('Viewport3D requires #viewport3d, Three.js, and OrbitControls.');
  }

  // Initialize the scene with distance fog for a soft fade at the grid edges.
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x121820, 10, 28);

  // Create the transparent renderer so the panel's CSS background remains visible.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  mount.appendChild(renderer.domElement);

  // Set up the perspective camera and mouse/touch orbit controls.
  const initialAspect = mount.clientHeight > 0
    ? mount.clientWidth / mount.clientHeight
    : 1;
  const camera = new THREE.PerspectiveCamera(40, initialAspect, 0.1, 100);
  const defaultCameraPosition = new THREE.Vector3(4.2, 3.0, 6.0);
  const defaultTarget = new THREE.Vector3(0, 1, 0);
  camera.position.copy(defaultCameraPosition);
  camera.lookAt(defaultTarget);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(defaultTarget);
  controls.minDistance = 2.5;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.49;

  // Add the reference floor grid and softly faded axis lines.
  const grid = new THREE.GridHelper(24, 24, 0x3d4757, 0x2a323e);
  grid.position.y = 0;
  if (Array.isArray(grid.material)) {
    grid.material.forEach((material) => {
      material.fog = true;
    });
  } else {
    grid.material.fog = true;
  }
  scene.add(grid);

  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-12, 0.006, 0),
      new THREE.Vector3(12, 0.006, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0xb04040, transparent: true, opacity: 0.7 })
  );
  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.006, -12),
      new THREE.Vector3(0, 0.006, 12)
    ]),
    new THREE.LineBasicMaterial({ color: 0x3f6fb0, transparent: true, opacity: 0.7 })
  );
  scene.add(xAxis, zAxis);

  // Build the lightweight greybox character and its ground contact shadow.
  const character = new THREE.Group();
  const characterMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a94a6,
    roughness: 0.7,
    metalness: 0.05
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 1.0, 20),
    characterMaterial
  );
  body.position.y = 0.9;
  character.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 24, 16),
    characterMaterial
  );
  head.position.y = 1.62;
  character.add(head);

  [-0.12, 0.12].forEach((x) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12),
      characterMaterial
    );
    leg.position.set(x, 0.25, 0);
    character.add(leg);
  });
  scene.add(character);

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.005;
  scene.add(groundShadow);

  // Show the blue selection ring and three colored transform arrows.
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.78, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4A90E2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.01;
  scene.add(selectionRing);

  const gizmoOrigin = new THREE.Vector3(0, 0.02, 0);
  scene.add(
    new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), gizmoOrigin, 1.3, 0x4A90E2, 0.12, 0.08
    ),
    new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), gizmoOrigin, 0.9, 0xe5534b, 0.12, 0.08
    ),
    new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1), gizmoOrigin, 0.9, 0x7ac74f, 0.12, 0.08
    )
  );

  // Light the placeholder without enabling expensive real-time shadows.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(3, 5, 4);
  scene.add(directionalLight);

  // Keep the drawing buffer aligned to the mount, not to the browser window.
  const resizeObserver = new ResizeObserver(() => {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(mount);

  // Expose only the requested viewport controls.
  const zoom = (factor) => {
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance
    );
    camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance));
    controls.update();
  };
  const fit = () => {
    controls.target.copy(defaultTarget);
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(defaultTarget);
    controls.update();
  };

  window.Viewport3D = {
    zoomIn: () => zoom(0.85),
    zoomOut: () => zoom(1 / 0.85),
    fit
  };

  // Connect only the three requested view toolbar buttons.
  const zoomInButton = document.querySelector(
    '.viewport-toolbar-right button[aria-label="Zoom in"]'
  );
  const zoomOutButton = document.querySelector(
    '.viewport-toolbar-right button[aria-label="Zoom out"]'
  );
  const fitButton = document.querySelector(
    '.viewport-toolbar-right button[aria-label="Fit or frame"]'
  );
  if (!zoomInButton || !zoomOutButton || !fitButton) {
    throw new Error('Viewport3D could not find the zoom and fit toolbar buttons.');
  }
  zoomInButton.addEventListener('click', window.Viewport3D.zoomIn);
  zoomOutButton.addEventListener('click', window.Viewport3D.zoomOut);
  fitButton.addEventListener('click', window.Viewport3D.fit);

  // Render continuously while visible and suspend animation in background tabs.
  let animationFrame = null;
  const render = () => {
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(render);
  };
  const resumeRendering = () => {
    if (!document.hidden && animationFrame === null) {
      animationFrame = requestAnimationFrame(render);
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    } else {
      resumeRendering();
    }
  });
  resumeRendering();
})();
