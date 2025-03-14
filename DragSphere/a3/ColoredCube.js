// ColoredCube.js (c) 2012 matsuda
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
var shaderprogram = {};

vertices_ = []
indices_ = []
colors_ = []
var AMOERTIZATION = 0.95;
var drag = false;
var old_x, old_y;
var dX = 0, dY = 0;
function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');
  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
    draw_sphere(gl,0.8);
    
    var proj_matrix = new Matrix4();          
    proj_matrix.setPerspective(80, canvas.width/canvas.height, 1, 100); //you can change the parameters to get the best view
    var mo_matrix = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ]; //model matrix - need to be updated accordingly when the sphere rotates
    var view_matrix = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];
    view_matrix[14] = view_matrix[14]-6; // view matrix - move camera away from the object

  // Get the storage location of u_MvpMatrix

    var u_Pmatrix = gl.getUniformLocation(gl.program, "Pmatrix");
    var u_Vmatrix = gl.getUniformLocation(gl.program, "Vmatrix");
    var u_Mmatrix = gl.getUniformLocation(gl.program, "Mmatrix");
    if (!u_Pmatrix||!u_Vmatrix||!u_Mmatrix) {
    console.log('Failed to get the storage location');
    return;
  }
  // Pass the model view projection matrix to u_MvpMatrix
   
  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseup, false);
  canvas.addEventListener("mouseout", mouseup, false);
  canvas.addEventListener("mousemove", mouseMove, false);

  // Draw
  var THETA = 0;
  PHI = 0;
  var time_old = 0;
  
  B1_x = Math.floor(Math.random() * 180);
  B1_y = Math.floor(Math.random() * 180);
  B2_x = Math.floor(Math.random() * 180);
  B2_y = Math.floor(Math.random() * 180);
  B3_x = Math.floor(Math.random() * 180);
  B3_y = Math.floor(Math.random() * 180);
  var B1_arc = 0;
  var B2_arc = 0;
  var B3_arc = 0;
  var frame_counter = 0;
  var animate = function (time){
    
    var dt = time - time_old;
    if(!drag){
      dX *= AMOERTIZATION,  dY *= AMOERTIZATION, 
      THETA += dX, PHI+=dY;
    }
    mo_matrix[0]= 1, mo_matrix[1]=0, mo_matrix[2]=0, mo_matrix[3]=0, mo_matrix[4]=0, mo_matrix[5]=1, mo_matrix[6]=0, mo_matrix[7]=0, mo_matrix[8]=0, mo_matrix[9]=0, mo_matrix[10]=1, mo_matrix[11]=0, mo_matrix[12]=0, mo_matrix[13]=0, mo_matrix[14]=0, mo_matrix[15]=1;
    rotateX(mo_matrix, PHI);
    rotateY(mo_matrix, THETA);
    
    time_old = time;
   gl.enable(gl.DEPTH_TEST);
   gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Clear color and depth buffer

    gl.uniformMatrix4fv(u_Pmatrix, false, proj_matrix.elements);
    gl.uniformMatrix4fv(u_Vmatrix, false, view_matrix);
    gl.uniformMatrix4fv(u_Mmatrix, false, mo_matrix);
}
 animate(0);
}
  

function draw_sphere(gl,RADIUS) {
var ALPHA=1;
var BETA=1;
var ARC=180*Math.PI;
var r=0.5,g=0.5,b=0.5;
var vertex_start_from=0;
var vertices=[];
var indices=[];
var colors=[];
var main_ball=true;

 var SPHERE_DIV=180;
    var sin_ALPHA=Math.sin(ALPHA*Math.PI/180.0);
    var cos_ALPHA=Math.cos(ALPHA*Math.PI/180.0);
    var sin_BETA=Math.sin(BETA*Math.PI/180.0);
    var cos_BETA=Math.cos(BETA*Math.PI/180.0);
    for(j=0;j<=ARC;j++){
    var alpha = j*(Math.PI/SPHERE_DIV);
    var sj=RADIUS*Math.sin(alpha);
    var cj=RADIUS*Math.cos(alpha);
    for(i=0;i<=SPHERE_DIV;i++){
        var beta=i*(2*Math.PI)/SPHERE_DIV;
        var si=Math.sin(beta);
        var ci=Math.cos(beta);
      var x_=si*sj;
      var y_=cj;
      var z_=ci*sj;
      
      var x__=x_;
      var y__=y_*cos_ALPHA-z_*sin_ALPHA;
      var z__=y_*sin_ALPHA+z_*cos_ALPHA;
      
      var x=x__*cos_BETA+z__*sin_BETA;
      var y=y__;
      var z=-x__*sin_BETA+z__*cos_BETA;
      vertices.push(x);
      vertices.push(y);
      vertices.push(z);

      if(main_ball){
        if(j%10==0&&i%10==0){
          colors.push(r);
          colors.push(g);
          colors.push(b);
        }
        else{
          colors.push(r-0.5);
          colors.push(g-0.5);
          colors.push(b-0.5);          
        }
      
    }
    else{
      colors.push(r);
      colors.push(g);
      colors.push(b);
    
    }
      }
 if(i>0&&j>0){
    var p1=(SPHERE_DIV+1)*j+i;
    var p2=(SPHERE_DIV+1)*j+i-1;

        indices_.push(vertex_start_from+p1);
        indices_.push(vertex_start_from+p2);
        indices_.push(vertex_start_from+p1+1);        
        
        indices.push(vertex_start_from+p1+1);
        indices.push(vertex_start_from+p2);
        indices.push(vertex_start_from+p2+1);

 }
}


     if (!initArrayBuffer(gl, 'position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'color', colors, 3, gl.FLOAT)) return -1;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

      var vertexBuffer = gl.createBuffer();
      if (!vertexBuffer) 
      {
        console.log('Failed to create the buffer object');
        return -1;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); 
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 
      var indexBuffer = gl.createBuffer(); 
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); 
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

      return indices.length;
}

function initArrayBuffer(gl, data, num, type, attribute) {
    var vertex_buffer=gl.createBuffer();
    var color_buffer=gl.createBuffer();
    var index_buffer=gl.createBuffer();  
    if (!vertex_buffer||!color_buffer||!index_buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
   
   gl.bindBuffer(gl.ARRAY_BUFFER,vertex_buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices_), gl.DYNAMIC_DRAW);

   gl.bindBuffer(gl.ARRAY_BUFFER,color_buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(colors_), gl.DYNAMIC_DRAW);

   gl.bindBuffer(gl.ARRAY_BUFFER,index_buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Uint16Array(indices_), gl.DYNAMIC_DRAW);
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER,vertex_buffer);

  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}
var mouseDown = function(e){
    drag=true;
    old_x=e.pageX, old_y=e.pageY;
    var pixel= new Uint8Array(4);
    gl.readPixels(old_x-10,300-old_y+10,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    console.log("texture:", pixel);
    e.preventDefault();
    return false
    
 };
   var mouseup = function(e){
     drag=false;

   };
     var mouseMove = function(e){
       if(!drag)return false;
       dX=(e.pageX-old_x)*2*Math.PI/canvas.width,
       dY=(e.pageX-old_y)*2*Math.PI/canvas.height;
       THETA+=dX;
       PHI+=dY;
       old_x=e.pageX,old_y=e.pageY;
       e.preventDefault();
       
     };
     function rotateX(m, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var mv1 = m[1], mv5 = m[5], mv9 = m[9];
    m[1] = m[1]*c-m[2]*s;
    m[5] = m[5]*c-m[6]*s;
    m[9] = m[9]*c-m[10]*s;
    m[2] = m[2]*c+mv1*s;
    m[6] = m[6]*c+mv5*s;
    m[10] = m[10]*c+mv9*s;
}

function rotateY(m, angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var mv0 = m[0], mv4 = m[4], mv8 = m[8];
  m[0] = c*m[0]+s*m[2];
  m[4] = c*m[4]+s*m[6];
  m[8] = c*m[8]+s*m[10];
  m[2] = c*m[2]-s*mv0;
  m[6] = c*m[6]-s*mv4;
  m[10] = c*m[10]-s*mv8;
}
