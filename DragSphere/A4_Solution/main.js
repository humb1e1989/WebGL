// Vertex shader program
var VSHADER_SOURCE = 
  'attribute vec3 position;\n' +
  'uniform mat4 Pmatrix;\n' + // Projection matrix
  'uniform mat4 Vmatrix;\n' + // View matrix
  'uniform mat4 Mmatrix;\n' + // Model matrix
  'attribute vec3 color;\n' + // Color of vertex
  'varying vec3 vColor;\n' +
  'void main() {\n' +
  '  gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);\n' +
  '  vColor = color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec3 vColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = vec4(vColor, 1.0);\n' +
  '}\n';

// Global variables
var canvas;
var gl;
var _Pmatrix;
var _Vmatrix;
var _Mmatrix;
var vertexBuffer;
var colorBuffer;
var indexBuffer;
var indices = [];
var vertices = [];
var colors = [];

// Animation and interaction variables
var SPHERE_DIV = 36; // Increased divisions for smoother sphere
var SPHERE_RADIUS = 2.0; // Radius of the sphere
var dragging = false;
var lastX = -1;
var lastY = -1;
var currentAngle = [0.0, 0.0]; // [x-axis, y-axis] in degrees

// 网格密度控制
var GRID_DENSITY = 2; // 值越小，网格越密集(1=最密，3=原始密度)

// Debug helper function
function logError(message) {
  console.error(message);
  // Uncomment for visible error messages
  // alert(message);
}

// Main function
function main() {
  console.log("Starting main function");
  
  // Retrieve the canvas element
  canvas = document.getElementById('webgl');
  if (!canvas) {
    logError('Failed to retrieve the canvas element');
    return;
  }
  console.log("Canvas element found");
  
  // Get the rendering context with explicit fallbacks
  gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    logError('Failed to get WebGL context. Your browser may not support WebGL.');
    return;
  }
  console.log("WebGL context created");

  // Initialize shaders with error checking
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    logError('Failed to initialize shaders.');
    return;
  }
  console.log("Shaders initialized");
  
  // Check shader program link status
  var shaderProgram = gl.program;
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    var info = gl.getProgramInfoLog(shaderProgram);
    logError('Could not link WebGL program.\n' + info);
    return;
  }
  console.log("Shader program linked successfully");

  // Set up the sphere
  if (!initSphere()) {
    logError('Failed to initialize the sphere.');
    return;
  }
  console.log("Sphere initialized");

  // Set the clear color and enable depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  // Enable culling of back-facing triangles
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  
  // Register mouse event handlers
  initEventHandlers();
  console.log("Event handlers initialized");
  
  // Start drawing
  tick();
  console.log("Animation started");
}

// Initialize the sphere
function initSphere() {
  // Generate the coordinates for a sphere
  generateSphere();
  console.log("Sphere geometry generated with " + vertices.length/3 + " vertices");
  
  // Create buffers and bind data
  if (!createBuffers()) {
    return false;
  }
  console.log("Buffers created and data bound");
  
  // Get the storage locations of uniform variables
  _Pmatrix = gl.getUniformLocation(gl.program, 'Pmatrix');
  _Vmatrix = gl.getUniformLocation(gl.program, 'Vmatrix');
  _Mmatrix = gl.getUniformLocation(gl.program, 'Mmatrix');
  
  if (!_Pmatrix || !_Vmatrix || !_Mmatrix) {
    logError('Failed to get the storage location of uniform variables');
    return false;
  }
  
  return true;
}

// Generate the coordinates for a sphere with grid points
function generateSphere() {
  // Clear existing vertex data
  vertices = [];
  colors = [];
  indices = [];
  
  // Add the north pole
  vertices.push(0.0, SPHERE_RADIUS, 0.0);
  colors.push(0.8, 0.8, 0.8); // Light gray for the main sphere surface
  
  // Generate vertices along latitudes and longitudes
  for (var latNumber = 1; latNumber < SPHERE_DIV; latNumber++) {
    var theta = latNumber * Math.PI / SPHERE_DIV;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);
    
    for (var longNumber = 0; longNumber <= SPHERE_DIV; longNumber++) {
      var phi = longNumber * 2 * Math.PI / SPHERE_DIV;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);
      
      // Calculate x, y, z coordinates
      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;
      
      // Add vertex coordinates
      vertices.push(SPHERE_RADIUS * x, SPHERE_RADIUS * y, SPHERE_RADIUS * z);
      
      // 更密集的网格点 - 修改了条件使网格点更密集
      if ((latNumber % GRID_DENSITY === 0 && longNumber % GRID_DENSITY === 0) || 
          (latNumber === SPHERE_DIV/2 && longNumber % 4 === 0) || 
          (longNumber === SPHERE_DIV/2 && latNumber % 4 === 0) ||
          // 添加额外的网格线
          (latNumber % (GRID_DENSITY * 3) === 0) || 
          (longNumber % (GRID_DENSITY * 3) === 0)) {
        colors.push(0.3, 0.3, 0.3); // Dark gray for grid points
      } else {
        colors.push(0.8, 0.8, 0.8); // Light gray for the main sphere surface
      }
    }
  }
  
  // Add the south pole
  vertices.push(0.0, -SPHERE_RADIUS, 0.0);
  colors.push(0.8, 0.8, 0.8);
  
  // Generate indices for triangles
  // North pole triangles
  for (var i = 0; i < SPHERE_DIV; i++) {
    indices.push(0, i + 1, i + 2);
  }
  
  // Body triangles
  var verticesPerRow = SPHERE_DIV + 1;
  for (var lat = 0; lat < SPHERE_DIV - 2; lat++) {
    for (var lon = 0; lon < SPHERE_DIV; lon++) {
      var first = (lat * verticesPerRow) + lon + 1;
      var second = first + verticesPerRow;
      
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  
  // 修改的南极点三角形生成 - 调整索引顺序和循环终止条件
  var southPoleIndex = vertices.length / 3 - 1;
  var lastRow = southPoleIndex - verticesPerRow;
  
  // 确保正确闭合最后一圈
  for (var i = 0; i < SPHERE_DIV; i++) {
    var currentIndex = lastRow + i;
    var nextIndex = (i == SPHERE_DIV - 1) ? lastRow : (lastRow + i + 1);
    
    // 调整索引顺序，确保三角形正确朝向
    indices.push(southPoleIndex, nextIndex, currentIndex);
  }
}

// Create buffers and bind data
function createBuffers() {
  // Create a buffer for vertices
  vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    logError('Failed to create the vertex buffer object');
    return false;
  }
  
  // Bind the vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
  // Get the storage location of position
  var a_Position = gl.getAttribLocation(gl.program, 'position');
  if (a_Position < 0) {
    logError('Failed to get the storage location of position');
    return false;
  }
  
  // Assign the buffer object to position and enable it
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  
  // Create a buffer for colors
  colorBuffer = gl.createBuffer();
  if (!colorBuffer) {
    logError('Failed to create the color buffer object');
    return false;
  }
  
  // Bind the color buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  
  // Get the storage location of color
  var a_Color = gl.getAttribLocation(gl.program, 'color');
  if (a_Color < 0) {
    logError('Failed to get the storage location of color');
    return false;
  }
  
  // Assign the buffer object to color and enable it
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);
  
  // Create a buffer for indices
  indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    logError('Failed to create the index buffer object');
    return false;
  }
  
  // Bind the index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  
  return true;
}

// Register mouse event handlers
function initEventHandlers() {
  dragging = false;      // Dragging or not
  lastX = -1, lastY = -1; // Last position of the mouse
  
  canvas.onmousedown = function(ev) {
    var x = ev.clientX, y = ev.clientY;
    // Start dragging if a mouse is in the canvas
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      lastX = x;
      lastY = y;
      dragging = true;
    }
  };
  
  canvas.onmouseup = function(ev) {
    dragging = false;
  };
  
  canvas.onmousemove = function(ev) {
    var x = ev.clientX, y = ev.clientY;
    if (dragging) {
      var factor = 100/canvas.height; // The rotation ratio
      var dx = factor * (x - lastX);
      var dy = factor * (y - lastY);
      
      // 修正旋转方向，使其更直观
      // 使用负dy，让鼠标上移时球体向上转动
      currentAngle[0] = Math.max(Math.min(currentAngle[0] - dy, 90.0), -90.0);
      // 使用负dx，让鼠标左移时球体向左转动
      currentAngle[1] = currentAngle[1] - dx; // 注意这里改为负号
    }
    lastX = x;
    lastY = y;
  };
  
  // Handle mouse leave event
  canvas.onmouseleave = function(ev) {
    dragging = false;
  };
}

// Animation function called for each frame
function tick() {
  // Request next animation frame
  requestAnimationFrame(tick);
  
  // Draw the sphere
  draw();
}

// Draw the sphere
function draw() {
  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Create the projection matrix
  var projMatrix = new Matrix4();
  projMatrix.setPerspective(45, canvas.width/canvas.height, 1, 100);
  
  // Create the view matrix - moved further back for better visibility
  var viewMatrix = new Matrix4();
  viewMatrix.setLookAt(0, 0, 10, 0, 0, 0, 0, 1, 0);
  
  // Create the model matrix
  var modelMatrix = new Matrix4();
  modelMatrix.rotate(currentAngle[0], 1, 0, 0);  // Rotate around x-axis
  modelMatrix.rotate(currentAngle[1], 0, 1, 0);  // Rotate around y-axis
  
  // Pass the matrices to the vertex shader
  gl.uniformMatrix4fv(_Pmatrix, false, projMatrix.elements);
  gl.uniformMatrix4fv(_Vmatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(_Mmatrix, false, modelMatrix.elements);
  
  // Draw the sphere
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

// Call main function when the page is loaded
window.onload = main;