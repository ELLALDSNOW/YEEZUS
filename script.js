const recordButton = document.querySelector('.record-button');
const speedButtons = document.querySelectorAll('.control-button[data-speed]');
const statusLabel = document.querySelector('.status');
const tuneButton = document.querySelector('.tune-button');
const tuningPanel = document.querySelector('.tuning-panel');
const supernovaButton = document.querySelector('.supernova-button');
const intensitySlider = document.querySelector('#intensity');
const intensityValue = document.querySelector('#intensity-value');
const canvas = document.querySelector('.energy-canvas');
const turntable = document.querySelector('.turntable-wrap');
let normalSpinDuration = 4.7 / 1.35;

function setSpinSpeed(duration, remember = true) {
  document.querySelector('.record').style.animationDuration = `${duration}s`;
  if (remember && !document.body.classList.contains('supernova-active')) normalSpinDuration = duration;
}

recordButton.addEventListener('click', () => {
  const isPlaying = recordButton.classList.toggle('is-playing');
  recordButton.setAttribute('aria-pressed', String(isPlaying));
  recordButton.setAttribute('aria-label', isPlaying ? 'Pause record' : 'Play record');
  statusLabel.innerHTML = `<span class="status-dot"></span>${isPlaying ? 'Now spinning' : 'Paused'}`;
});

speedButtons.forEach((button) => {
  button.addEventListener('click', () => {
    speedButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    setSpinSpeed(4.7 / Number(button.dataset.speed));
  });
});

tuneButton.addEventListener('click', () => {
  const isOpen = tuningPanel.classList.toggle('is-open');
  tuneButton.setAttribute('aria-expanded', String(isOpen));
  tuningPanel.setAttribute('aria-hidden', String(!isOpen));
});

intensitySlider.addEventListener('input', () => {
  intensityValue.value = `${intensitySlider.value}%`;
  const sliderSpeed = Math.max(0.12, 5.4 - Number(intensitySlider.value) * 0.0528);
  setSpinSpeed(sliderSpeed);
});

supernovaButton.addEventListener('click', () => {
  const isActive = document.body.classList.toggle('supernova-active');
  if (isActive) {
    recordButton.classList.add('is-playing');
    recordButton.setAttribute('aria-pressed', 'true');
    recordButton.setAttribute('aria-label', 'Pause record');
    setSpinSpeed(0.035, false);
  } else {
    setSpinSpeed(normalSpinDuration, false);
  }
  supernovaButton.setAttribute('aria-pressed', String(isActive));
  supernovaButton.querySelector('.supernova-state').textContent = isActive ? 'On' : 'Off';
  statusLabel.innerHTML = `<span class="status-dot"></span>${isActive ? 'Supernova online' : 'Now spinning'}`;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && tuningPanel.classList.contains('is-open')) tuneButton.click();
});

const vertexShaderSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 resolution;
  uniform float time;
  uniform float intensity;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x), mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x), local.y);
  }
  float fbm(vec2 point) {
    return noise(point) * 0.5 + noise(point * 2.0) * 0.25 + noise(point * 4.0) * 0.125;
  }
  void main() {
    vec2 point = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float clock = time * 0.42;
    float smoke = fbm(point * 3.0 + vec2(clock, -clock * 0.6));
    float tendrils = pow(max(0.0, sin(angle * 15.0 - time * 1.8 + smoke * 6.0) * 0.5 + 0.5), 14.0);
    float sparks = pow(max(0.0, sin(angle * 31.0 + time * 2.4 + smoke * 4.0) * 0.5 + 0.5), 32.0);
    float halo = smoothstep(0.6, 0.23, radius) * smoothstep(0.08, 0.35, radius);
    float outerSmoke = smoothstep(1.08, 0.27, radius) * smoke;
    float alpha = (outerSmoke * 0.3 + tendrils * halo * 0.8 + sparks * halo) * intensity;
    vec3 violet = vec3(0.42, 0.2, 1.0);
    vec3 pink = vec3(1.0, 0.04, 0.38);
    vec3 acid = vec3(0.85, 1.0, 0.04);
    vec3 green = vec3(0.12, 1.0, 0.22);
    float pinkPulse = smoothstep(0.25, 0.82, sparks + tendrils * 0.55);
    float greenPulse = smoothstep(0.2, 0.8, smoke + tendrils * 0.45);
    vec3 color = mix(violet, pink, pinkPulse);
    color = mix(color, green, greenPulse * 0.58);
    color = mix(color, acid, smoothstep(0.7, 1.0, tendrils + sparks) * 0.4);
    gl_FragColor = vec4(color, alpha * 0.78);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function startEnergyField() {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const timeLocation = gl.getUniformLocation(program, 'time');
  const resolutionLocation = gl.getUniformLocation(program, 'resolution');
  const intensityLocation = gl.getUniformLocation(program, 'intensity');
  const startedAt = performance.now();

  function resize() {
    const size = Math.max(window.innerWidth, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  function render(now) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const energySpeed = document.body.classList.contains('supernova-active') ? 3.5 : 1;
    gl.uniform1f(timeLocation, ((now - startedAt) / 1000) * energySpeed);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(intensityLocation, Number(intensitySlider.value) / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

startEnergyField();
