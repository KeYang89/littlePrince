
var Colors = {
	red:0xf25346,
	yellow:0xedeb27,
	goldenwheat:0xedef19,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
	green:0x458248,
	purple:0x551A8B,
	lightgreen:0x629265,
};



var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer, container;
var particlesPool = [];
var particlesInUse = [];
function createScene() {
	// Get the width and height of the screen
	// and use them to setup the aspect ratio
	// of the camera and the size of the renderer.
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	// Create the scene.
	scene = new THREE.Scene();

	// Add FOV Fog effect to the scene. Same colour as the BG int he stylesheet.
	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

	// Create the camera
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
	);
	// Position the camera
	camera.position.x = 0;
	camera.position.y = 150;
	camera.position.z = 100;	

	// Create the renderer

	renderer = new THREE.WebGLRenderer ({
	// Alpha makes the background transparent, antialias is performant heavy
		alpha: true,
		antialias:true
	});

	//set the size of the renderer to fullscreen
	renderer.setSize (WIDTH, HEIGHT);
	//enable shadow rendering
	renderer.shadowMap.enabled = true;

	// Add the Renderer to the DOM, in the world div.
	container = document.getElementById('world');
	container.appendChild (renderer.domElement);

	//RESPONSIVE LISTENER
	window.addEventListener('resize', handleWindowResize, false);
}

//RESPONSIVE FUNCTION
function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}


var hemispshereLight, shadowLight;

//CREATE LITTLE PRINCE WITH GOLDEN HAIR
var Prince = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "prince";
  this.angleHairs=0;

  var bodyGeom = new THREE.BoxGeometry(15,15,15);
  var bodyMat = new THREE.MeshPhongMaterial({color:Colors.green, shading:THREE.FlatShading});
  var body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(2,-12,0);

  this.mesh.add(body);

  var faceGeom = new THREE.BoxGeometry(10,10,10);
  var faceMat = new THREE.MeshLambertMaterial({color:Colors.pink});
  var face = new THREE.Mesh(faceGeom, faceMat);
  this.mesh.add(face);

  var hairGeom = new THREE.SphereGeometry(4,8,2,10);
  var hairMat = new THREE.MeshLambertMaterial({color:Colors.goldenwheat});
  var hair = new THREE.Mesh(hairGeom, hairMat);
  hair.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(2,2,0));
  var hairs = new THREE.Object3D();

  this.hairsTop = new THREE.Object3D();

  for (var i=0; i<12; i++){
    var h = hair.clone();
    var col = i%3;
    var row = Math.floor(i/3);
    var startPosZ = -4;
    var startPosX = -4;
    h.position.set(startPosX + row*4, 0, startPosZ + col*4);
    h.geometry.applyMatrix(new THREE.Matrix4().makeScale(1,1,1));
    this.hairsTop.add(h);
  }
  hairs.add(this.hairsTop);

  var hairSideGeom = new THREE.BoxGeometry(12,4,2);
  hairSideGeom.applyMatrix(new THREE.Matrix4().makeTranslation(-6,0,0));
  var hairSideR = new THREE.Mesh(hairSideGeom, hairMat);
  var hairSideL = hairSideR.clone();
  hairSideR.position.set(8,-2,6);
  hairSideL.position.set(8,-2,-6);
  hairs.add(hairSideR);
  hairs.add(hairSideL);

  var hairBackGeom = new THREE.BoxGeometry(2,8,10);
  var hairBack = new THREE.Mesh(hairBackGeom, hairMat);
  hairBack.position.set(-1,-4,0)
  hairs.add(hairBack);
  hairs.position.set(-5,5,0);

  this.mesh.add(hairs);

  var glassGeom = new THREE.BoxGeometry(5,5,5);
  var glassMat = new THREE.MeshLambertMaterial({color:Colors.blue});
  var glassR = new THREE.Mesh(glassGeom,glassMat);
  glassR.position.set(6,0,3);
  var glassL = glassR.clone();
  glassL.position.z = -glassR.position.z

  var glassAGeom = new THREE.BoxGeometry(11,1,11);
  var glassA = new THREE.Mesh(glassAGeom, glassMat);
  this.mesh.add(glassR);
  this.mesh.add(glassL);
  this.mesh.add(glassA);

  var earGeom = new THREE.BoxGeometry(2,3,2);
  var earL = new THREE.Mesh(earGeom,faceMat);
  earL.position.set(0,0,-6);
  var earR = earL.clone();
  earR.position.set(0,0,6);
  this.mesh.add(earL);
  this.mesh.add(earR);
}

Prince.prototype.updateHairs = function(){
  //*
   var hairs = this.hairsTop.children;

   var l = hairs.length;
   for (var i=0; i<l; i++){
      var h = hairs[i];
      h.scale.y = .75 + Math.cos(this.angleHairs+i/3)*.25;
   }
  this.angleHairs += 2;
  //*/
}
Particle = function(){
  var geom = new THREE.SphereGeometry(0.4,10,10);
  var mat = new THREE.MeshPhongMaterial({
    color:0x009999,
    shininess:0,
    specular:0xffffff,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
}

Particle.prototype.explode = function(pos, color, scale){
  var _this = this;
  var _p = this.mesh.parent;
  this.mesh.material.color = new THREE.Color( color);
  this.mesh.material.needsUpdate = true;
  this.mesh.scale.set(scale*0.8, scale*0.2, scale*0.5);//round flat seeds
  var targetX = pos.x + (-1 + Math.random()*2)*10;
  var targetY = pos.y + (-1 + Math.random()*2)*10;
  var speed = .6+Math.random()*.2;
  TweenMax.to(this.mesh.rotation, speed, {x:Math.random()*12, y:Math.random()*12});
  TweenMax.to(this.mesh.scale, speed, {x:.1, y:.1, z:.1});
  TweenMax.to(this.mesh.position, speed, {x:targetX, y:targetY, delay:Math.random() *.1, ease:Power2.easeOut, onComplete:function(){
      if(_p) _p.remove(_this.mesh);
      _this.mesh.scale.set(1,1,1);
      particlesPool.unshift(_this);

    }});
}

ParticlesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.particlesInUse = [];
}

ParticlesHolder.prototype.spawnParticles = function(pos, density, color, scale){

  var nPArticles = density;
  for (var i=0; i<nPArticles; i++){
    var particle;
    if (particlesPool.length) {
      particle = particlesPool.pop();
    }else{
      particle = new Particle();
    }
    this.mesh.add(particle.mesh);
    particle.mesh.visible = true;
    var _this = this;
    var targetX = normalize(mousePos.x,-.75,.75,-100, -40);
    var targetY = normalize(mousePos.y,-.75,.75,-100, -20);
    particle.mesh.position.y = pos.y + targetY;
    particle.mesh.position.x = pos.x - targetX/(Math.random()*2 + 2.5);
    particle.explode(pos,color, scale);
  }
}

function createLights(){
	// Gradient coloured light - Sky, Ground, Intensity
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)
	// Parallel rays
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);



	shadowLight.position.set(0,350,350);
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -650;
	shadowLight.shadow.camera.right = 650;
	shadowLight.shadow.camera.top = 650;
	shadowLight.shadow.camera.bottom = -650;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// Shadow map size
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	// Add the lights to the scene
	scene.add(hemisphereLight);  

	scene.add(shadowLight);
}	


Land = function(){
	var geom = new THREE.CylinderGeometry(600,600,1700,40,10);
	//rotate on the x axis
	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	//create a material
	var mat = new THREE.MeshPhongMaterial({
		color: Colors.lightgreen,
		shading:THREE.FlatShading,
	});

	//create a mesh of the object
	this.mesh = new THREE.Mesh(geom, mat);
	//receive shadows
	this.mesh.receiveShadow = true;
}

Orbit = function(){

	var geom =new THREE.Object3D();

	this.mesh = geom;
	//this.mesh.add(sun);
}

Sun = function(){

	this.mesh = new THREE.Object3D();

	var sunGeom = new THREE.SphereGeometry( 400, 20, 10 );
	var sunMat = new THREE.MeshPhongMaterial({
		color: Colors.yellow,
		shading:THREE.FlatShading,
	});
	var sun = new THREE.Mesh(sunGeom, sunMat);
	//sun.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	sun.castShadow = false;
	sun.receiveShadow = false;
	this.mesh.add(sun);
}

Cloud = function(){
	// Create an empty container for the cloud
	this.mesh = new THREE.Object3D();
	// Cube geometry and material
	var geom = new THREE.DodecahedronGeometry(20,0);
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.white,  
	});

	var nBlocs = 3+Math.floor(Math.random()*3);

	for (var i=0; i<nBlocs; i++ ){
		//Clone mesh geometry
		var m = new THREE.Mesh(geom, mat);
			//Randomly position each cube
			m.position.x = i*15;
			m.position.y = Math.random()*10;
			m.position.z = Math.random()*10;
			m.rotation.z = Math.random()*Math.PI*2;
			m.rotation.y = Math.random()*Math.PI*2;

			//Randomly scale the cubes
			var s = .1 + Math.random()*.9;
			m.scale.set(s,s,s);
			this.mesh.add(m);
	}
}

Sky = function(){

	this.mesh = new THREE.Object3D();

	// Number of cloud groups
	this.nClouds = 25;

	// Space the consistenly
	var stepAngle = Math.PI*2 / this.nClouds;

	// Create the Clouds

	for(var i=0; i<this.nClouds; i++){
	
		var c = new Cloud();

		//set rotation and position using trigonometry
		var a = stepAngle*i;
		// this is the distance between the center of the axis and the cloud itself
		var h = 800 + Math.random()*200;
		c.mesh.position.y = Math.sin(a)*h;
		c.mesh.position.x = Math.cos(a)*h;		

		// rotate the cloud according to its position
		c.mesh.rotation.z = a + Math.PI/2;

		// random depth for the clouds on the z-axis
		c.mesh.position.z = -400-Math.random()*400;

		// random scale for each cloud
		var s = 1+Math.random()*2;
		c.mesh.scale.set(s,s,s);

		this.mesh.add(c.mesh);
	}
}

Tree = function () {

	this.mesh = new THREE.Object3D();

	var matTreeLeaves = new THREE.MeshPhongMaterial( { color:Colors.green, shading:THREE.FlatShading});

	var geonTreeBase = new THREE.BoxGeometry( 10,20,10 );
	var matTreeBase = new THREE.MeshBasicMaterial( { color:Colors.brown});
	var treeBase = new THREE.Mesh(geonTreeBase,matTreeBase);
	treeBase.castShadow = true;
	treeBase.receiveShadow = true;
	this.mesh.add(treeBase);

	var geomTreeLeaves1 = new THREE.CylinderGeometry(1, 12*3, 12*3, Math.random()*5+4 );
	var treeLeaves1 = new THREE.Mesh(geomTreeLeaves1,matTreeLeaves);
	treeLeaves1.castShadow = true;
	treeLeaves1.receiveShadow = true;
	treeLeaves1.position.y = 20
	this.mesh.add(treeLeaves1);

	var geomTreeLeaves2 = new THREE.CylinderGeometry( 1, 9*3, 9*3, Math.random()*5+4 );
	var treeLeaves2 = new THREE.Mesh(geomTreeLeaves2,matTreeLeaves);
	treeLeaves2.castShadow = true;
	treeLeaves2.position.y = 40;
	treeLeaves2.receiveShadow = true;
	this.mesh.add(treeLeaves2);

	var geomTreeLeaves3 = new THREE.CylinderGeometry( 1, 6*3, 6*3, Math.random()*5+4);
	var treeLeaves3 = new THREE.Mesh(geomTreeLeaves3,matTreeLeaves);
	treeLeaves3.castShadow = true;
	treeLeaves3.position.y = 55;
	treeLeaves3.receiveShadow = true;
	this.mesh.add(treeLeaves3);

}

Flower = function () {

	this.mesh = new THREE.Object3D();

	var geomStem = new THREE.BoxGeometry( 5,50,5,1,1,1 );
	var matStem = new THREE.MeshPhongMaterial( { color:Colors.green, shading:THREE.FlatShading});
	var stem = new THREE.Mesh(geomStem,matStem);
	stem.castShadow = false;
	stem.receiveShadow = true;
	this.mesh.add(stem);


	var geomPetalCore = new THREE.BoxGeometry(10,10,10,1,1,1);
	var matPetalCore = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading});
	petalCore = new THREE.Mesh(geomPetalCore, matPetalCore);
	petalCore.castShadow = false;
	petalCore.receiveShadow = true;

	var petalColor = petalColors [Math.floor(Math.random()*3)];

	var geomPetal = new THREE.BoxGeometry( 15,20,5,1,1,1 );
	var matPetal = new THREE.MeshBasicMaterial( { color:petalColor});
	geomPetal.vertices[5].y-=4;
	geomPetal.vertices[4].y-=4;
	geomPetal.vertices[7].y+=4;
	geomPetal.vertices[6].y+=4;
	geomPetal.translate(12.5,0,3);

		var petals = [];
		for(var i=0; i<4; i++){	

			petals[i]=new THREE.Mesh(geomPetal,matPetal);
			petals[i].rotation.z = i*Math.PI/2;
			petals[i].castShadow = true;
			petals[i].receiveShadow = true;
		}

	petalCore.add(petals[0],petals[1],petals[2],petals[3]);
	petalCore.position.y = 25;
	petalCore.position.z = 3;
	this.mesh.add(petalCore);

}

var petalColors = [Colors.red, Colors.yellow, Colors.blue];



Forest = function(){

	this.mesh = new THREE.Object3D();

	// Number of Trees
	this.nTrees = 300;

	// Space the consistenly
	var stepAngle = Math.PI*2 / this.nTrees;

	// Create the Trees

	for(var i=0; i<this.nTrees; i++){
	
		var t = new Tree();

		//set rotation and position using trigonometry
		var a = stepAngle*i;
		// this is the distance between the center of the axis and the tree itself
		var h = 605;
		t.mesh.position.y = Math.sin(a)*h;
		t.mesh.position.x = Math.cos(a)*h;		

		// rotate the tree according to its position
		t.mesh.rotation.z = a + (Math.PI/2)*3;

		//Andreas Trigo funtime
		//t.mesh.rotation.z = Math.atan2(t.mesh.position.y, t.mesh.position.x)-Math.PI/2;

		// random depth for the tree on the z-axis
		t.mesh.position.z = 0-Math.random()*600;

		// random scale for each tree
		var s = .3+Math.random()*.75;
		t.mesh.scale.set(s,s,s);

		this.mesh.add(t.mesh);
	}

	// Number of Trees
	this.nFlowers = 350;

	var stepAngle = Math.PI*2 / this.nFlowers;


	for(var i=0; i<this.nFlowers; i++){	

		var f = new Flower();
		var a = stepAngle*i;

		var h = 605;
		f.mesh.position.y = Math.sin(a)*h;
		f.mesh.position.x = Math.cos(a)*h;		

		f.mesh.rotation.z = a + (Math.PI/2)*3;

		f.mesh.position.z = 0-Math.random()*600;

		var s = .1+Math.random()*.3;
		f.mesh.scale.set(s,s,s);

		this.mesh.add(f.mesh);
	}

}

var AirPlane = function() {
	
	this.mesh = new THREE.Object3D();

	// Create the cabin
	var geomCockpit = new THREE.BoxGeometry(80,50,50,1,1,1);
	var matCockpit = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	geomCockpit.vertices[4].y-=10;
	geomCockpit.vertices[4].z+=20;
	geomCockpit.vertices[5].y-=10;
	geomCockpit.vertices[5].z-=20;
	geomCockpit.vertices[6].y+=30;
	geomCockpit.vertices[6].z+=20;
	geomCockpit.vertices[7].y+=30;
	geomCockpit.vertices[7].z-=20;
	var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
	cockpit.castShadow = true;
	cockpit.receiveShadow = true;
	this.mesh.add(cockpit);
	
	// Create the engine
	var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
	var matEngine = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var engine = new THREE.Mesh(geomEngine, matEngine);
	engine.position.x = 40;
	engine.castShadow = true;
	engine.receiveShadow = true;
	this.mesh.add(engine);
	
	// Create the tail
	var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
	var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
	tailPlane.position.set(-35,25,0);
	tailPlane.castShadow = true;
	tailPlane.receiveShadow = true;
	this.mesh.add(tailPlane);
	
	// Create the wing
	var geomSideWing = new THREE.BoxGeometry(40,4,150,1,1,1);
	var matSideWing = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

	var sideWingTop = new THREE.Mesh(geomSideWing, matSideWing);
	var sideWingBottom = new THREE.Mesh(geomSideWing, matSideWing);
	sideWingTop.castShadow = true;
	sideWingTop.receiveShadow = true;
	sideWingBottom.castShadow = true;
	sideWingBottom.receiveShadow = true;

	sideWingTop.position.set(20,12,0);
	sideWingBottom.position.set(20,-3,0);
	this.mesh.add(sideWingTop);
	this.mesh.add(sideWingBottom);

	var geomWindshield = new THREE.BoxGeometry(3,15,20,1,1,1);
	var matWindshield = new THREE.MeshPhongMaterial({color:Colors.white,transparent:true, opacity:.3, shading:THREE.FlatShading});;
	var windshield = new THREE.Mesh(geomWindshield, matWindshield);
	windshield.position.set(5,27,0);

	windshield.castShadow = true;
	windshield.receiveShadow = true;

	this.mesh.add(windshield);

	var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
	geomPropeller.vertices[4].y-=5;
	geomPropeller.vertices[4].z+=5;
	geomPropeller.vertices[5].y-=5;
	geomPropeller.vertices[5].z-=5;
	geomPropeller.vertices[6].y+=5;
	geomPropeller.vertices[6].z+=5;
	geomPropeller.vertices[7].y+=5;
	geomPropeller.vertices[7].z-=5;
	var matPropeller = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
	this.propeller.castShadow = true;
	this.propeller.receiveShadow = true;


	var geomBlade1 = new THREE.BoxGeometry(1,100,10,1,1,1);
	var geomBlade2 = new THREE.BoxGeometry(1,10,100,1,1,1);
	var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	
	var blade1 = new THREE.Mesh(geomBlade1, matBlade);
	blade1.position.set(8,0,0);
	blade1.castShadow = true;
	blade1.receiveShadow = true;

	var blade2 = new THREE.Mesh(geomBlade2, matBlade);
	blade2.position.set(8,0,0);
	blade2.castShadow = true;
	blade2.receiveShadow = true;
	this.propeller.add(blade1, blade2);
	this.propeller.position.set(50,0,0);
	this.mesh.add(this.propeller);

	var wheelProtecGeom = new THREE.BoxGeometry(30,15,10,1,1,1);
	var wheelProtecMat = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var wheelProtecR = new THREE.Mesh(wheelProtecGeom,wheelProtecMat);
	wheelProtecR.position.set(25,-20,25);
	this.mesh.add(wheelProtecR);

	var wheelTireGeom = new THREE.BoxGeometry(24,24,4);
	var wheelTireMat = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	var wheelTireR = new THREE.Mesh(wheelTireGeom,wheelTireMat);
	wheelTireR.position.set(25,-28,25);

	var wheelAxisGeom = new THREE.BoxGeometry(10,10,6);
	var wheelAxisMat = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	var wheelAxis = new THREE.Mesh(wheelAxisGeom,wheelAxisMat);
	wheelTireR.add(wheelAxis);

	this.mesh.add(wheelTireR);

	var wheelProtecL = wheelProtecR.clone();
	wheelProtecL.position.z = -wheelProtecR.position.z ;
	this.mesh.add(wheelProtecL);

	var wheelTireL = wheelTireR.clone();
	wheelTireL.position.z = -wheelTireR.position.z;
	this.mesh.add(wheelTireL);

	var wheelTireB = wheelTireR.clone();
	wheelTireB.scale.set(.5,.5,.5);
	wheelTireB.position.set(-35,-5,0);
	this.mesh.add(wheelTireB);

	var suspensionGeom = new THREE.BoxGeometry(4,20,4);
	suspensionGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,10,0))
	var suspensionMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	var suspension = new THREE.Mesh(suspensionGeom,suspensionMat);
	suspension.position.set(-35,-5,0);
	suspension.rotation.z = -.3;
	this.mesh.add(suspension);

	this.prince = new Prince();
  	this.prince.mesh.position.set(-10,27,0);
  	this.mesh.add(this.prince.mesh);
};

var Fox = function() {
	
	this.mesh = new THREE.Object3D();
	
	var redFurMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

	// Create the Body
	var geomBody = new THREE.BoxGeometry(100,50,50,1,1,1);
	var body = new THREE.Mesh(geomBody, redFurMat);
	body.castShadow = true;
	body.receiveShadow = true;
	this.mesh.add(body);
	
	// Create the Chest
	var geomChest = new THREE.BoxGeometry(50,60,70,1,1,1);
	var chest = new THREE.Mesh(geomChest, redFurMat);
	chest.position.x = 60;
	chest.castShadow = true;
	chest.receiveShadow = true;
	this.mesh.add(chest);

	// Create the Head
	var geomHead = new THREE.BoxGeometry(40,55,50,1,1,1);
	this.head = new THREE.Mesh(geomHead, redFurMat);
	this.head.position.set(80, 35, 0);
	this.head.castShadow = true;
	this.head.receiveShadow = true;

	// Create the Snout
	var geomSnout = new THREE.BoxGeometry(40,30,30,1,1,1);
	var snout = new THREE.Mesh(geomSnout, redFurMat);
	geomSnout.vertices[0].y-=5;
	geomSnout.vertices[0].z+=5;
	geomSnout.vertices[1].y-=5;
	geomSnout.vertices[1].z-=5;
	geomSnout.vertices[2].y+=5;
	geomSnout.vertices[2].z+=5;
	geomSnout.vertices[3].y+=5;
	geomSnout.vertices[3].z-=5;
	snout.castShadow = true;
	snout.receiveShadow = true;
	snout.position.set(30,0,0);
	this.head.add(snout);

	// Create the Nose
	var geomNose = new THREE.BoxGeometry(10,15,20,1,1,1);
	var matNose = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	var nose = new THREE.Mesh(geomNose, matNose);
	nose.position.set(55,0,0);
	this.head.add(nose);

	// Create the Ears
	var geomEar = new THREE.BoxGeometry(10,40,30,1,1,1);
	var earL = new THREE.Mesh(geomEar, redFurMat);
	earL.position.set(-10,40,-18);
	this.head.add(earL);
	earL.rotation.x=-Math.PI/10;
	geomEar.vertices[1].z+=5;
	geomEar.vertices[4].z+=5;
	geomEar.vertices[0].z-=5;
	geomEar.vertices[5].z-=5;

	// Create the Ear Tips
	var geomEarTipL = new THREE.BoxGeometry(10,10,20,1,1,1);
	var matEarTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var earTipL = new THREE.Mesh(geomEarTipL, matEarTip);
	earTipL.position.set(0,25,0);
	earL.add(earTipL);

	var earR = earL.clone();
	earR.position.z = -earL.position.z;
	earR.rotation.x = -	earL.rotation.x;
	this.head.add(earR);

	this.mesh.add(this.head);

	
	// Create the tail
	var geomTail = new THREE.BoxGeometry(80,40,40,2,1,1);
	geomTail.vertices[4].y-=10;
	geomTail.vertices[4].z+=10;
	geomTail.vertices[5].y-=10;
	geomTail.vertices[5].z-=10;
	geomTail.vertices[6].y+=10;
	geomTail.vertices[6].z+=10;
	geomTail.vertices[7].y+=10;
	geomTail.vertices[7].z-=10;
	this.tail = new THREE.Mesh(geomTail, redFurMat);
	this.tail.castShadow = true;
	this.tail.receiveShadow = true;

	// Create the tail Tip
	var geomTailTip = new THREE.BoxGeometry(20,40,40,1,1,1);
	var matTailTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var tailTip = new THREE.Mesh(geomTailTip, matTailTip);
	tailTip.position.set(80,0,0);
	tailTip.castShadow = true;
	tailTip.receiveShadow = true;
	this.tail.add(tailTip);
	this.tail.position.set(-40,10,0);
	geomTail.translate(40,0,0);
	geomTailTip.translate(10,0,0);
	this.tail.rotation.z = Math.PI/1.5;
	this.mesh.add(this.tail);


	// Create the Legs
	var geomLeg = new THREE.BoxGeometry(20,60,20,1,1,1);
	this.legFR = new THREE.Mesh(geomLeg, redFurMat);
	this.legFR.castShadow = true;
	this.legFR.receiveShadow = true;

	// Create the feet
	var geomFeet = new THREE.BoxGeometry(20,20,20,1,1,1);
	var matFeet = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var feet = new THREE.Mesh(geomFeet, matFeet);
	feet.position.set(0,0,0);
	feet.castShadow = true;
	feet.receiveShadow = true;
	this.legFR.add(feet);
	this.legFR.position.set(70,-12,25);
	geomLeg.translate(0,40,0);
	geomFeet.translate(0,80,0);
	this.legFR.rotation.z = 16;
	this.mesh.add(this.legFR);

	this.legFL = this.legFR.clone();
	this.legFL.position.z = -this.legFR.position.z;
	this.legFL.rotation.z = -this.legFR.rotation.z;
	this.mesh.add(this.legFL);

	this.legBR = this.legFR.clone();
	this.legBR.position.x = -(this.legFR.position.x)+50;
	this.legBR.rotation.z = -this.legFR.rotation.z;
	this.mesh.add(this.legBR);

	this.legBL = this.legFL.clone();
	this.legBL.position.x = -(this.legFL.position.x)+50;
	this.legBL.rotation.z = -this.legFL.rotation.z;
	this.mesh.add(this.legBL);

};


var sky;
var forest;
var land;
var orbit;
var airplane;
var sun;
var fox;

var mousePos={x:0, y:0};
var offSet = -600;


function createSky(){
  sky = new Sky();
  sky.mesh.position.y = offSet;
  scene.add(sky.mesh);
}

function createLand(){
  land = new Land();
  land.mesh.position.y = offSet;
  scene.add(land.mesh);
}

function createOrbit(){
  orbit = new Orbit();
  orbit.mesh.position.y = offSet;
  orbit.mesh.rotation.z = -Math.PI/6; 
  scene.add(orbit.mesh);
}

function createForest(){
  forest = new Forest();
  forest.mesh.position.y = offSet;
  scene.add(forest.mesh);
}

function createSun(){ 
	sun = new Sun();
	sun.mesh.scale.set(1,1,.3);
	sun.mesh.position.set(0,-30,-850);
	scene.add(sun.mesh);
}

function createParticles(){
  for (var i=0; i<10; i++){
    var particle = new Particle();
    particlesPool.push(particle);
  }
  particlesHolder = new ParticlesHolder();
  scene.add(particlesHolder.mesh)
}

function createPlane(){ 
	airplane = new AirPlane();
	airplane.mesh.scale.set(.35,.35,.35);
	airplane.mesh.position.set(-40,110,-250);
	// airplane.mesh.rotation.z = Math.PI/15;
	scene.add(airplane.mesh);
}

function createFox(){ 
	fox = new Fox();
	fox.mesh.scale.set(.1,.1,.1);
	fox.mesh.position.set(-40,5,-250);
	scene.add(fox.mesh);
}

function updateFox() {
	var targetX = normalize(mousePos.x,-.75,.75,-100, -20);
	fox.mesh.position.x += (targetX-airplane.mesh.position.x)*0.1;
	fox.head.rotation.z = Math.sin(Date.now() * 0.01) * Math.PI * 0.1;
	fox.tail.rotation.z = 3.14 + Math.sin(Date.now() * 0.01) * Math.PI * 0.1;
	fox.legFR.rotation.z = 3.14 + Math.sin(Date.now() * 0.012) * Math.PI * 0.1;
	fox.legBR.rotation.z = 3.14 - Math.sin(Date.now() * 0.012) * Math.PI * 0.1;
	fox.legFL.rotation.z = 3.14 + Math.sin(Date.now() * 0.012) * Math.PI * 0.1;
	fox.legBL.rotation.z = 3.14 - Math.sin(Date.now() * 0.012) * Math.PI * 0.1;
}

function foxLookUp() {	
	fox.head.rotation.z = 0.5 + Math.sin(Date.now() * 0.012) * Math.PI * 0.1;
}

function updatePlane() {
	var targetY = normalize(mousePos.y,-.75,.75, 50, 190);
	var targetX = normalize(mousePos.x,-.75,.75,-100, -20);
	
	// Move the plane at each frame by adding a fraction of the remaining distance
	airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;

	airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*0.1;

	// Rotate the plane proportionally to the remaining distance
	airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*0.0128;
	airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*0.0064;
	airplane.mesh.rotation.y = (airplane.mesh.position.x-targetX)*0.0064;

	airplane.propeller.rotation.x += 0.3;
	airplane.prince.updateHairs();
	
}
function updateSeeds(){
	var seedPos = airplane.mesh.position.clone();
	if (seedPos.y < 70) {
		foxLookUp();
	}
	particlesHolder.spawnParticles(seedPos, 1, Colors.lightgreen, 1);
}
function normalize(v,vmin,vmax,tmin, tmax){
	var nv = Math.max(Math.min(v,vmax), vmin);
	var dv = vmax-vmin;
	var pc = (nv-vmin)/dv;
	var dt = tmax-tmin;
	var tv = tmin + (pc*dt);
	return tv;

}

function loop(){
  land.mesh.rotation.z += .005;
  orbit.mesh.rotation.z += .001;
  sky.mesh.rotation.z += .003;
  forest.mesh.rotation.z += .005;
  updatePlane();
  updateFox();
  updateSeeds();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleMouseMove (event) {
	var tx = -1 + (event.clientX / WIDTH)*2;
	var ty = 1 - (event.clientY / HEIGHT)*2;
	mousePos = {x:tx, y:ty};
}


function init(event) {
	createScene();
	createLights();
	createPlane();
	createOrbit();
	createSun();
	createLand();
	createForest();
	createSky();
	createFox();
	createParticles();
	document.addEventListener('mousemove', handleMouseMove, false);

	loop();
}

window.addEventListener('load', init, false);

//load this for English script
function createBook(speed, lang){
var i = 0;
var txt ={};
txt.english = `It was then that the fox appeared. ~\
\"Good morning,\" said the fox. ~\
\"Good morning,\" the little prince responded politely, although when he turned around he saw nothing. ~\
\"I am right here,\" the voice said, \"under the apple tree.\" ~\
\"Who are you?\" asked the little prince, and added, \"You are very pretty to look at.\" ~\
\"I am a fox,\" the fox said. ~\
\"Come and play with me,\" proposed the little prince. \"I am so unhappy.\" ~\
\"I cannot play with you,\" the fox said. \"I am not tamed.\" ~\
\"Ah! Please excuse me,\" said the little prince. ~\
But, after some thought, he added: ~\
\"What does that mean--'tame'?\" ~\
\"You do not live here,\" said the fox. \"What is it that you are looking for?\" ~\
\"I am looking for men,\" said the little prince. \"What does that mean--'tame'?\" ~\
\"Men,\" said the fox. \"They have guns, and they hunt. It is very disturbing. ~\ They also raise chickens. These are their only interests.~\ Are you looking for chickens?\" ~\
\"No,\" said the little prince. \"I am looking for friends. What does that mean--'tame'?\" ~\
\"It is an act too often neglected,\" said the fox. \"It means to establish ties.\" ~\
\"'To establish ties'?\" ~\
\"Just that,\" said the fox. \"To me, you are still nothing more than a little boy who is just like a hundred thousand other little boys.~\ And I have no need of you. ~\ And you, on your part, have no need of me. ~\ To you, I am nothing more than a fox like a hundred thousand other foxes.~\ But if you tame me, then we shall need each other.~\ To me, you will be unique in all the world. ~\ To you, I shall be unique in all the world . . .\" ~\
\"I am beginning to understand,\" said the little prince. \"There is a flower . . . I think that she has tamed me . . .\" ~\
\"It is possible,\" said the fox. \"On the Earth one sees all sorts of things.\" ~\
\"Oh, but this is not on the Earth!\" said the little prince. ~\
The fox seemed perplexed, and very curious. ~\
\"On another planet?\" ~\
\"Yes.\" ~\
\"Are there hunters on that planet?\" ~\
\"No.\" ~\
\"Ah, that is interesting! Are there chickens?\" ~\
\"No.\" ~\
\"Nothing is perfect,\" sighed the fox. ~\
But he came back to his idea. ~\
\"My life is very monotonous,\" the fox said. \"I hunt chickens; men hunt me. ~\ All the chickens are just alike, and all the men are just alike. ~\ And, in consequence, I am a little bored. ~\ But if you tame me, it will be as if the sun came to shine on my life.~\ I shall know the sound of a step that will be different from all the others. ~\ Other steps send me hurrying back underneath the ground.~\ Yours will call me, like music, out of my burrow.~\ And then look: you see the grain-fields down yonder?~\ I do not eat bread. Wheat is of no use to me.~\ The wheat fields have nothing to say to me. ~\ And that is sad. But you have hair that is the color of gold. ~\ Think how wonderful that will be when you have tamed me! ~\ The grain, which is also golden, will bring me back the thought of you. ~\ And I shall love to listen to the wind in the wheat . . .\" ~\
The fox gazed at the little prince, for a long time. ~\
\"Please--tame me!\" he said. ~\
\"I want to, very much,\" the little prince replied. \"But I have not much time. ~\ I have friends to discover, and a great many things to understand.\" ~\
\"One only understands the things that one tames,\" said the fox. \"Men have no more time to understand anything. ~\ They buy things all ready made at the shops. ~\ But there is no shop anywhere where one can buy friendship, ~\ and so men have no friends any more. If you want a friend, tame me . . .\" ~\
\"What must I do, to tame you?\" asked the little prince. ~\
\"You must be very patient,\" replied the fox. \"First you will sit down at a little distance from me--like that--in the grass. I shall look at you out of the corner of my eye, and you will say nothing. Words are the source of misunderstandings. But you will sit a little closer to me, every day . . .\" ~\
The next day the little prince came back. ~\
\"It would have been better to come back at the same hour,\" said the fox. \"If, for example, you come at four o'clock in the afternoon, ~\ then at three o'clock I shall begin to be happy. ~\ I shall feel happier and happier as the hour advances.~\ At four o'clock, I shall already be worrying and jumping about.~\ I shall show you how happy I am! But if you come at just any time,~\ I shall never know at what hour my heart is to be ready to greet you . . . ~\ One must observe the proper rites . . .\" ~\
\"What is a rite?\" asked the little prince. ~\
\"Those also are actions too often neglected,\" said the fox. \"They are what make one day different from other days, one hour from other hours.~\ There is a rite, for example, among my hunters.~\ Every Thursday they dance with the village girls. ~\ So Thursday is a wonderful day for me! ~\ I can take a walk as far as the vineyards. ~\ But if the hunters danced at just any time, every day would be like every other day, ~\ and I should never have any vacation at all.\" ~\
So the little prince tamed the fox. And when the hour of his departure drew near-- ~\
\"Ah,\" said the fox, \"I shall cry.\" ~\
\"It is your own fault,\" said the little prince. \"I never wished you any sort of harm; but you wanted me to tame you . . .\" ~\
\"Yes, that is so,\" said the fox. ~\
\"But now you are going to cry!\" said the little prince. ~\
\"Yes, that is so,\" said the fox. ~\
\"Then it has done you no good at all!\" ~\
\"It has done me good,\" said the fox, \"because of the color of the wheat fields.\" And then he added: ~\
\"Go and look again at the roses. You will understand now that yours is unique in all the world. Then come back to say goodbye to me, and I will make you a present of a secret.\" ~\
The little prince went away, to look again at the roses. ~\
\"You are not at all like my rose,\" he said. \"As yet you are nothing. ~\ No one has tamed you, and you have tamed no one. ~\ You are like my fox when I first knew him. ~\ He was only a fox like a hundred thousand other foxes. But I have made him my friend, and now he is unique in all the world.\" ~\
And the roses were very much embarassed. ~\
\"You are beautiful, but you are empty,\" he went on. \"One could not die for you. To be sure, an ordinary passerby would think that my rose looked just like you--the rose that belongs to me. But in herself alone she is more important than all the hundreds of you other roses: because it is she that I have watered; because it is she that I have put under the glass globe; because it is she that I have sheltered behind the screen; because it is for her that I have killed the caterpillars (except the two or three that we saved to become butterflies); because it is she that I have listened to, when she grumbled, or boasted, or ever sometimes when she said nothing. Because she is my rose. ~\
And he went back to meet the fox. ~\
\"Goodbye,\" he said. ~\
\"Goodbye,\" said the fox. \"And now here is my secret, a very simple secret: ~\ It is only with the heart that one can see rightly; ~\ what is essential is invisible to the eye.\" ~\
\"What is essential is invisible to the eye,\" the little prince repeated, so that he would be sure to remember. ~\
\"It is the time you have wasted for your rose that makes your rose so important.\" ~\
\"It is the time I have wasted for my rose--\" said the little prince, so that he would be sure to remember. ~\
\"Men have forgotten this truth,\" said the fox. \"But you must not forget it. ~\ You become responsible, forever, for what you have tamed. ~\ You are responsible for your rose . . .\" ~\
\"I am responsible for my rose,\" the little prince repeated, so that he would be sure to remember.`;
txt.french = `C'est alors qu'apparut le renard.~\
-Bonjour, dit le renard.~\
-Bonjour, répondit poliment le petit prince, qui se tourna mais ne vit rien.~\
-Je suis là, dit la voix, sous le pommier.~\
-Qui es-tu? dit le petit prince. Tu es bien joli…~\
-Je suis un renard, dit le renard.~\
-Viens jouer avec moi, lui proposa le petit prince. Je suis tellement triste…~\
-Je ne puis pas jouer avec toi, dit le renard. Je ne suis pas apprivoisé~\
-Ah! Pardon, fit le petit prince.~\
Mais après réflexion, il ajouta :~\
-Qu'est-ce que signifie "apprivoiser"?~\
-Tu n'es pas d'ici, dit le renard, que cherches-tu?~\
-Je cherche les hommes, dit le petit prince.Qu'est-ce que signifie "apprivoiser"?~\
-Les hommes, dit le renard, ils ont des fusils et ils chassent.~\ C'est bien gênant! ~\ Il élèvent aussi des poules. C'est leur seul intérêt. Tu cherches des poules?~\
-Non, dit le petit prince. Je cherche des amis. Qu'est-ce que signifie "apprivoiser"?~\
-C'est une chose trop oubliée, dit le renard. Ca signifie "Créer des liens…"~\
-Créer des liens?~\
-Bien sûr,dit le renard. ~\ Tu n'es encore pour moi qu'un petit garçon tout semblable à cent mille petits garçons. ~\ Et je n'ai pas besoin de toi. Et tu n'a pas besoin de moi non plus. ~\ Je ne suis pour toi qu'un renard semblable à cent mille renards. ~\ Mais, si tu m'apprivoises, nous aurons besoin l'un de l'autre. ~\ Tu seras pour moi unique au monde. ~\ Je serai pour toi unique au monde…~\
-Je commence à comprendre, dit le petit prince. Il y a une fleur… je crois qu'elle m'a apprivoisé…~\
-C'est possible, dit le renard. On voit sur la Terre toutes sortes de choses…~\
-Oh! ce n'est pas sur la Terre, dit le petit prince. Le renard parut très intrigué :~\
-Sur une autre planète ?~\
-Oui.~\
-Il y a des chasseurs sur cette planète-là ?~\
-Non.~\
-Ca, c'est intéressant! Et des poules ?~\
-Non.~\
-Rien n'est parfait, soupira le renard.~\
Mais le renard revint à son idée :~\
-Ma vie est monotone. Je chasse les poules, les hommes me chassent.~\ Toutes les poules se ressemblent, et tous les hommes se ressemblent.~\ Je m'ennuie donc un peu. ~\ Mais si tu m'apprivoises, ma vie sera comme ensoleillée. ~\ Je connaîtrai un bruit de pas qui sera différent de tous les autres. ~\ Les autres pas me font rentrer sous terre. Le tien m'appelera hors du terrier, ~\ comme une musique. Et puis regarde! ~\ Tu vois, là-bas, les champs de blé? ~\ Je ne mange pas de pain. Le blé pour moi est inutile. Les champs de blé ne me rappellent rien. ~\ Et ça, c'est triste! Mais tu a des cheveux couleur d'or. ~\ Alors ce sera merveilleux quand tu m'aura apprivoisé! ~\ Le blé, qui est doré, me fera souvenir de toi. Et j'aimerai le bruit du vent dans le blé…~\
Le renard se tut et regarda longtemps le petit prince :~\
-S'il te plaît… apprivoise-moi! dit-il.~\
-Je veux bien, répondit le petit prince, mais je n'ai pas beaucoup de temps.~\ J'ai des amis à découvrir et beaucoup de choses à connaître.~\
-On ne connaît que les choses que l'on apprivoise, dit le renard.~\ Les hommes n'ont plus le temps de rien connaître.~\ Il achètent des choses toutes faites chez les marchands.~\ Mais comme il n'existe point de marchands d'amis, ~\ les hommes n'ont plus d'amis. Si tu veux un ami, apprivoise-moi!~\
-Que faut-il faire? dit le petit prince.~\
-Il faut être très patient, répondit le renard.~\ Tu t'assoiras d'abord un peu loin de moi, comme ça, dans l'herbe. ~\ Je te regarderai du coin de l'oeil et tu ne diras rien. ~\ Le langage est source de malentendus. Mais, chaque jour, tu pourras t'asseoir un peu plus près…~\
Le lendemain revint le petit prince.~\
-Il eût mieux valu revenir à la même heure, dit le renard.~\ Si tu viens, par exemple, à quatre heures de l'après-midi, ~\ dès trois heures je commencerai d'être heureux. ~\ Plus l'heure avancera, plus je me sentirai heureux. ~\ à quatre heures, déjà, je m'agiterai et m'inquiéterai; ~\ je découvrira le prix du bonheur! Mais si tu viens n'importe quand, ~\ je ne saurai jamais à quelle heure m'habiller le coeur… il faut des rites.~\
-Qu'est-ce qu'un rite? dit le petit prince.~\
-C'est quelque chose trop oublié, dit le renard.~\ C'est ce qui fait qu'un jour est différent des autres jours, une heure, des autres heures. ~\ Il y a un rite, par exemple, chez mes chasseurs. ~\ Ils dansent le jeudi avec les filles du village. ~\ Alors le jeudi est jour merveilleux! ~\ Je vais me promener jusqu'à la vigne. Si les chasseurs dansaient n'importe quand, ~\ les jours se ressembleraient tous, et je n'aurait point de vacances.~\
Ainsi le petit prince apprivoisa le renard.~\ Et quand l'heure du départ fut proche :~\
-Ah! dit le renard… je preurerai.~\
-C'est ta faute, dit le petit prince,~\ je ne te souhaitais point de mal, mais tu as voulu que je t'apprivoise…~\
-Bien sûr, dit le renard.~\
-Mais tu vas pleurer! dit le petit prince.~\
-Bien sûr, dit le renard.~\
-Alors tu n'y gagnes rien!~\
-J'y gagne, dit le renard, à cause de la couleur du blé.~\
Puis il ajouta :~\
-Va revoir les roses.~\ Tu comprendras que la tienne est unique au monde. ~\ Tu reviendras me dire adieu, et je te ferai cadeau d'un secret.~\
Le petit prince s'en fut revoir les roses.~\
-Vous n'êtes pas du tout semblables à ma rose,~\ vous n'êtes rien encore, leur dit-il. ~\ Personne ne vous a apprivoisé et vous n'avez apprivoisé personne. Vous êtes comme était mon renard. Ce n'était qu'un renard semblable à cent mille autres. Mais j'en ai fait mon ami, et il est maintenant unique au monde.~\
Et les roses étaient gênées.~\
-Vous êtes belles mais vous êtes vides, leur dit-il encore. ~\ On ne peut pas mourir pour vous.~\ Bien sûr, ma rose à moi, un passant ordinaire croirait qu'elle vous ressemble. Mais à elle seule elle est plus importante que vous toutes, puisque c'est elle que j'ai arrosée. Puisque c'est elle que j'ai abritée par le paravent. Puisque c'est elle dont j'ai tué les chenilles (sauf les deux ou trois pour les papillons). Puisque c'est elle que j'ai écoutée se plaindre, ou se vanter, ou même quelquefois se taire. Puisque c'est ma rose.
Et il revint vers le renard :~\
-Adieu, dit-il…~\
-Adieu, dit le renard. Voici mon secret. ~\ Il est très simple : on ne voit bien qu'avec le coeur.~\
 L'essentiel est invisible pour les yeux.~\
-L'essentiel est invisible pour les yeux, répéta le petit prince, afin de se souvenir.~\
-C'est le temps que tu a perdu pour ta rose qui fait ta rose si importante.~\
-C'est le temps que j'ai perdu pour ma rose… fit le petit prince, afin de se souvenir.~\
-Les hommes on oublié cette vérité, dit le renard.~\ Mais tu ne dois pas l'oublier. ~\ Tu deviens responsable pour toujours de ce que tu as apprivoisé. Tu es responsable de ta rose…~\
-Je suis responsable de ma rose… répéta le petit prince, afin de se souvenir.`;

var book = document.getElementById("book");
var bookcontent = txt[lang];
function typeWriter() {
  if (i < bookcontent.length) {
  	if (bookcontent.charAt(i)==='~'){
  		book.innerHTML='';
  	}
  	else{
    book.innerHTML += bookcontent.charAt(i);
	}
    i++;
    setTimeout(typeWriter, speed);
  }
}

typeWriter();
}