import * as THREE from './js/three.min.js';
var Physijs = require("js/physic.js")
let ctx = canvas.getContext('webgl')

const screenWidth = window.innerWidth
const screenHeight = window.innerHeight

const _CONFIG = {
  "ROWS": 6,//几层
  "NUM_PER_ROW": 3,//一层几个
  "FRICTION": 0,//摩擦
  "RESTITUTION": 0,//弹性系数
  "BLOCK_MASS_BASE": 1,//质量b
  "BLOCK_MASS_K": 0.7,//质量k    b * k ^ i
  "GRAVITY": 10,//重力
  "UNMOVABLE": 2 //不可移动的数量
}

const texIndex = [//纹理路径
  ['images/chengyaojin.jpg', 'images/huangpang.jpg', 'images/gaisuwen.jpg'],
  ['images/huangpang.jpg', 'images/chengyaojin.jpg', 'images/hanchang.jpg']
]

var tp = [//纹理贴图点坐标
  new THREE.Vector2(0, 0),
  new THREE.Vector2(0.4, 0),
  new THREE.Vector2(1, 0),
  new THREE.Vector2(0.4, 0.5),
  new THREE.Vector2(1, 0.5),
  new THREE.Vector2(0, 1),
  new THREE.Vector2(0.4, 1),
  new THREE.Vector2(1, 1),
];

//uv map
var bf_right = [
  tp[0], tp[1], tp[5], tp[6]
];
var bf_left = [
  tp[0], tp[1], tp[5], tp[6]
];
var bf_up = [
  tp[3], tp[4], tp[6], tp[7]
];
var bf_down = [
  tp[1], tp[2], tp[3], tp[4]
];
var bf_front = [
  tp[3], tp[4], tp[6], tp[7]
];
var bf_back = [
  tp[1], tp[2], tp[3], tp[4]
];

//Physijs.scripts.worker = 'js/physijs_worker.js';
//Physijs.scripts.ammo = 'ammo.js';

var render, loader, createTower, movable, gameOverFlag = false, infoSprite,
  renderer, scene, dir_light, am_light, camera,
  table, blocks = [], table_material, block_material, intersect_plane,
  selected_block = null, mouse_position = new THREE.Vector3, block_offset = new THREE.Vector3, _i, _v3 = new THREE.Vector3;

export default class Main {
  constructor() {


    this.restart()
  }

  render = function () {
    requestAnimationFrame(this.render.bind(this));
    renderer.render(scene, camera);

    this.sceneUpdate();
    this.checkGameOver();
  };

  checkGameOver = function(){//判断游戏结束
    if(gameOverFlag) return;
    for(var b of blocks){
      if(!b._pull && b.position.y < b.overY){
        console.log("game over");
        gameOverFlag = true;
        this.updateInfo("images/game_over.png");
      }
    }
  }


  updateInfo = function(src) {//更新左上角信息
    if (infoSprite){
      scene.remove(infoSprite);
    }

    var spriteMap = new THREE.TextureLoader().load(src);
    var spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap, color: 0xffffff });
    infoSprite = new THREE.Sprite(spriteMaterial);
  
    infoSprite.position.set(-3, 17, 0);
    infoSprite.scale.set(6,2,1);
    scene.add(infoSprite);
  }


  createTower = (function () {
    var block_length = 6, block_height = 2, block_width = 2, block_offset = block_width,
      block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width);
    
    block_geometry.faceVertexUvs[0] = [];

    block_geometry.faceVertexUvs[0][0] = [bf_right[2], bf_right[0], bf_right[3]];
    block_geometry.faceVertexUvs[0][1] = [bf_right[0], bf_right[1], bf_right[3]];

    block_geometry.faceVertexUvs[0][2] = [bf_left[2], bf_left[0], bf_left[3]];
    block_geometry.faceVertexUvs[0][3] = [bf_left[0], bf_left[1], bf_left[3]];

    block_geometry.faceVertexUvs[0][4] = [bf_up[2], bf_up[0], bf_up[3]];
    block_geometry.faceVertexUvs[0][5] = [bf_up[0], bf_up[1], bf_up[3]];

    block_geometry.faceVertexUvs[0][6] = [bf_down[2], bf_down[0], bf_down[3]];
    block_geometry.faceVertexUvs[0][7] = [bf_down[0], bf_down[1], bf_down[3]];

    block_geometry.faceVertexUvs[0][8] = [bf_front[2], bf_front[0], bf_front[3]];
    block_geometry.faceVertexUvs[0][9] = [bf_front[0], bf_front[1], bf_front[3]];

    block_geometry.faceVertexUvs[0][10] = [bf_back[2], bf_back[0], bf_back[3]];
    block_geometry.faceVertexUvs[0][11] = [bf_back[0], bf_back[1], bf_back[3]];


    return function () {
      var i, j, rows = _CONFIG.ROWS,
        block;

      var movable = [];
      for (var i = rows * _CONFIG.NUM_PER_ROW - 1; i >= 0; --i)
        movable.push(i);
      for(var i = _CONFIG.UNMOVABLE; i > 0; --i){
        if(movable.length == 0) break;
        var pos = parseInt(Math.random() * movable.length);
        movable.splice(pos, 1);
      }

      //console.log(movable);

      for (i = 0; i < rows; i++) {
        for (j = 0; j < _CONFIG.NUM_PER_ROW; j++) {
          var __movable = (movable.indexOf(i * _CONFIG.NUM_PER_ROW + j) >= 0);
          //console.log (_mass);
          //console.log(texIndex[i % 2][j % 3]);
          block_material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ map: loader.load(texIndex[i%2][j%3]) }),
            _CONFIG.FRICTION,
            _CONFIG.RESTITUTION
          );
          block_material.map.wrapS = block_material.map.wrapT = THREE.RepeatWrapping;
          block_material.map.repeat.set(1, 1);

          block = new Physijs.BoxMesh(block_geometry, block_material, _CONFIG.BLOCK_MASS_BASE * Math.pow(_CONFIG.BLOCK_MASS_K, i));
          block.position.y = (block_height / 2) + block_height * i;
          if (i % 2 === 1) {
            block.rotation.y = Math.PI / 2.01; // #TODO: There's a bug somewhere when this is to close to 2
            block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2);
          } else {
            block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2);
          }
          block.__movable = __movable;

          block.overY = block.position.y - block_height / 2;
          block.infoSrc = texIndex[i % 2][j % 3];
          block._pull = false;

          //console.log(block);
          //block.receiveShadow = true;
          //block.castShadow = true;
          scene.add(block);
          blocks.push(block);
        }
      }
    }
  })();

  initEventHandling = (function () {
    var _vector = new THREE.Vector3,
      handleMouseDown, handleMouseMove, handleMouseUp;

    handleMouseDown = function (evt) {
      //console.log("mouse down");
      evt = evt.touches[0];
      var ray, intersections;

      _vector.set(
        (evt.clientX / window.innerWidth) * 2 - 1,
        -(evt.clientY / window.innerHeight) * 2 + 1,
        1
      );

      _vector.unproject(camera);

      ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
      intersections = ray.intersectObjects(blocks);

      if (intersections.length > 0 && intersections[0].object.__movable && !gameOverFlag) {
        //console.log("intersect");
        selected_block = intersections[0].object;

        _vector.set(0, 0, 0);
        selected_block.setAngularFactor(_vector);
        selected_block.setAngularVelocity(_vector);
        selected_block.setLinearFactor(_vector);
        selected_block.setLinearVelocity(_vector);

        mouse_position.copy(intersections[0].point);
        block_offset.subVectors(selected_block.position, mouse_position);

        intersect_plane.position.y = mouse_position.y;

        selected_block._pull = true;
        this.updateInfo(selected_block.infoSrc);
      }
    };

    handleMouseMove = function (evt) {
      evt = evt.touches[0];
      //console.log(evt);
      var ray, intersection,
        i, scalar;

      if (selected_block !== null) {

        _vector.set(
          (evt.clientX / window.innerWidth) * 2 - 1,
          -(evt.clientY / window.innerHeight) * 2 + 1,
          1
        );
        _vector.unproject(camera);

        ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
        intersection = ray.intersectObject(intersect_plane);
        mouse_position.copy(intersection[0].point);
      }

    };

    handleMouseUp = function (evt) {
      if (selected_block !== null) {
        _vector.set(1, 1, 1);
        selected_block.setAngularFactor(_vector);
        selected_block.setLinearFactor(_vector);

        selected_block = null;
      }

    };

    return function () {
      /*renderer.domElement.addEventListener('touchstart', handleMouseDown);
      renderer.domElement.addEventListener('touchmove', handleMouseMove);
      renderer.domElement.addEventListener('touchend', handleMouseUp);*/
      wx.onTouchStart(handleMouseDown.bind(this));
      wx.onTouchMove(handleMouseMove.bind(this));
      wx.onTouchEnd(handleMouseUp.bind(this));
    }
  })();

  sceneUpdate = function () {
    //console.log("scene update");

    if (selected_block !== null) {
      //console.log("scene update");

      _v3.copy(mouse_position).add(block_offset).sub(selected_block.position).multiplyScalar(5);
      _v3.y = 0;
      selected_block.setLinearVelocity(_v3);

      // Reactivate all of the blocks
      _v3.set(0, 0, 0);
      for (_i = 0; _i < blocks.length; _i++) {
        blocks[_i].applyCentralImpulse(_v3);
      }
    }

    //scene.simulate();

    //stack over flow
  //  setTimeout(() => {
      scene.simulate(undefined, 1);
  //  }, 1)
  };

  restart() {
    renderer = new THREE.WebGLRenderer({ antialias: true, context: ctx });
    //renderer = new THREE.CanvasRenderer({ antialias: true, context: ctx });
    renderer.setSize(window.innerWidth, window.innerHeight);
  //  renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;

    scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 });
    scene.setGravity(new THREE.Vector3(0, -_CONFIG.GRAVITY, 0));
    var bg = new THREE.TextureLoader().load("images/background.jpg");
    scene.background = bg;
    console.log(scene);

  /*  scene.addEventListener(
      'update',
      this.sceneUpdate
    );*/

    camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.set(25, 20, 25);
    camera.lookAt(new THREE.Vector3(0, 7, 0));
    scene.add(camera);

    // ambient light
    am_light = new THREE.AmbientLight(0x444444);
    scene.add(am_light);

    // directional light
    dir_light = new THREE.DirectionalLight(0xFFFFFF);
    dir_light.position.set(20, 21, 15);
    dir_light.target.position.copy(scene.position);
    dir_light.castShadow = true;
    dir_light.shadowCameraLeft = -30;
    //dir_light.shadow.camera.left = -30;
    dir_light.shadowCameraTop = -30;
    //dir_light.shadow.camera.top = -30;
    dir_light.shadowCameraRight = 30;
    //dir_light.shadow.camera.right = 30;
    dir_light.shadowCameraBottom = 30;
    //dir_light.shadow.camera.bottom = 30;
    dir_light.shadowCameraNear = 20;
    //dir_light.shadow.camera.near = 20;
    dir_light.shadowCameraFar = 200;
    //dir_light.shadow.camera.far = 200;
    dir_light.shadowBias = -.001
    //dir_light.shadow.bias = -.001
    dir_light.shadowMapWidth = dir_light.shadowMapHeight = 2048;
    dir_light.shadowDarkness = .5;
    scene.add(dir_light);

    // Loader
    loader = new THREE.TextureLoader();

    // Materials
    table_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: loader.load('images/wood.jpg') }),
      0, // 9  high friction
      0 // 2  low restitution
    );
    table_material.map.wrapS = table_material.map.wrapT = THREE.RepeatWrapping;
    table_material.map.repeat.set(5, 5);

    //block_materal

    // Table
    table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      table_material,
      0, // mass
    );
    table.position.y = -.5;
    table.receiveShadow = true;
    scene.add(table);

    this.createTower();

    intersect_plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true })
    );
    intersect_plane.rotation.x = Math.PI / -2;
    scene.add(intersect_plane);

    this.initEventHandling();

    requestAnimationFrame(this.render.bind(this));

    scene.simulate();

/*
    var particleMaterial = new THREE.SpriteCanvasMaterial({

      color: 0x000000,
      program: function (context) {

        context.beginPath();
        context.font = "bold 20px Arial";
        context.fillStyle = "#058";
        context.transform(-1, 0, 0, 1, 0, 0);
        context.rotate(Math.PI);
        context.fillText("123", 0, 0);
      }
    })

    infoSprite = new THREE.Sprite(particleMaterial);

    infoSprite.position.set(-3, 17, 0);
    infoSprite.scale.set(6, 2, 1);
    scene.add(infoSprite);*/

    //this.updateInfo();
    //scene.simulate(undefined, 1);
    //scene.simulate(undefined, 1);
  }
  
}
