// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec3 position;' +
    'uniform mat4 Pmatrix;'+ // projection matrix
    'uniform mat4 Vmatrix;'+ // view matrix
    'uniform mat4 Mmatrix;'+ // model matrix
    'attribute vec3 color;'+ // the color of the vertex
    'varying vec3 vColor;'+
  'void main() {\n' +
    'gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);\n' +
    'vColor = color;'+
  '}\n';
  
// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;'+
    'varying vec3 vColor;'+
  'void main() {\n' +
  '  gl_FragColor = vec4(vColor, 1.0);\n' +
  '}\n';

// 鼠标事件相关变量
var drag = false;        // 是否正在拖动
var old_x, old_y;        // 鼠标上一次的位置
var dX = 0, dY = 0;      // 鼠标移动的距离

// 模型、视图、投影矩阵
var u_ModelMatrix = [];
var u_ViewMatrix = [];
var u_ProjectionMatrix = [];

function main() {
  var canvas = document.getElementById('webgl');

  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // 鼠标事件处理
  var mouseDown = function(e) {
    drag = true;
    old_x = e.pageX, old_y = e.pageY;
    e.preventDefault();
    return false;
  };

  var mouseUp = function(e) {
    drag = false;
    dX = 0; // 重置 dX
    dY = 0; // 重置 dY
  };

  var mouseMove = function(e) {
    if (!drag) return false;
    dX = (e.pageX-old_x)*2*Math.PI/canvas.width,
    dY = (e.pageY-old_y)*2*Math.PI/canvas.height;
    THETA+= dX;
    PHI+=dY;
    old_x = e.pageX, old_y = e.pageY;
    e.preventDefault();
    };

  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  canvas.addEventListener("mouseout", mouseUp, false);
  canvas.addEventListener("mousemove", mouseMove, false);

  // 初始化视图矩阵和投影矩阵
  var view_matrix = new Matrix4(); // 视图矩阵
  var proj_matrix = new Matrix4(); // 投影矩阵

  // 设置投影矩阵（透视投影）
  proj_matrix.setPerspective(80, canvas.width / canvas.height, 1, 100);

  // 设置视图矩阵（将相机向后移动）
  view_matrix.elements[14] = view_matrix.elements[14] - 6;

  // 初始化模型矩阵
  var mo_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  // 获取着色器中uniform变量的位置
  var _Pmatrix = gl.getUniformLocation(gl.program, "Pmatrix");
  var _Vmatrix = gl.getUniformLocation(gl.program, "Vmatrix");
  var _Mmatrix = gl.getUniformLocation(gl.program, "Mmatrix");

  // 将矩阵传递给着色器
  gl.uniformMatrix4fv(_Pmatrix, false, proj_matrix.elements);
  gl.uniformMatrix4fv(_Vmatrix, false, view_matrix.elements);
  gl.uniformMatrix4fv(_Mmatrix, false, mo_matrix);

  // 动画循环
  var THETA = 0, PHI = 0; // 旋转角度
  var frame_counter = 0;

  var animate = function() {
    if (drag) {
      // 只有在拖动时更新旋转角度
      THETA += dX;
      PHI += dY;
      dX = 0; // 重置 dX
      dY = 0; // 重置 dY
    }
  
    // 清除颜色和深度缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    var tempMatrix = mo_matrix.slice();
    rotateY(tempMatrix, THETA);
    rotateX(tempMatrix, PHI);
    gl.uniformMatrix4fv(_Mmatrix, false, tempMatrix);
  
    // 绘制球体
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
  
    requestAnimationFrame(animate, canvas);
  };

  animate();
}

// 初始化顶点缓冲区
function initVertexBuffers(gl) {
  var SPHERE_DIV = 180; // 球体分割数
  var radius = 3;       // 球体半径
  var i, ai, si, ci;
  var j, aj, sj, cj;
  var p1, p2;

  var positions = []; // 顶点位置
  var indices = [];   // 顶点索引
  var colors = [];    // 顶点颜色

  // 生成顶点坐标
  for (j = 0; j <= SPHERE_DIV; j++) {
    aj = j * Math.PI / SPHERE_DIV;
    sj = Math.sin(aj);
    cj = Math.cos(aj);
    for (i = 0; i <= SPHERE_DIV; i++) {
      ai = i * 2 * Math.PI / SPHERE_DIV;
      si = Math.sin(ai);
      ci = Math.cos(ai);

      positions.push(radius * si * sj); // X
      positions.push(radius * cj);      // Y
      positions.push(radius * ci * sj); // Z

      // 设置顶点颜色
      if (j % 5 == 0 && i % 5 == 0) {
        colors.push(0.9, 0.9, 0.9); // 白色
      } else {
        colors.push(0.2, 0.2, 0.2); // 灰色
      }
    }
  }

  // 生成顶点索引
  for (j = 0; j < SPHERE_DIV; j++) {
    for (i = 0; i < SPHERE_DIV; i++) {
      p1 = j * (SPHERE_DIV + 1) + i;
      p2 = p1 + (SPHERE_DIV + 1);

      indices.push(p1, p2, p1 + 1);
      indices.push(p1 + 1, p2, p2 + 1);
    }
  }

  // 初始化顶点位置缓冲区
  if (!initArrayBuffer(gl, 'position', new Float32Array(positions), gl.FLOAT, 3)) return -1;
  // 初始化顶点颜色缓冲区
  if (!initArrayBuffer(gl, 'color', new Float32Array(colors), gl.FLOAT, 3)) return -1;

  // 创建索引缓冲区
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('创建索引缓冲区失败');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return indices.length;
}

// 初始化缓冲区
function initArrayBuffer(gl, attribute, data, type, num) {
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('创建缓冲区失败');
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('获取attribute变量位置失败: ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return true;
}

// 绕X轴旋转
function rotateX(m, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var mv1 = m[1], mv5 = m[5], mv9 = m[9];

  m[1] = m[1] * c - m[2] * s;
  m[5] = m[5] * c - m[6] * s;
  m[9] = m[9] * c - m[10] * s;

  m[2] = m[2] * c + mv1 * s;
  m[6] = m[6] * c + mv5 * s;
  m[10] = m[10] * c + mv9 * s;
}

// 绕Y轴旋转
function rotateY(m, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var mv0 = m[0], mv4 = m[4], mv8 = m[8];

  m[0] = c * m[0] + s * m[2];
  m[4] = c * m[4] + s * m[6];
  m[8] = c * m[8] + s * m[10];

  m[2] = c * m[2] - s * mv0;
  m[6] = c * m[6] - s * mv4;
  m[10] = c * m[10] - s * mv8;
}