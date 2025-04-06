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

// 细菌相关变量 - 调整参数以降低难度
var bacteria = []; // 存储所有细菌的数组
var maxBacteriaCount = 10; // 最大细菌数量
var bacteriaGrowthSpeed = 0.0008; // 细菌生长速度 (弧度/帧)
var bacteriaMaxSize = Math.PI/6; // 细菌最大尺寸 (30度弧对应的弧度)
var bacteriaGenProbability = 0.005; // 每帧生成新细菌的概率
var totalBacteriaGenerated = 0; // 已生成的细菌总数

// 点击检测相关变量
var pendingClick = null;

// 游戏得分相关变量
var playerScore = 0; // 玩家得分
var gameScore = 0; // 游戏得分
var scoreElement; // 显示得分的HTML元素
var bacteriaSpawnTimes = {}; // 记录每个细菌的生成时间
var thresholdReachedCount = 0; // 达到阈值的细菌数量
var gameOver = false; // 游戏是否结束
var gameResult = ""; // 游戏结果信息

// 得分系数调整 - 平衡玩家和游戏得分
var PLAYER_SCORE_MULTIPLIER = 4.0; // 玩家得分系数增加
var GAME_SCORE_MULTIPLIER = 0.2;   // 游戏得分系数降低

// 在全局变量区域添加
var destroyedBacteriaCount = 0; // 已消灭的细菌数量


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
  gl = canvas.getContext('webgl', {preserveDrawingBuffer: true}) || 
      canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});
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
  
  // 创建初始细菌
  createNewBacterium();
  
  // 创建用于显示得分的HTML元素
  createScoreDisplay();
  
  // Start drawing
  tick();
  console.log("Animation started");
}

// 创建得分显示
function createScoreDisplay() {
  // 检查是否已存在得分显示元素
  scoreElement = document.getElementById('score-display');
  if (!scoreElement) {
    // 创建得分显示容器
    scoreElement = document.createElement('div');
    scoreElement.id = 'score-display';
    scoreElement.style.position = 'absolute';
    scoreElement.style.top = '10px';
    scoreElement.style.left = '10px';
    scoreElement.style.padding = '10px';
    scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    scoreElement.style.color = 'white';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.fontSize = '16px';
    scoreElement.style.borderRadius = '5px';
    scoreElement.style.zIndex = '1000';
    updateScoreDisplay();
    
    // 将得分显示添加到canvas的父元素
    canvas.parentNode.appendChild(scoreElement);
  }
}

// 修改更新得分显示函数
function updateScoreDisplay() {
  if (scoreElement) {
    if (!gameOver) {
      // 游戏进行中显示两方分数
      scoreElement.innerHTML = 'Player Score: ' + Math.floor(playerScore) + 
                              '<br>Game Score: ' + Math.floor(gameScore) +
                              '<br>Bacteria Destroyed: ' + destroyedBacteriaCount + '/' + maxBacteriaCount +
                              '<br>Threshold Bacteria: ' + thresholdReachedCount + '/2';
    } else {
      // 游戏结束时显示胜利消息
      scoreElement.innerHTML = 'Game Over!<br>' + gameResult + 
                              '<br>Player Score: ' + Math.floor(playerScore) + 
                              '<br>Game Score: ' + Math.floor(gameScore) + 
                              '<br>Bacteria Destroyed: ' + destroyedBacteriaCount + '/' + maxBacteriaCount +
                              '<br>Click to restart';
                              
      // 根据胜利方设置不同的背景颜色
      if (gameResult.includes("Player Win")) {
        scoreElement.style.backgroundColor = 'rgba(0, 180, 0, 0.8)'; // 绿色 - 玩家胜利
      } else {
        scoreElement.style.backgroundColor = 'rgba(180, 0, 0, 0.8)'; // 红色 - 游戏胜利
      }
    }
  }
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
    // 如果拖动时间很短，可以认为是点击
    if (dragging && Math.abs(ev.clientX - lastX) < 5 && Math.abs(ev.clientY - lastY) < 5) {
      var x = ev.clientX, y = ev.clientY;
      var rect = ev.target.getBoundingClientRect();
      
      // 转换为canvas坐标
      var canvasX = x - rect.left;
      var canvasY = y - rect.top;
      
      // 设置待处理的点击
      checkAndKillBacteria(canvasX, canvasY);
    }
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
  
  // 添加单击事件处理
  canvas.onclick = function(ev) {
    // 如果游戏已经结束，则点击重新开始游戏
    if (gameOver) {
      resetGame();
      return;
    }
    
    var x = ev.clientX, y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    
    // 转换为canvas坐标
    var canvasX = x - rect.left;
    var canvasY = y - rect.top;
    
    // 设置待处理的点击
    checkAndKillBacteria(canvasX, canvasY);
  };
}

// 修改重置游戏函数
function resetGame() {
  // 重置游戏状态
  playerScore = 0;
  gameScore = 0;
  bacteria = [];
  totalBacteriaGenerated = 0;
  thresholdReachedCount = 0;
  destroyedBacteriaCount = 0; // 重置已消灭细菌计数
  bacteriaSpawnTimes = {};
  gameOver = false;
  gameResult = "";
  
  // 重置UI
  if (scoreElement) {
    scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  }
  
  // 创建初始细菌
  createNewBacterium();
  
  // 更新得分显示
  updateScoreDisplay();
}

// 检测点击并设置待处理的点击
function checkAndKillBacteria(x, y) {
  if (gameOver) return;
  
  console.log("点击位置:", x, y);
  
  // 注意：WebGL中y坐标是从底部向上的，而canvas是从顶部向下的
  var flippedY = canvas.height - y;
  
  // 设置待处理的点击
  pendingClick = {x: x, y: flippedY};
}

// 检查是否所有细菌都被消灭
function areAllBacteriaDestroyed() {
  for (var i = 0; i < bacteria.length; i++) {
    if (bacteria[i].active) {
      return false;
    }
  }
  return true;
}

// 检查是否至少有两个细菌达到阈值
function checkThresholdReached() {
  if (thresholdReachedCount >= 2) {
    endGame(false);
  }
}

// 修改处理细菌点击函数
function processBacteriaClick(pixels) {
  if (gameOver) return;
  
  // 检查点击的颜色是否匹配任何细菌的颜色
  for (var i = 0; i < bacteria.length; i++) {
    if (bacteria[i].active) {
      // 将细菌颜色从[0,1]转换为[0,255]
      var bacteriaColor = [
        Math.round(bacteria[i].color[0] * 255),
        Math.round(bacteria[i].color[1] * 255),
        Math.round(bacteria[i].color[2] * 255)
      ];
      
      // 允许一定的颜色偏差（因为渲染和读取过程可能有误差）
      var colorTolerance = 30;
      if (Math.abs(bacteriaColor[0] - pixels[0]) < colorTolerance &&
          Math.abs(bacteriaColor[1] - pixels[1]) < colorTolerance &&
          Math.abs(bacteriaColor[2] - pixels[2]) < colorTolerance) {
        // 找到匹配的细菌，将其标记为不活跃
        console.log("消灭细菌:", i, bacteriaColor);
        
        // 计算玩家得分 - 基于细菌大小，应用玩家得分系数
        var sizePercentage = bacteria[i].size / bacteriaMaxSize;
        var basePoints = 10 + 30 * sizePercentage; // 最少10分，最多40分
        var pointsEarned = Math.round(basePoints * PLAYER_SCORE_MULTIPLIER);
        playerScore += pointsEarned;
        console.log("细菌大小: " + Math.round(sizePercentage * 100) + "%, 得分: " + pointsEarned);
        
        bacteria[i].active = false;
        destroyedBacteriaCount++; // 增加已消灭细菌计数
        
        console.log("已消灭细菌数量:", destroyedBacteriaCount, "/", maxBacteriaCount);
        
        // 检查玩家是否消灭了整整10个细菌
        if (destroyedBacteriaCount >= maxBacteriaCount) {
          // 玩家胜利 - 消灭了所有10个细菌
          endGame(true);
        }
        
        return;
      }
    }
  }
  
  console.log("未点击到任何细菌");
}

// 结束游戏
function endGame(playerWins) {
  gameOver = true;
  
  if (playerWins) {
    gameResult = "Player Win! All bacteria destroyed.";
    // 额外奖励分数
    playerScore += 100;
  } else {
    gameResult = "Game Win! " + thresholdReachedCount + " bacteria reached threshold.";
    // 游戏胜利时给游戏加分
    gameScore += 50;
  }
  
  console.log(gameResult);
  updateScoreDisplay();
}

// 细菌对象构造函数
function Bacterium(position, color) {
  this.position = position; // 在球面上的位置 (球坐标系)
  this.color = color; // 颜色 RGB 数组
  this.size = 0.05; // 初始大小 (弧度)
  this.active = true; // 是否活跃
  this.reachedThreshold = false; // 是否达到阈值
}

// 生成随机颜色
function getRandomColor() {
  // 避免太暗或者太亮的颜色
  var r = 0.3 + Math.random() * 0.7;
  var g = 0.3 + Math.random() * 0.7;
  var b = 0.3 + Math.random() * 0.7;
  return [r, g, b];
}

// 在球面上生成随机位置
function getRandomSpherePosition() {
  // 生成随机球面坐标
  var theta = Math.random() * Math.PI; // 纬度 (0-π)
  var phi = Math.random() * 2 * Math.PI; // 经度 (0-2π)
  return { theta: theta, phi: phi };
}

// 创建新细菌
function createNewBacterium() {
  // 检查总共生成的细菌数量是否已达到最大值
  if (totalBacteriaGenerated < maxBacteriaCount) {
    var position = getRandomSpherePosition();
    var color = getRandomColor();
    var newBacterium = new Bacterium(position, color);
    
    // 记录生成时间
    var bacteriaIndex = bacteria.length;
    bacteriaSpawnTimes[bacteriaIndex] = Date.now();
    
    bacteria.push(newBacterium);
    totalBacteriaGenerated++; // 增加已生成细菌的计数
    console.log("创建新细菌，位置:", position, "颜色:", color, "已生成总数:", totalBacteriaGenerated);
  }
}

// 更新细菌状态
function updateBacteria() {
  if (gameOver) return;
  
  for (var i = 0; i < bacteria.length; i++) {
    if (bacteria[i].active) {
      // 增加细菌大小
      var oldSize = bacteria[i].size;
      bacteria[i].size += bacteriaGrowthSpeed;
      
      // 检查是否达到最大尺寸
      if (bacteria[i].size >= bacteriaMaxSize) {
        bacteria[i].size = bacteriaMaxSize;
        
        // 如果细菌第一次达到阈值
        if (!bacteria[i].reachedThreshold) {
          bacteria[i].reachedThreshold = true;
          thresholdReachedCount++;
          
          // 细菌达到阈值时增加游戏得分
          gameScore += 20 * GAME_SCORE_MULTIPLIER;
          console.log("细菌", i, "达到阈值，游戏得分+", (20 * GAME_SCORE_MULTIPLIER));
          console.log("当前达到阈值的细菌数量:", thresholdReachedCount);
          
          // 检查是否有两个以上的细菌达到阈值
          checkThresholdReached();
        }
      }
      
      // 根据细菌生长给游戏增加得分，应用游戏得分系数
      gameScore += (bacteria[i].size - oldSize) * 100 * GAME_SCORE_MULTIPLIER;
    }
  }
}

// 将球面坐标转换为笛卡尔坐标
function sphereToCartesian(theta, phi, radius) {
  var x = radius * Math.sin(theta) * Math.cos(phi);
  var y = radius * Math.cos(theta);
  var z = radius * Math.sin(theta) * Math.sin(phi);
  return [x, y, z];
}

// 绘制细菌 - 改进版
function drawBacteria() {
  // 临时禁用深度测试，确保后出现的细菌覆盖先出现的
  gl.disable(gl.DEPTH_TEST);
  
  // 按照出现顺序绘制细菌（数组中后面的会覆盖前面的）
  for (var i = 0; i < bacteria.length; i++) {
    if (bacteria[i].active) {
      var bacteriaVertices = [];
      var bacteriaColors = [];
      var bacteriaIndices = [];
      
      var center = bacteria[i].position;
      var color = bacteria[i].color;
      var size = bacteria[i].size;
      
      // 为达到阈值的细菌增加视觉提示
      var displayColor = color.slice();
      if (bacteria[i].reachedThreshold) {
        // 使颜色更明亮，添加闪烁效果
        var pulseAmount = 0.2 * Math.sin(Date.now() / 200);
        displayColor[0] = Math.min(1.0, color[0] + pulseAmount);
        displayColor[1] = Math.min(1.0, color[1] + pulseAmount);
        displayColor[2] = Math.min(1.0, color[2] + pulseAmount);
      }
      
      // 中心点坐标
      var centerTheta = center.theta;
      var centerPhi = center.phi;
      var centerCartesian = sphereToCartesian(centerTheta, centerPhi, SPHERE_RADIUS + 0.01);
      
      // 创建一个表示细菌的圆形区域
      // 使用改进的方法计算球面上的圆
      
      // 计算正交基 - 使用切平面上的正交向量
      // 首先根据球面坐标计算法向量 (也是中心点的单位向量)
      var normal = [
        Math.sin(centerTheta) * Math.cos(centerPhi),
        Math.cos(centerTheta),
        Math.sin(centerTheta) * Math.sin(centerPhi)
      ];
      
      // 计算第一个正交向量 (沿着经度方向的切线)
      var tangent1 = [
        Math.cos(centerTheta) * Math.cos(centerPhi),
        -Math.sin(centerTheta),
        Math.cos(centerTheta) * Math.sin(centerPhi)
      ];
      
      // 计算第二个正交向量 (沿着纬度方向的切线)
      var tangent2 = [
        -Math.sin(centerPhi),
        0,
        Math.cos(centerPhi)
      ];
      
      // 中心点
      bacteriaVertices.push(centerCartesian[0], centerCartesian[1], centerCartesian[2]);
      bacteriaColors.push(displayColor[0], displayColor[1], displayColor[2]);
      
      // 边缘点
      var segments = 48; // 增加分段数以获得更平滑的圆形
      for (var j = 0; j <= segments; j++) {
        var angle = j * (2 * Math.PI / segments);
        var cosAngle = Math.cos(angle);
        var sinAngle = Math.sin(angle);
      

        // 计算切平面上的点
        var pointX = centerCartesian[0] + size * (tangent1[0] * cosAngle + tangent2[0] * sinAngle);
        var pointY = centerCartesian[1] + size * (tangent1[1] * cosAngle + tangent2[1] * sinAngle);
        var pointZ = centerCartesian[2] + size * (tangent1[2] * cosAngle + tangent2[2] * sinAngle);
        
        // 将点投影回球面 (归一化)
        var length = Math.sqrt(pointX*pointX + pointY*pointY + pointZ*pointZ);
        pointX = (SPHERE_RADIUS + 0.01) * pointX / length;
        pointY = (SPHERE_RADIUS + 0.01) * pointY / length;
        pointZ = (SPHERE_RADIUS + 0.01) * pointZ / length;
        
        bacteriaVertices.push(pointX, pointY, pointZ);
        bacteriaColors.push(displayColor[0], displayColor[1], displayColor[2]);
        
        // 添加索引来形成三角形
        if (j < segments) {
          bacteriaIndices.push(
            0, // 中心点
            j + 1, // 当前边缘点
            j + 2  // 下一个边缘点
          );
        } else {
          // 最后一个三角形连接回第一个点
          bacteriaIndices.push(
            0, // 中心点
            segments + 1, // 最后一个边缘点
            1  // 第一个边缘点
          );
        }
      }
      
      // 创建和绑定顶点缓冲区
      var bacteriaVertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bacteriaVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bacteriaVertices), gl.STATIC_DRAW);
      
      var a_Position = gl.getAttribLocation(gl.program, 'position');
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
      
      // 创建和绑定颜色缓冲区
      var bacteriaColorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bacteriaColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bacteriaColors), gl.STATIC_DRAW);
      
      var a_Color = gl.getAttribLocation(gl.program, 'color');
      gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Color);
      
      // 创建和绑定索引缓冲区
      var bacteriaIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bacteriaIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bacteriaIndices), gl.STATIC_DRAW);
      
      // 绘制细菌
      gl.drawElements(gl.TRIANGLES, bacteriaIndices.length, gl.UNSIGNED_SHORT, 0);
      
      // 释放缓冲区
      gl.deleteBuffer(bacteriaVertexBuffer);
      gl.deleteBuffer(bacteriaColorBuffer);
      gl.deleteBuffer(bacteriaIndexBuffer);
    }
  }
  
  // 重新启用深度测试
  gl.enable(gl.DEPTH_TEST);
}

// Animation function called for each frame
function tick() {
  // 随机生成新细菌 (低概率)，并且检查总共生成的数量是否达到上限
  if (!gameOver && Math.random() < bacteriaGenProbability && totalBacteriaGenerated < maxBacteriaCount) {
    createNewBacterium();
  }
  
  // 更新细菌状态
  updateBacteria();
  
  // 移除不活跃的细菌
  bacteria = bacteria.filter(function(bacterium) {
    return bacterium.active;
  });
  
  // 更新得分显示
  updateScoreDisplay();
  
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
  
  // 首先绘制球体
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var a_Position = gl.getAttribLocation(gl.program, 'position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  var a_Color = gl.getAttribLocation(gl.program, 'color');
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  
  // 然后绘制细菌
  drawBacteria();
  
  // 如果有待处理的点击，现在处理它
  if (pendingClick) {
    // 创建缓冲区来存储像素数据
    var pixels = new Uint8Array(4);
    
    // 读取点击位置的像素颜色
    gl.readPixels(pendingClick.x, pendingClick.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    console.log("读取的颜色:", pixels);
    
    // 处理点击
    processBacteriaClick(pixels);
    
    // 清除待处理的点击
    pendingClick = null;
  }
}

// Call main function when the page is loaded
window.onload = main;