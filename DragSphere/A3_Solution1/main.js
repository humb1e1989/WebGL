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


// add the following variables to the top of the file for Assignment 4
// 细菌相关的全局变量
var bacteria = []; // 存储所有细菌对象
var MAX_BACTERIA = 10; // 最大细菌数量
var GROWTH_SPEED = 0.5; // 细菌生长速度，可调整
var BACTERIA_COLORS = [ // 不同细菌的颜色
    [1.0, 0.0, 0.0],    // 红色
    [0.0, 1.0, 0.0],    // 绿色
    [0.0, 0.0, 1.0],    // 蓝色
    [1.0, 1.0, 0.0],    // 黄色
    [1.0, 0.0, 1.0],    // 紫色
    [0.0, 1.0, 1.0],    // 青色
    [1.0, 0.5, 0.0],    // 橙色
    [0.5, 0.0, 1.0],    // 紫蓝色
    [0.0, 0.8, 0.5],    // 浅绿色
    [0.8, 0.5, 0.2]     // 棕色
];
var THRESHOLD_ANGLE = 30.0; // 细菌达到的阈值角度（度）
var lastTime = 0; // 用于计算帧时间增量



// Animation and interaction variables
var SPHERE_DIV = 36; // Increased divisions for smoother sphere
var SPHERE_RADIUS = 2.0; // Radius of the sphere
var dragging = false;
var lastX = -1;
var lastY = -1;
var currentAngle = [0.0, 0.0]; // [x-axis, y-axis] in degrees

// Debug helper function
function logError(message) {
  console.error(message);
  // Uncomment the following line if you want alert boxes for errors
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

  // Initialize the sphere with bacteria
  // 初始化细菌系统
  initBacteriaSystem();
  console.log("Bacteria system initialized");
  
  // 设置初始时间
  lastTime = Date.now();
  



  // Start drawing
  tick();
  console.log("Animation started");
}


// add the following functions to the end of the file for Assignment 4
// 细菌对象构造函数
function Bacterium(id) {
  this.id = id;
  // 随机生成两个角度来确定细菌在球体表面的起始位置
  this.theta = Math.random() * Math.PI; // 纬度角 (0 到 π)
  this.phi = Math.random() * 2 * Math.PI; // 经度角 (0 到 2π)
  this.radius = 0.1; // 初始半径大小（弧度）
  this.color = BACTERIA_COLORS[id % BACTERIA_COLORS.length]; // 细菌颜色
  this.alive = true; // 细菌是否存活
  this.vertices = []; // 存储细菌顶点
  this.indices = []; // 存储细菌索引
  this.colors = []; // 存储细菌颜色
  this.reachedThreshold = false; // 是否达到阈值
  
  // 初始化细菌的形状
  this.initShape();
}

// // 初始化细菌的形状
// Bacterium.prototype.initShape = function() {
//   this.vertices = [];
//   this.colors = [];
//   this.indices = [];
  
//   // 细菌的中心点
//   var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
//   var centerY = SPHERE_RADIUS * Math.cos(this.theta);
//   var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
//   // 创建细菌的形状（简化为一个小圆）
//   var divisions = 18; // 细菌边缘的分段数
  
//   // 添加中心点
//   this.vertices.push(centerX, centerY, centerZ);
//   this.colors.push(this.color[0], this.color[1], this.color[2]);
  
//   // 添加边缘点
//   for (var i = 0; i <= divisions; i++) {
//       var angle = i * (2 * Math.PI / divisions);
//       var rad = this.radius;
      
//       // 创建一个本地坐标系（以中心点为原点）
//       var localX = rad * Math.cos(angle);
//       var localZ = rad * Math.sin(angle);
      
//       // 变换到球面上
//       // 需要计算切线和副法线来创建局部坐标系
//       var tangentX = -Math.sin(this.phi);
//       var tangentY = 0;
//       var tangentZ = Math.cos(this.phi);
      
//       var bitangentX = -Math.cos(this.theta) * Math.cos(this.phi);
//       var bitangentY = Math.sin(this.theta);
//       var bitangentZ = -Math.cos(this.theta) * Math.sin(this.phi);
      
//       // 计算边缘点在球面上的位置
//       var x = centerX + localX * tangentX + localZ * bitangentX;
//       var y = centerY + localX * tangentY + localZ * bitangentY;
//       var z = centerZ + localX * tangentZ + localZ * bitangentZ;
      
//       // 归一化到球面
//       var len = Math.sqrt(x*x + y*y + z*z);
//       x = (SPHERE_RADIUS * 1.01) * x / len; // 稍微凸出于球面
//       y = (SPHERE_RADIUS * 1.01) * y / len;
//       z = (SPHERE_RADIUS * 1.01) * z / len;
      
//       this.vertices.push(x, y, z);
//       this.colors.push(this.color[0], this.color[1], this.color[2]);
      
//       // 添加三角形索引
//       if (i < divisions) {
//           this.indices.push(0, i+1, i+2);
//       }
//   }
// };

// // 沿着球面生成细菌的形状的版本
// // 初始化细菌的形状
// Bacterium.prototype.initShape = function() {
//   this.vertices = [];
//   this.colors = [];
//   this.indices = [];
  
//   // 计算细菌中心点在球面上的位置
//   var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
//   var centerY = SPHERE_RADIUS * Math.cos(this.theta);
//   var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
//   // 添加中心点
//   this.vertices.push(centerX, centerY, centerZ);
//   this.colors.push(this.color[0], this.color[1], this.color[2]);
  
//   // 创建细菌的形状（一个球面上的圆形区域）
//   var divisions = 18; // 细菌边缘的分段数
  
//   // 中心点的单位向量
//   var centerVec = [
//       Math.sin(this.theta) * Math.cos(this.phi),
//       Math.cos(this.theta),
//       Math.sin(this.theta) * Math.sin(this.phi)
//   ];
  
//   // 添加边缘点 - 使用球面上的等距点
//   for (var i = 0; i <= divisions; i++) {
//       var angle = i * (2 * Math.PI / divisions);
      
//       // 创建一个与中心点正交的基底
//       // 第一个基向量（任意选择一个正交方向）
//       var u = [0, 1, 0]; // 试着选择Y轴
//       if (Math.abs(centerVec[1]) > 0.99) { // 如果中心接近Y轴，则选择X轴
//           u = [1, 0, 0];
//       }
      
//       // 计算第一个正交向量（u - (u·c)c，然后归一化）
//       var udotc = u[0]*centerVec[0] + u[1]*centerVec[1] + u[2]*centerVec[2];
//       var v1 = [
//           u[0] - udotc * centerVec[0],
//           u[1] - udotc * centerVec[1],
//           u[2] - udotc * centerVec[2]
//       ];
      
//       // 归一化v1
//       var v1len = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1] + v1[2]*v1[2]);
//       v1 = [v1[0]/v1len, v1[1]/v1len, v1[2]/v1len];
      
//       // 计算第二个正交向量（c×v1）
//       var v2 = [
//           centerVec[1]*v1[2] - centerVec[2]*v1[1],
//           centerVec[2]*v1[0] - centerVec[0]*v1[2],
//           centerVec[0]*v1[1] - centerVec[1]*v1[0]
//       ];
      
//       // 使用球面旋转计算边缘点
//       var cosRad = Math.cos(this.radius);
//       var sinRad = Math.sin(this.radius);
//       var cosA = Math.cos(angle);
//       var sinA = Math.sin(angle);
      
//       // 边缘点 = cosRad * centerVec + sinRad * (cosA * v1 + sinA * v2)
//       var px = cosRad * centerVec[0] + sinRad * (cosA * v1[0] + sinA * v2[0]);
//       var py = cosRad * centerVec[1] + sinRad * (cosA * v1[1] + sinA * v2[1]);
//       var pz = cosRad * centerVec[2] + sinRad * (cosA * v1[2] + sinA * v2[2]);
      
//       // 转换为球面上的坐标
//       var x = SPHERE_RADIUS * px;
//       var y = SPHERE_RADIUS * py;
//       var z = SPHERE_RADIUS * pz;
      
//       // 稍微提高细菌点，使其位于球体表面之上
//       x *= 1.01;
//       y *= 1.01;
//       z *= 1.01;
      
//       this.vertices.push(x, y, z);
//       this.colors.push(this.color[0], this.color[1], this.color[2]);
      
//       // 添加三角形索引
//       if (i < divisions) {
//           this.indices.push(0, i+1, i+2);
//       }
//   }
// };

// // 初始化细菌的形状
// Bacterium.prototype.initShape = function() {
//   this.vertices = [];
//   this.colors = [];
//   this.indices = [];
  
//   // 计算细菌中心点在球面上的位置
//   var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
//   var centerY = SPHERE_RADIUS * Math.cos(this.theta);
//   var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
//   // 添加中心点
//   this.vertices.push(centerX, centerY, centerZ);
//   this.colors.push(this.color[0], this.color[1], this.color[2]);
  
//   // 创建细菌的形状（一个球面上的圆形区域）
//   var divisions = 36; // 增加分段数，使形状更圆滑
  
//   // 先添加所有边缘点
//   for (var i = 0; i < divisions; i++) {
//       var angle = i * (2 * Math.PI / divisions);
      
//       // 使用简单的球面上的偏移
//       var latOffset = this.radius * Math.cos(angle);
//       var longOffset = this.radius * Math.sin(angle);
      
//       // 计算偏移后的球面坐标
//       var newTheta = this.theta + latOffset;
//       var newPhi = this.phi + longOffset;
      
//       // 确保角度在有效范围内
//       newTheta = Math.max(0.01, Math.min(Math.PI - 0.01, newTheta));
      
//       // 计算球面坐标
//       var x = SPHERE_RADIUS * Math.sin(newTheta) * Math.cos(newPhi);
//       var y = SPHERE_RADIUS * Math.cos(newTheta);
//       var z = SPHERE_RADIUS * Math.sin(newTheta) * Math.sin(newPhi);
      
//       // 稍微提高细菌点，使其位于球体表面之上
//       x *= 1.01;
//       y *= 1.01;
//       z *= 1.01;
      
//       this.vertices.push(x, y, z);
//       this.colors.push(this.color[0], this.color[1], this.color[2]);
//   }
  
//   // 正确创建圆形面片的索引
//   // 使用扇形三角形连接中心和边缘点
//   for (var i = 0; i < divisions; i++) {
//       var nextIndex = (i + 1) % divisions + 1; // +1 是因为第一个顶点是中心点
//       this.indices.push(0, i + 1, nextIndex);
//   }
// };

// // 初始化细菌的形状 - 最简单版本
// Bacterium.prototype.initShape = function() {
//   this.vertices = [];
//   this.colors = [];
//   this.indices = [];
  
//   // 创建一个简单的圆盘
//   var divisions = 36; // 圆盘的分段数
  
//   // 添加中心点
//   var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
//   var centerY = SPHERE_RADIUS * Math.cos(this.theta);
//   var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
//   this.vertices.push(centerX, centerY, centerZ);
//   this.colors.push(this.color[0], this.color[1], this.color[2]);
  
//   // 创建中心向量的单位向量
//   var centerNorm = Math.sqrt(centerX*centerX + centerY*centerY + centerZ*centerZ);
//   var centerUnitX = centerX / centerNorm;
//   var centerUnitY = centerY / centerNorm;
//   var centerUnitZ = centerZ / centerNorm;
  
//   // 添加围绕中心的点
//   for (var i = 0; i <= divisions; i++) {
//       var angle = i * (2 * Math.PI / divisions);
      
//       // 创建一个旋转框架
//       // 首先找一个与中心向量垂直的向量
//       var perpX, perpY, perpZ;
//       if (Math.abs(centerUnitY) < 0.99) {
//           // 使用Y轴叉积
//           perpX = centerUnitZ;
//           perpY = 0;
//           perpZ = -centerUnitX;
//       } else {
//           // 靠近Y轴时使用X轴叉积
//           perpX = 0;
//           perpY = -centerUnitZ;
//           perpZ = centerUnitY;
//       }
      
//       // 归一化垂直向量
//       var perpNorm = Math.sqrt(perpX*perpX + perpY*perpY + perpZ*perpZ);
//       perpX /= perpNorm;
//       perpY /= perpNorm;
//       perpZ /= perpNorm;
      
//       // 计算第二个垂直向量（叉积）
//       var perpX2 = centerUnitY * perpZ - centerUnitZ * perpY;
//       var perpY2 = centerUnitZ * perpX - centerUnitX * perpZ;
//       var perpZ2 = centerUnitX * perpY - centerUnitY * perpX;
      
//       // 计算边缘点 - 使用简单的角度
//       var radianRadius = this.radius; // 弧度
//       var cosRad = Math.cos(radianRadius);
//       var sinRad = Math.sin(radianRadius);
      
//       // 边缘点位置
//       var edgeX = SPHERE_RADIUS * (centerUnitX * cosRad + sinRad * (perpX * Math.cos(angle) + perpX2 * Math.sin(angle)));
//       var edgeY = SPHERE_RADIUS * (centerUnitY * cosRad + sinRad * (perpY * Math.cos(angle) + perpY2 * Math.sin(angle)));
//       var edgeZ = SPHERE_RADIUS * (centerUnitZ * cosRad + sinRad * (perpZ * Math.cos(angle) + perpZ2 * Math.sin(angle)));
      
//       // 稍微提高细菌点，使其位于球体表面之上
//       edgeX *= 1.01;
//       edgeY *= 1.01;
//       edgeZ *= 1.01;
      
//       this.vertices.push(edgeX, edgeY, edgeZ);
//       this.colors.push(this.color[0], this.color[1], this.color[2]);
      
//       // 添加三角形索引
//       if (i < divisions) {
//           this.indices.push(0, i + 1, i + 2);
//       }
//   }
// };

// // 初始化细菌的形状 - 完全球面贴合版本
// Bacterium.prototype.initShape = function() {
//   this.vertices = [];
//   this.colors = [];
//   this.indices = [];
  
//   var divisions = 36; // 圆周分段数
//   var radiusSteps = 4; // 从中心到边缘的径向步数
//   var vertexCount = 0;
  
//   // 先计算中心点
//   var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
//   var centerY = SPHERE_RADIUS * Math.cos(this.theta);
//   var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
//   // 将细菌制作为一个同心圆环的集合，确保所有点都在球面上
//   for (var r = 0; r <= radiusSteps; r++) {
//       // 计算当前环的半径（占总半径的比例）
//       var currentRadius = (r / radiusSteps) * this.radius;
      
//       for (var i = 0; i < divisions; i++) {
//           var angle = i * (2 * Math.PI / divisions);
          
//           // 仅在中心有一个点
//           if (r === 0 && i > 0) continue;
          
//           // 计算球面上的点
//           var pointTheta, pointPhi;
          
//           if (r === 0) {
//               // 中心点直接使用细菌的theta和phi
//               pointTheta = this.theta;
//               pointPhi = this.phi;
//           } else {
//               // 从细菌中心按角度和距离偏移
//               // 使用大圆距离计算
//               var angularDistance = currentRadius; // 弧度表示
              
//               // 计算球面上的目标点
//               var bearingAngle = angle;
              
//               // 使用球面三角公式计算新点的坐标
//               var lat1 = Math.PI/2 - this.theta; // 转为纬度表示
//               var lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + 
//                                     Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingAngle));
//               lat2 = Math.PI/2 - lat2; // 转回theta
              
//               var dLon = Math.atan2(Math.sin(bearingAngle) * Math.sin(angularDistance) * Math.cos(lat1), 
//                                     Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(Math.PI/2-lat2));
//               var lon2 = ((this.phi + dLon) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
              
//               pointTheta = lat2;
//               pointPhi = lon2;
//           }
          
//           // 计算球面坐标
//           var x = SPHERE_RADIUS * Math.sin(pointTheta) * Math.cos(pointPhi);
//           var y = SPHERE_RADIUS * Math.cos(pointTheta);
//           var z = SPHERE_RADIUS * Math.sin(pointTheta) * Math.sin(pointPhi);
          
//           // 稍微提高细菌点，使其位于球体表面之上
//           x *= 1.01;
//           y *= 1.01;
//           z *= 1.01;
          
//           this.vertices.push(x, y, z);
//           this.colors.push(this.color[0], this.color[1], this.color[2]);
//           vertexCount++;
          
//           // 添加三角形索引
//           if (r > 0 && i < divisions - 1) {
//               // 内环的当前点
//               var innerIndex = (r === 1) ? 0 : ((r-1) * divisions - (r-2)) + i;
              
//               // 外环的当前点和下一点
//               var outerIndex = ((r) * divisions - (r-1)) + i;
//               var outerNextIndex = ((r) * divisions - (r-1)) + i + 1;
              
//               this.indices.push(innerIndex, outerIndex, outerNextIndex);
              
//               // 对于内环非中心点，还需要连接内环下一点
//               if (r > 1) {
//                   var innerNextIndex = innerIndex + 1;
//                   this.indices.push(innerIndex, outerNextIndex, innerNextIndex);
//               }
//           } else if (r > 0 && i === divisions - 1) {
//               // 处理环闭合点
//               var innerIndex = (r === 1) ? 0 : ((r-1) * divisions - (r-2)) + i;
//               var outerIndex = ((r) * divisions - (r-1)) + i;
//               var outerStartIndex = ((r) * divisions - (r-1));
              
//               this.indices.push(innerIndex, outerIndex, outerStartIndex);
              
//               // 对于内环非中心点，还需要连接内环起始点
//               if (r > 1) {
//                   var innerStartIndex = (r-1) * divisions - (r-2);
//                   this.indices.push(innerIndex, outerStartIndex, innerStartIndex);
//               }
//           }
//       }
//   }
// };

// 初始化细菌的形状 - 实心圆形版本
Bacterium.prototype.initShape = function() {
  this.vertices = [];
  this.colors = [];
  this.indices = [];
  
  // 计算中心点
  var centerX = SPHERE_RADIUS * Math.sin(this.theta) * Math.cos(this.phi);
  var centerY = SPHERE_RADIUS * Math.cos(this.theta);
  var centerZ = SPHERE_RADIUS * Math.sin(this.theta) * Math.sin(this.phi);
  
  // 添加中心点
  this.vertices.push(centerX, centerY, centerZ);
  this.colors.push(this.color[0], this.color[1], this.color[2]);
  
  var divisions = 30; // 圆周分段数
  var rings = 5;      // 同心圆环数
  
  // 计算同心圆环
  for (var r = 1; r <= rings; r++) {
      var ringRadius = (r / rings) * this.radius;
      
      for (var i = 0; i < divisions; i++) {
          var angle = i * (2 * Math.PI / divisions);
          
          // 计算球面上的偏移点
          var offsetTheta = this.theta + ringRadius * Math.cos(angle);
          var offsetPhi = this.phi + ringRadius * Math.sin(angle) / Math.sin(this.theta);
          
          // 确保角度在有效范围内
          offsetTheta = Math.max(0.01, Math.min(Math.PI - 0.01, offsetTheta));
          
          // 计算球面坐标
          var x = SPHERE_RADIUS * Math.sin(offsetTheta) * Math.cos(offsetPhi);
          var y = SPHERE_RADIUS * Math.cos(offsetTheta);
          var z = SPHERE_RADIUS * Math.sin(offsetTheta) * Math.sin(offsetPhi);
          
          // 稍微提高细菌点
          x *= 1.01;
          y *= 1.01;
          z *= 1.01;
          
          this.vertices.push(x, y, z);
          this.colors.push(this.color[0], this.color[1], this.color[2]);
          
          // 最外环时，添加更多同色彩的点使圆形更饱满
          if (r == rings) {
              // 添加稍外一圈的点
              var outerRadius = this.radius * 1.05;
              var offsetThetaOuter = this.theta + outerRadius * Math.cos(angle);
              var offsetPhiOuter = this.phi + outerRadius * Math.sin(angle) / Math.sin(this.theta);
              
              offsetThetaOuter = Math.max(0.01, Math.min(Math.PI - 0.01, offsetThetaOuter));
              
              var xOuter = SPHERE_RADIUS * Math.sin(offsetThetaOuter) * Math.cos(offsetPhiOuter);
              var yOuter = SPHERE_RADIUS * Math.cos(offsetThetaOuter);
              var zOuter = SPHERE_RADIUS * Math.sin(offsetThetaOuter) * Math.sin(offsetPhiOuter);
              
              xOuter *= 1.01;
              yOuter *= 1.01;
              zOuter *= 1.01;
              
              this.vertices.push(xOuter, yOuter, zOuter);
              this.colors.push(this.color[0], this.color[1], this.color[2]);
          }
      }
  }
  
  // 创建三角形，填充整个圆形区域
  // 先用中心点连接第一环
  for (var i = 0; i < divisions; i++) {
      var nextI = (i + 1) % divisions;
      this.indices.push(0, i + 1, nextI + 1);
  }
  
  // 连接各环之间的点
  for (var r = 1; r < rings; r++) {
      var innerStart = (r - 1) * divisions + 1;
      var outerStart = r * divisions + 1;
      
      for (var i = 0; i < divisions; i++) {
          var nextI = (i + 1) % divisions;
          
          // 两个三角形构成一个四边形
          this.indices.push(innerStart + i, outerStart + i, innerStart + nextI);
          this.indices.push(outerStart + i, outerStart + nextI, innerStart + nextI);
      }
  }
  
  // 连接最外环和额外的外点
  if (rings > 0) {
      var lastRingStart = (rings - 1) * divisions + 1;
      var extraPointsStart = rings * divisions + 1;
      
      for (var i = 0; i < divisions; i++) {
          var nextI = (i + 1) % divisions;
          this.indices.push(lastRingStart + i, extraPointsStart + i, lastRingStart + nextI);
          this.indices.push(extraPointsStart + i, extraPointsStart + nextI, lastRingStart + nextI);
      }
  }
};

// 超简化版本 - 使用小球体表示细菌
Bacterium.prototype.initShape = function() {
  this.vertices = [];
  this.colors = [];
  this.indices = [];
  
  // 创建一个小球体
  var latBands = 10;
  var longBands = 10;
  
  // 细菌中心位置的单位向量
  var centerUnitX = Math.sin(this.theta) * Math.cos(this.phi);
  var centerUnitY = Math.cos(this.theta);
  var centerUnitZ = Math.sin(this.theta) * Math.sin(this.phi);
  
  // 添加顶点
  for (var latNumber = 0; latNumber <= latBands; latNumber++) {
      var theta = latNumber * Math.PI / latBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);
      
      for (var longNumber = 0; longNumber <= longBands; longNumber++) {
          var phi = longNumber * 2 * Math.PI / longBands;
          var sinPhi = Math.sin(phi);
          var cosPhi = Math.cos(phi);
          
          // 计算球体上的点
          var x = sinTheta * cosPhi;
          var y = cosTheta;
          var z = sinTheta * sinPhi;
          
          // 计算点与中心的点积，用于剔除背面
          var dotProduct = x * centerUnitX + y * centerUnitY + z * centerUnitZ;
          
          // 只保留朝向中心的点（点积>0表示夹角<90度）
          if (dotProduct > Math.cos(this.radius)) {
              // 将点放置在球体表面
              var pointX = (SPHERE_RADIUS + 0.02) * (centerUnitX + x * 0.1);
              var pointY = (SPHERE_RADIUS + 0.02) * (centerUnitY + y * 0.1);
              var pointZ = (SPHERE_RADIUS + 0.02) * (centerUnitZ + z * 0.1);
              
              // 归一化到球面
              var len = Math.sqrt(pointX*pointX + pointY*pointY + pointZ*pointZ);
              pointX = (SPHERE_RADIUS * 1.01) * pointX / len;
              pointY = (SPHERE_RADIUS * 1.01) * pointY / len;
              pointZ = (SPHERE_RADIUS * 1.01) * pointZ / len;
              
              this.vertices.push(pointX, pointY, pointZ);
              this.colors.push(this.color[0], this.color[1], this.color[2]);
              
              // 添加索引
              if (latNumber < latBands && longNumber < longBands) {
                  var first = (latNumber * (longBands + 1)) + longNumber;
                  var second = first + longBands + 1;
                  this.indices.push(first, second, first + 1);
                  this.indices.push(second, second + 1, first + 1);
              }
          }
      }
  }
};


// 更新细菌生长
Bacterium.prototype.grow = function(deltaTime) {
  if (!this.alive) return;
  
  // 增加细菌的半径
  this.radius += GROWTH_SPEED * deltaTime;
  
  // 检查是否达到阈值
  if (this.radius >= THRESHOLD_ANGLE * Math.PI / 180 && !this.reachedThreshold) {
      this.reachedThreshold = true;
      // 可以在这里添加游戏事件通知
  }
  
  // 重新计算细菌的形状
  this.initShape();
};

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
      
      // Add color - make grid points darker to visualize the 3D sphere
      if ((latNumber % 3 === 0 && longNumber % 3 === 0) || 
          (latNumber === SPHERE_DIV/2 && longNumber % 8 === 0) || 
          (longNumber === SPHERE_DIV/2 && latNumber % 8 === 0)) {
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
  
  // South pole triangles
  var southPoleIndex = vertices.length / 3 - 1;
  var lastRow = southPoleIndex - verticesPerRow;
  for (var i = 0; i < SPHERE_DIV; i++) {
    indices.push(southPoleIndex, lastRow + i, lastRow + i + 1);
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
  var dragging = false;      // Dragging or not
  var lastX = -1, lastY = -1; // Last position of the mouse
  
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
      // Limit x-axis rotation angle to -90 to 90 degrees
      currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
      currentAngle[1] = currentAngle[1] + dx;
    }
    lastX = x;
    lastY = y;
  };
  
  // Handle mouse leave event
  canvas.onmouseleave = function(ev) {
    dragging = false;
  };
}

// // Animation function called for each frame
// function tick() {
//   // Request next animation frame
//   requestAnimationFrame(tick);
  
//   // Draw the sphere
//   draw();
// }\

// 更新细菌生长
// Animation function called for each frame
// new tick function for Assignment 4
function tick() {
  // Request next animation frame
  requestAnimationFrame(tick);
  
  // 计算帧时间增量
  var now = Date.now();
  var deltaTime = (now - lastTime) / 1000.0; // 转换为秒
  lastTime = now;
  
  // 更新细菌生长
  updateBacteria(deltaTime);
  
  // Draw the sphere
  draw();
}

// Draw the sphere
function draw() {

    // 设置填充模式而非线框模式
    gl.polygonMode = gl.FILL;  // 如果你的WebGL支持这个属性
    gl.disable(gl.CULL_FACE);  // 禁用面剔除，显示所有三角形


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

  // 绘制每个细菌
  // for assignment 4
  drawBacteria(projMatrix, viewMatrix, modelMatrix);
    // 为了更好的视觉效果，可以启用光滑着色
    gl.shadeModel(gl.SMOOTH);  // 如果你的WebGL支持这个属性
    
}

// Call main function when the page is loaded
window.onload = main;

// 初始化细菌系统
function initBacteriaSystem() {
  // 清空现有的细菌
  bacteria = [];
  
  // 随机生成一个初始细菌
  generateRandomBacterium();
}

// 生成一个随机位置的细菌
function generateRandomBacterium() {
  if (bacteria.length >= MAX_BACTERIA) return;
  
  var id = bacteria.length;
  var newBacterium = new Bacterium(id);
  bacteria.push(newBacterium);
  
  console.log("Generated bacterium " + id + " at theta=" + newBacterium.theta + ", phi=" + newBacterium.phi);
}

// 更新细菌
function updateBacteria(deltaTime) {
  // 更新每个细菌的生长
  for (var i = 0; i < bacteria.length; i++) {
      bacteria[i].grow(deltaTime);
  }
  
  // 随机生成新的细菌（低概率）
  if (Math.random() < 0.005 && bacteria.length < MAX_BACTERIA) {
      generateRandomBacterium();
  }
}

// 绘制细菌
function drawBacteria(projMatrix, viewMatrix, modelMatrix) {
  // 对每个细菌进行绘制
  for (var i = 0; i < bacteria.length; i++) {
      if (!bacteria[i].alive) continue;
      
      // 创建临时缓冲区并绑定数据
      var tempVertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tempVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bacteria[i].vertices), gl.STATIC_DRAW);
      
      var a_Position = gl.getAttribLocation(gl.program, 'position');
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
      
      var tempColorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tempColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bacteria[i].colors), gl.STATIC_DRAW);
      
      var a_Color = gl.getAttribLocation(gl.program, 'color');
      gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Color);
      
      var tempIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tempIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bacteria[i].indices), gl.STATIC_DRAW);
      
      // 绘制这个细菌
      gl.drawElements(gl.TRIANGLES, bacteria[i].indices.length, gl.UNSIGNED_SHORT, 0);
      
      // 删除临时缓冲区
      gl.deleteBuffer(tempVertexBuffer);
      gl.deleteBuffer(tempColorBuffer);
      gl.deleteBuffer(tempIndexBuffer);
  }
  
  // 恢复主球体的缓冲区绑定
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var a_Position = gl.getAttribLocation(gl.program, 'position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  var a_Color = gl.getAttribLocation(gl.program, 'color');
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
}