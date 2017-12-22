//THREEJS RELATED ADDITION AND VARIABLES
THREE.SubdivisionModifier = function ( subdivisions ) {

  this.subdivisions = ( subdivisions === undefined ) ? 1 : subdivisions;

};

// Applies the "modify" pattern
THREE.SubdivisionModifier.prototype.modify = function ( geometry ) {

  var repeats = this.subdivisions;

  while ( repeats -- > 0 ) {

    this.smooth( geometry );

  }

  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

};

( function() {

  // Some constants
  var WARNINGS = ! true; // Set to true for development
  var ABC = [ 'a', 'b', 'c' ];


  function getEdge( a, b, map ) {

    var vertexIndexA = Math.min( a, b );
    var vertexIndexB = Math.max( a, b );

    var key = vertexIndexA + "_" + vertexIndexB;

    return map[ key ];

  }


  function processEdge( a, b, vertices, map, face, metaVertices ) {

    var vertexIndexA = Math.min( a, b );
    var vertexIndexB = Math.max( a, b );

    var key = vertexIndexA + "_" + vertexIndexB;

    var edge;

    if ( key in map ) {

      edge = map[ key ];

    } else {

      var vertexA = vertices[ vertexIndexA ];
      var vertexB = vertices[ vertexIndexB ];

      edge = {

        a: vertexA, // pointer reference
        b: vertexB,
        newEdge: null,
        faces: [] // pointers to face

      };

      map[ key ] = edge;

    }

    edge.faces.push( face );

    metaVertices[ a ].edges.push( edge );
    metaVertices[ b ].edges.push( edge );


  }

  function generateLookups( vertices, faces, metaVertices, edges ) {

    var i, il, face, edge;

    for ( i = 0, il = vertices.length; i < il; i ++ ) {

      metaVertices[ i ] = { edges: [] };

    }

    for ( i = 0, il = faces.length; i < il; i ++ ) {

      face = faces[ i ];

      processEdge( face.a, face.b, vertices, edges, face, metaVertices );
      processEdge( face.b, face.c, vertices, edges, face, metaVertices );
      processEdge( face.c, face.a, vertices, edges, face, metaVertices );

    }

  }

  function newFace( newFaces, a, b, c ) {

    newFaces.push( new THREE.Face3( a, b, c ) );

  }

  function midpoint( a, b ) {

    return ( Math.abs( b - a ) / 2 ) + Math.min( a, b );

  }

  function newUv( newUvs, a, b, c ) {

    newUvs.push( [ a.clone(), b.clone(), c.clone() ] );

  }

  /////////////////////////////

  // Performs one iteration of Subdivision
  THREE.SubdivisionModifier.prototype.smooth = function ( geometry ) {

    var tmp = new THREE.Vector3();

    var oldVertices, oldFaces, oldUvs;
    var newVertices, newFaces, newUVs = [];

    var n, l, i, il, j, k;
    var metaVertices, sourceEdges;

    // new stuff.
    var sourceEdges, newEdgeVertices, newSourceVertices;

    oldVertices = geometry.vertices; // { x, y, z}
    oldFaces = geometry.faces; // { a: oldVertex1, b: oldVertex2, c: oldVertex3 }
    oldUvs = geometry.faceVertexUvs[ 0 ];

    var hasUvs = oldUvs !== undefined && oldUvs.length > 0;

    /******************************************************
     *
     * Step 0: Preprocess Geometry to Generate edges Lookup
     *
     *******************************************************/

    metaVertices = new Array( oldVertices.length );
    sourceEdges = {}; // Edge => { oldVertex1, oldVertex2, faces[]  }

    generateLookups( oldVertices, oldFaces, metaVertices, sourceEdges );


    /******************************************************
     *
     *  Step 1.
     *  For each edge, create a new Edge Vertex,
     *  then position it.
     *
     *******************************************************/

    newEdgeVertices = [];
    var other, currentEdge, newEdge, face;
    var edgeVertexWeight, adjacentVertexWeight, connectedFaces;

    for ( i in sourceEdges ) {

      currentEdge = sourceEdges[ i ];
      newEdge = new THREE.Vector3();

      edgeVertexWeight = 3 / 8;
      adjacentVertexWeight = 1 / 8;

      connectedFaces = currentEdge.faces.length;

      // check how many linked faces. 2 should be correct.
      if ( connectedFaces != 2 ) {

        // if length is not 2, handle condition
        edgeVertexWeight = 0.5;
        adjacentVertexWeight = 0;

        if ( connectedFaces != 1 ) {

          if ( WARNINGS ) console.warn( 'Subdivision Modifier: Number of connected faces != 2, is: ', connectedFaces, currentEdge );

        }

      }

      newEdge.addVectors( currentEdge.a, currentEdge.b ).multiplyScalar( edgeVertexWeight );

      tmp.set( 0, 0, 0 );

      for ( j = 0; j < connectedFaces; j ++ ) {

        face = currentEdge.faces[ j ];

        for ( k = 0; k < 3; k ++ ) {

          other = oldVertices[ face[ ABC[ k ] ] ];
          if ( other !== currentEdge.a && other !== currentEdge.b ) break;

        }

        tmp.add( other );

      }

      tmp.multiplyScalar( adjacentVertexWeight );
      newEdge.add( tmp );

      currentEdge.newEdge = newEdgeVertices.length;
      newEdgeVertices.push( newEdge );

      // console.log(currentEdge, newEdge);

    }

    /******************************************************
     *
     *  Step 2.
     *  Reposition each source vertices.
     *
     *******************************************************/

    var beta, sourceVertexWeight, connectingVertexWeight;
    var connectingEdge, connectingEdges, oldVertex, newSourceVertex;
    newSourceVertices = [];

    for ( i = 0, il = oldVertices.length; i < il; i ++ ) {

      oldVertex = oldVertices[ i ];

      // find all connecting edges (using lookupTable)
      connectingEdges = metaVertices[ i ].edges;
      n = connectingEdges.length;

      if ( n == 3 ) {

        beta = 3 / 16;

      } else if ( n > 3 ) {

        beta = 3 / ( 8 * n ); // Warren's modified formula

      }

      // Loop's original beta formula
      // beta = 1 / n * ( 5/8 - Math.pow( 3/8 + 1/4 * Math.cos( 2 * Math. PI / n ), 2) );

      sourceVertexWeight = 1 - n * beta;
      connectingVertexWeight = beta;

      if ( n <= 2 ) {

        // crease and boundary rules
        // console.warn('crease and boundary rules');

        if ( n == 2 ) {

          if ( WARNINGS ) console.warn( '2 connecting edges', connectingEdges );
          sourceVertexWeight = 3 / 4;
          connectingVertexWeight = 1 / 8;

          // sourceVertexWeight = 1;
          // connectingVertexWeight = 0;

        } else if ( n == 1 ) {

          if ( WARNINGS ) console.warn( 'only 1 connecting edge' );

        } else if ( n == 0 ) {

          if ( WARNINGS ) console.warn( '0 connecting edges' );

        }

      }

      newSourceVertex = oldVertex.clone().multiplyScalar( sourceVertexWeight );

      tmp.set( 0, 0, 0 );

      for ( j = 0; j < n; j ++ ) {

        connectingEdge = connectingEdges[ j ];
        other = connectingEdge.a !== oldVertex ? connectingEdge.a : connectingEdge.b;
        tmp.add( other );

      }

      tmp.multiplyScalar( connectingVertexWeight );
      newSourceVertex.add( tmp );

      newSourceVertices.push( newSourceVertex );

    }


    /******************************************************
     *
     *  Step 3.
     *  Generate Faces between source vertices
     *  and edge vertices.
     *
     *******************************************************/

    newVertices = newSourceVertices.concat( newEdgeVertices );
    var sl = newSourceVertices.length, edge1, edge2, edge3;
    newFaces = [];

    var uv, x0, x1, x2;
    var x3 = new THREE.Vector2();
    var x4 = new THREE.Vector2();
    var x5 = new THREE.Vector2();

    for ( i = 0, il = oldFaces.length; i < il; i ++ ) {

      face = oldFaces[ i ];

      // find the 3 new edges vertex of each old face

      edge1 = getEdge( face.a, face.b, sourceEdges ).newEdge + sl;
      edge2 = getEdge( face.b, face.c, sourceEdges ).newEdge + sl;
      edge3 = getEdge( face.c, face.a, sourceEdges ).newEdge + sl;

      // create 4 faces.

      newFace( newFaces, edge1, edge2, edge3 );
      newFace( newFaces, face.a, edge1, edge3 );
      newFace( newFaces, face.b, edge2, edge1 );
      newFace( newFaces, face.c, edge3, edge2 );

      // create 4 new uv's

      if ( hasUvs ) {

        uv = oldUvs[ i ];

        x0 = uv[ 0 ];
        x1 = uv[ 1 ];
        x2 = uv[ 2 ];

        x3.set( midpoint( x0.x, x1.x ), midpoint( x0.y, x1.y ) );
        x4.set( midpoint( x1.x, x2.x ), midpoint( x1.y, x2.y ) );
        x5.set( midpoint( x0.x, x2.x ), midpoint( x0.y, x2.y ) );

        newUv( newUVs, x3, x4, x5 );
        newUv( newUVs, x0, x3, x5 );

        newUv( newUVs, x1, x4, x3 );
        newUv( newUVs, x2, x5, x4 );

      }

    }

    // Overwrite old arrays
    geometry.vertices = newVertices;
    geometry.faces = newFaces;
    if ( hasUvs ) geometry.faceVertexUvs[ 0 ] = newUVs;

    // console.log('done');

  };

} )(); 
var Colors = {
    red:0x129346,
    white:0xd8d0d1,
    pink:0xF5986E,
    lightbrown:0x59332e,
    brown:0x23190f,
    blue:0x68c3c0,
    grassgreen: 0x007B0C,
    darkgreen: 0x005C09,
    yellow: 0xfff68f,
    wheatgold: 0xFDE154,
    blackish: 0x13110E,
    black: 0x000000,
};
var scene,
    camera, fieldOfView, aspectRatio, nearPlane, farPlane,
    gobalLight, shadowLight, backLight,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH, windowHalfX, windowHalfY,
    mousePos = { x: 0, y: 0 },
    oldMousePos = {x:0, y:0},
    ballWallDepth = 28;


//3D OBJECTS VARIABLES

var pet, land, island;
var modifier = new THREE.SubdivisionModifier(2);
//INIT THREE JS, SCREEN AND MOUSE EVENTS

function initScreenAnd3D() {
  
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 50;
  nearPlane = 1;
  farPlane = 2000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
    );
  camera.position.x = 0;
  camera.position.z = 300;
  camera.position.y = 250;
  camera.lookAt(new THREE.Vector3(0, 60, 0));

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;
  
  container = document.getElementById('world');
  container.appendChild(renderer.domElement);
  
  window.addEventListener('resize', handleWindowResize, false);
  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  

}

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  mousePos = {x:event.clientX, y:event.clientY};
} 

function handleTouchMove(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
    mousePos = {x:event.touches[0].pageX, y:event.touches[0].pageY};
  }
}

function createLights() {
  globalLight = new THREE.HemisphereLight(0xffffff, 0xffffff, .5)
  
  shadowLight = new THREE.DirectionalLight(0xffffff, .9);
  shadowLight.position.set(200, 200, 200);
  shadowLight.castShadow = true;
  shadowLight.shadowDarkness = .2;
  shadowLight.shadow.mapSize.width = shadowLight.shadow.mapSize.height = 2048;
  
  backLight = new THREE.DirectionalLight(0xffffff, .4);
  backLight.position.set(-100, 100, 100);
  backLight.castShadow = true;
  backLight.shadowDarkness = .1;
  backLight.shadow.mapSize.width = shadowLight.shadow.mapSize.height = 2048;
  
  scene.add(globalLight);
  scene.add(shadowLight);
  scene.add(backLight);
}
function floatInWater(obj) {  
  obj.position.z = obj.position.z + Math.sin(Date.now() * 0.004) * Math.PI * 0.1;
}

Water = function(){
  var geom = new THREE.CylinderGeometry(600,600,200,60,20);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
  geom.mergeVertices();
  var l = geom.vertices.length;

  this.waves = [];

  for (var i=0;i<l;i++){
    var v = geom.vertices[i];
    this.waves.push({y:v.y,
                     x:v.x,
                     z:v.z,
                     ang:Math.random()*Math.PI*2,
                     amp:2 + Math.random()*15,
                     speed:0.008 + Math.random()*0.022
                    });
  };
  var mat = new THREE.MeshPhongMaterial({
    color:Colors.blue,
    transparent:true,
    opacity:.48,
    shading:THREE.FlatShading,
  });
  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.receiveShadow = true;

}

Water.prototype.moveWaves = function (){
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;
  for (var i=0; i<l; i++){
    var v = verts[i];
    var vprops = this.waves[i];
    v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
    vprops.ang += vprops.speed;
  }
  this.mesh.geometry.verticesNeedUpdate=true;
  //land.mesh.rotation.z += .0015;
}
function createWater(){
  land = new Water();
  land.mesh.position.y = -620;
  scene.add(land.mesh);
}
function createPet() {
  pet = new Cat();
  scene.add(pet.threeGroup);
}
//island
function createIsland() {
  var goldenMat = new THREE.MeshLambertMaterial ({
    color: Colors.wheatgold
  });
  var islandGeom = new THREE.BoxGeometry(120,40,140);
  modifier.modify(islandGeom);
  island = new THREE.Mesh(islandGeom, goldenMat);
  island.rotation.y = Math.PI/2;
  island.rotation.z = -Math.PI/6;
  island.position.y=-38;
  island.position.z=-30;
  island.receiveShadow=false;
  scene.add(island);
}

Cat = function(){
  this.threeGroup = new THREE.Group();
  
  var yellowMat = new THREE.MeshLambertMaterial ({
    color: Colors.yellow});
  var blackishMat = new THREE.MeshLambertMaterial ({
    color: Colors.blackish});
  var pinkMat = new THREE.MeshLambertMaterial ({
    color: Colors.pink});
  var redMat = new THREE.MeshLambertMaterial ({
    color: Colors.red});
  var whiteMat = new THREE.MeshLambertMaterial ({
    color: Colors.white});
  var blackMat = new THREE.MeshLambertMaterial ({
    color: Colors.black});
  var brownMat = new THREE.MeshLambertMaterial ({
    color: Colors.brown});
  var lightBrownMat = new THREE.MeshLambertMaterial ({
    color: Colors.lightbrown});
  var goldenMat = new THREE.MeshLambertMaterial ({
    color: Colors.wheatgold});

  this.handHeight = 10;
  this.bodyHeight = 80;
  this.armHeight = ((this.bodyHeight * 3/5) - this.handHeight)/2 ;
  this.faceHeight = 30;
  this.shouldersPosition = new THREE.Vector3(0,this.armHeight*2 + this.handHeight, 0);
  this.isAttacking = false;
  this.isFootReplacing = false;
  this.isBlinking = false;
  this.footUsed = "left";
  this.transferPower = {x:0,y:0};
  
  
  // body

  this.body = new THREE.Group();

  // torso

  var torsoGeom = new THREE.CylinderGeometry(0, 26 ,this.bodyHeight,3,1);
  this.torso = new THREE.Mesh(torsoGeom,brownMat);
  this.torso.geometry.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/3));
  this.torso.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,-this.bodyHeight/2,0));
  
  // chest

  var chestGeom = new THREE.CylinderGeometry(6,0, 17, 3);
  chestGeom.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/3));
  chestGeom.applyMatrix(new THREE.Matrix4().makeScale(1,1,.3));
  this.chest = new THREE.Mesh(chestGeom, whiteMat);
  this.chest.position.set(0,-30,1);

  // head
  this.head = new THREE.Group();

  var faceGeom = new THREE.SphereGeometry(this.faceHeight-9,6,8);
  this.face = new THREE.Mesh(faceGeom,blackishMat);
  this.face.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,this.faceHeight/2,0));
  this.face.geometry.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/6));
  this.face.scale.set(1.12,1,1);

  // scarf
  var scarfGeom = new THREE.CylinderGeometry(10,9,9,10, 1);
  this.scarf1 = new THREE.Mesh(scarfGeom, pinkMat);
  this.scarf1.material.side = THREE.DoubleSide;
  this.scarf1.position.y = -2;
  this.scarf1.position.z = 0;
  this.scarf1.rotation.z = .4;
  this.scarf1.rotation.y = Math.PI/3;
  
  this.scarf2 = this.scarf1.clone();
  this.scarf2.scale.set(.9,.7,.9);
  this.scarf2.position.y = -17;
  this.scarf2.rotation.z = -.2;

  var scarfGeom2 = new THREE.BoxGeometry(50,2,10);
  this.scarf3 = new THREE.Mesh(scarfGeom2, pinkMat);
  this.scarf3.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(25,0,0));
  this.scarf3.position.set(3,-15,2);
  this.scarf3.rotation.y = 1.2;
  this.scarf3.rotation.z = -1;

  
  this.head.add(this.scarf1);
  this.torso.add(this.scarf2);
  this.torso.add(this.scarf3);
  this.torso.add(this.chest);

  
  var skewMatrixBody = new THREE.Matrix4();
  skewMatrixBody.set(   1,    0,    0,    0,
                        0,    1,    0,    0,
                        0,    0.20,    1,    0,
                        0,    0,    0,    1  );
  

  this.torso.geometry.applyMatrix(skewMatrixBody);
  this.chest.geometry.applyMatrix(skewMatrixBody);
  

  this.body.add(this.torso);
  this.body.position.y = this.bodyHeight;

  
  // Whiskers
  var whiskerGeom = new THREE.BoxGeometry(16, .2,.2);

  this.whisker1 = new THREE.Mesh(whiskerGeom, lightBrownMat);
  this.whisker1.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-7,0,0));
  this.whisker1.position.set(-6,8,18);
  this.whisker1.rotation.z = Math.PI/12;

  this.whisker2 = this.whisker1.clone();
  this.whisker2.position.y = 6;
  
  this.whisker3 = this.whisker1.clone();
  this.whisker3.position.y = 4;

  this.whisker4 = this.whisker1.clone();
  this.whisker4.rotation.z = Math.PI - Math.PI/12;
  this.whisker4.position.x = -this.whisker1.position.x;

  this.whisker5 = this.whisker4.clone();
  this.whisker5.position.y = this.whisker2.position.y;

  this.whisker6 = this.whisker4.clone();
  this.whisker6.position.y = this.whisker3.position.y;

  this.head.add(this.whisker1);
  this.head.add(this.whisker2);
  this.head.add(this.whisker3);
  this.head.add(this.whisker4);
  this.head.add(this.whisker5);
  this.head.add(this.whisker6);

  // ears
  var rightEarGeom = new THREE.CylinderGeometry(0,12, 12, 3,1);
  rightEarGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,4,0));
  var leftEarGeom = rightEarGeom.clone();

  rightEarGeom.applyMatrix(new THREE.Matrix4().makeRotationY(1));
  rightEarGeom.applyMatrix(new THREE.Matrix4().makeScale(1.2,1.4,.7));

  leftEarGeom.applyMatrix(new THREE.Matrix4().makeRotationY(-1));
  leftEarGeom.applyMatrix(new THREE.Matrix4().makeScale(1.2,1.4,.7));
  
  
  
  var skewMatrixRightEar = new THREE.Matrix4().set(   1,    0.0,     0.0,    0,
                                                      0,    1,        0,    0,
                                                      -0.5,    0.0,     1,    0,
                                                      0,    0,        0,    1 );

  
  var skewMatrixLeftEar = new THREE.Matrix4().set(    1,    -.5,     0,    0,
                                                      0,    1,        0,    0,
                                                      0,    0.0,     1,    0,
                                                      0,    0,        0,    1 );

  this.rightEar = new THREE.Mesh(rightEarGeom, brownMat);
  this.rightEar.position.y = this.faceHeight;
  this.rightEar.position.x = -12;
  this.rightEar.position.z = 4;  
  this.rightEar.rotation.z = 2.6;
  this.leftEar = new THREE.Mesh(leftEarGeom, brownMat);
  this.leftEar.position.x = -this.rightEar.position.x;
  this.leftEar.position.z = this.rightEar.position.z;
  this.leftEar.position.y = this.rightEar.position.y;
  this.leftEar.rotation.z = -2.6;

  var rightEarInsideGeom = rightEarGeom.clone();
  rightEarInsideGeom.applyMatrix(new THREE.Matrix4().makeScale(.5, .5, .5));
  this.rightEarInside = new THREE.Mesh(rightEarInsideGeom, pinkMat);
  this.rightEarInside.position.y = .5;
  this.rightEarInside.position.x = 1;
  this.rightEarInside.position.z = 2;

  this.rightEar.add(this.rightEarInside);

  var LeftEarInsideGeom = leftEarGeom.clone();
  LeftEarInsideGeom.applyMatrix(new THREE.Matrix4().makeScale(.5, .5, .5));
  this.leftEarInside = new THREE.Mesh(LeftEarInsideGeom, pinkMat);
  this.leftEarInside.position.y = .5;
  this.leftEarInside.position.x = -1;
  this.leftEarInside.position.z = 2;

  this.leftEar.add(this.leftEarInside);

  // Eyes
  var eyeGeom = new THREE.SphereGeometry(7,4,6);
  this.rightEye = new THREE.Mesh(eyeGeom, goldenMat);
  this.rightEye.position.set(-10, 20, 16);
  this.rightEye.scale.z = 0.2;
  this.rightEye.scale.y = 0.8;
  //this.rightEye.rotation.x = -Math.PI/8;
  this.rightEye.rotation.y = -Math.PI/6;

  this.leftEye = this.rightEye.clone();
  this.leftEye.position.x = -this.rightEye.position.x;
  this.leftEye.rotation.y = Math.PI/6;

  // Iris
  var irisGeom = new THREE.SphereGeometry(4,8,8);
  this.rightIris = new THREE.Mesh(irisGeom, brownMat);
  this.rightIris.position.x = 0;
  this.rightIris.position.y = 2;
  this.rightIris.position.z = 6;

  this.leftIris = this.rightIris.clone();
  this.leftIris.position.x = -this.rightIris.position.x;

  this.rightEye.add(this.rightIris);
  this.leftEye.add(this.leftIris);

  // nose
  var noseGeom = new THREE.CylinderGeometry(3,0,4,4)
  noseGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,-2,-4));

  var skewMatrixNose = new THREE.Matrix4().set(   1,    0,     0,    0,
                                                  0,    1,     0,    0,
                                                  0,    -.7,     1,    1.4,
                                                  0,    0,     0,    1 );

  noseGeom.applyMatrix(skewMatrixNose);
  this.nose = new THREE.Mesh(noseGeom, pinkMat);
  this.nose.position.z = 24;
  this.nose.position.y = 12;

  // nose bridge
  var nosebrGeom = new THREE.CylinderGeometry(3,0,5,5)
  nosebrGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,-2,-4));

  var skewMatrixNose = new THREE.Matrix4().set(   1,    0,     0,    0,
                                                  0,    1,     0,    0,
                                                  0,    -.7,     1,    1.8,
                                                  0,    0,     0,    1 );

  nosebrGeom.applyMatrix(skewMatrixNose);
  this.nosebr = new THREE.Mesh(nosebrGeom, whiteMat);

  this.nosebr.position.z = 22;
  this.nosebr.position.y = 13.5;
  this.nosebr.rotation.z = Math.PI;
  this.nosebr.rotation.x = -Math.PI/8;
  this.nosebr.scale.x=1.2;
  this.nosebr.scale.y=2;
  this.nosebr.scale.z=0.8;



  // cheeks
  cheeksGeom = new THREE.SphereGeometry(8,8,8);
  cheeksGeom.applyMatrix(new THREE.Matrix4().makeScale(1.2,1,1.4));
  this.cheeks = new THREE.Mesh(cheeksGeom, whiteMat);
  this.cheeks.position.set(0, 8, 12 );

  // mouth
  var mouthGeom = cheeksGeom.clone();//new THREE.BoxGeometry(4,2,4);
  mouthGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,-4,0));
  mouthGeom.applyMatrix(new THREE.Matrix4().makeScale(.5,.2,.5));
  this.mouth = new THREE.Mesh(mouthGeom, whiteMat);
  

  // tongue
  var tongueGeom = mouthGeom.clone();
  tongueGeom.applyMatrix(new THREE.Matrix4().makeScale(.8,1,.8));
  this.tongue = new THREE.Mesh(tongueGeom, pinkMat);
  this.tongue.position.set(0, .5, 0); 
  this.mouth.add(this.tongue);

  this.mouth.rotation.x = Math.PI/4;
  this.mouth.position.set(0, 1.5, 14); 

  
  this.head.add(this.face);
  this.head.add(this.rightEar);
  this.head.add(this.leftEar);
  this.head.add(this.rightEye);
  this.head.add(this.leftEye);
  this.head.add(this.nose);
  this.head.add(this.nosebr);
  this.head.add(this.cheeks);
  this.head.add(this.mouth);
  
  this.head.position.y = this.bodyHeight-15;
  this.head.position.z = -5;


  // shoulders
  this.rightShoulder = new THREE.Group();
  this.leftShoulder = new THREE.Group();

  this.rightShoulder.position.set(-6, this.shouldersPosition.y, 0);
  this.leftShoulder.position.set(6, this.shouldersPosition.y, 0);


  // arms
  var armGeom = new THREE.CylinderGeometry(4, 6, this.armHeight+5,4);
  armGeom.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/4));
  armGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, -this.armHeight/2, 0));

  this.rightArm = new THREE.Mesh(armGeom,brownMat);
  this.rightShoulder.add(this.rightArm);

  this.leftArm = this.rightArm.clone();
  this.leftShoulder.add(this.leftArm);
  
  // forearms

  var foreArmGeom = new THREE.CylinderGeometry(6, 7, this.armHeight,4);
  foreArmGeom.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/4));
  foreArmGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, -this.armHeight/2, 0));


  this.rightForeArm = new THREE.Mesh(foreArmGeom,brownMat);
  this.rightForeArm.position.y = -this.armHeight;
  this.rightArm.add(this.rightForeArm);

  this.leftForeArm = this.rightForeArm.clone();
  this.leftArm.add(this.leftForeArm);

  // foot = front foot
  var footGeom = new THREE.SphereGeometry(6,10,10);
  this.rightFoot = new THREE.Mesh(footGeom, whiteMat);
  this.rightFoot.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,0));
  this.rightFoot.position.set(0,-this.armHeight-5,0);
  this.rightForeArm.add(this.rightFoot);
  this.leftFoot = this.rightFoot.clone();
  this.leftForeArm.add(this.leftFoot);

  //footPad
  var footPadGeom = new THREE.SphereGeometry(5,6,6);
  this.rightFootPad = new THREE.Mesh(footPadGeom, pinkMat);
  this.rightFootPad.position.y = -4.5;
  this.rightFootPad.scale.set(1,0.5,1);
  this.rightFoot.add(this.rightFootPad)

  this.leftFootPad = this.rightFootPad.clone();
  this.leftFoot.add(this.leftFootPad);

  // knees
  var kneeGeom = new THREE.BoxGeometry(16,40,38);
  kneeGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,15,0));
  kneeGeom.mergeVertices();
  
  modifier.modify(kneeGeom);
  kneeGeom.computeFaceNormals();
  kneeGeom.computeVertexNormals();

  this.rightKnee = new THREE.Mesh(kneeGeom, brownMat);
  this.rightKnee.rotation.y = -Math.PI/6;
  this.rightKnee.position.x = -14;
  this.rightKnee.position.z = -12;



  this.leftKnee = this.rightKnee.clone();
  this.leftKnee.rotation.y = -this.rightKnee.rotation.y;
  this.leftKnee.position.x = -this.rightKnee.position.x;

  // legs = back legs
  var legGeom = new THREE.SphereGeometry(6,10,10);
  this.rightLeg = new THREE.Mesh(legGeom, whiteMat);
  this.rightLeg.position.set(0,3,17);
  this.rightLeg.scale.set(1,0.8,1);
  this.rightKnee.add(this.rightLeg);

  this.leftLeg = this.rightLeg.clone();
  this.leftKnee.add(this.leftLeg);

  // tail

  this.tail = new THREE.Group();
  this.tail.position.z = -36;
  this.tail.position.y = 5;

  var p = this.tail;
  var currentY = 0;
  var curentRot = 0;
  var segHeight = 8;
  var recScale = 1.15;

  this.tailNSegs = 8 ;
  this.tailSegements = [];

  var tailSegGeom = new THREE.CylinderGeometry(5, 4, segHeight, 6);
  
  tailSegGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,segHeight/2,0));
  
  
  for (var i = 0; i<this.tailNSegs ; i++){
    var mat = (i<this.tailNSegs-1)? brownMat : whiteMat;
    var tg = tailSegGeom.clone();
    var s = Math.pow(recScale, i);
    tg.applyMatrix(new THREE.Matrix4().makeScale(s, s, s));
    if (i == this.tailNSegs-1) {
      //ROUND THE EDGES FOR LAST SECION
      tg.mergeVertices();
      modifier.modify(tg);
      tg.computeFaceNormals();
      tg.computeVertexNormals();
    }
    var t = new THREE.Mesh(tg,mat);
    currentRot = (i==0)? - Math.PI/2 : currentRot/(i*i*i);
    t.position.y = currentY;
    t.rotation.x = currentRot;
    p.add(t);
    p = t;
    currentY = (segHeight-2)*s; 
    currentRot = 
    this.tailSegements.push(t);
  }  
  // eyesockets
  var eyesocketsGeo = new THREE.BoxGeometry(8,8,10);
  var eyesockets_r = new THREE.Mesh(eyesocketsGeo, blackMat);

  eyesockets_r.position.x = -5;
  eyesockets_r.position.z = 12;
  eyesockets_r.position.y = 21;
  eyesockets_r.rotation.y = -Math.PI/6;

  var eyesockets_l = eyesockets_r.clone();
  eyesockets_l.rotation.y = Math.PI/6;
  eyesockets_l.position.x = -eyesockets_r.position.x;

  // highlight
  var highlightGeo = new THREE.BoxGeometry(1.2,1.2,10);
  var highlight_r = new THREE.Mesh(highlightGeo, whiteMat);
  highlight_r.position.x = -10.5;
  highlight_r.position.z = 13;
  highlight_r.position.y = 21;


  var highlight_l = highlight_r.clone();
  highlight_l.position.x = -highlight_r.position.x;

  // eyebrows and stripes Head

  var stripeGeom = new THREE.CylinderGeometry(2,0, 15,4);
  var stripe0 = new THREE.Mesh(stripeGeom, whiteMat);
  stripe0.rotation.y = -Math.PI/4;
  stripe0.rotation.x = -Math.PI;
  stripe0.rotation.z = -Math.PI/6;
  
  stripe0.position.x = -12;
  stripe0.position.y = 30;
  stripe0.position.z = 14.5;

  stripe0.scale.x = 0.25;
  stripe0.scale.z = 0.25;

  var stripe1 = stripe0.clone();
  stripe1.rotation.z = Math.PI/6;
  stripe1.position.x = -stripe0.position.x;
  stripe1.rotation.y = -stripe0.rotation.y;


  var stripe0_0 = stripe0.clone();
  stripe0_0.rotation.z = -Math.PI/5;
  stripe0_0.position.x = stripe0.position.x - 2;

  var stripe1_1 = stripe1.clone();
  stripe1_1.rotation.z = Math.PI/5;
  stripe1_1.position.x = stripe1.position.x + 2;

  var stripe0_0_0 = stripe0_0.clone();
  stripe0_0_0.rotation.z = -Math.PI/4;
  stripe0_0_0.position.x = stripe0_0.position.x - 2;

  var stripe1_1_1 = stripe1_1.clone();
  stripe1_1_1.rotation.z = Math.PI/4;
  stripe1_1_1.position.x = stripe1_1.position.x + 2;

  var stripeGeom2 = new THREE.BoxGeometry(18,4,10);
  var stripe2 = new THREE.Mesh(stripeGeom2, whiteMat);
  stripe2.rotation.y = Math.PI/6.8;
  stripe2.position.x = 14;
  stripe2.position.y = 8;
  stripe2.position.z = 7.2;

  var stripe3 = stripe2.clone();
  stripe3.rotation.y = Math.PI/5.6;
  stripe3.position.y = 5;
  stripe3.position.x = 12;

  var stripe4 = stripe2.clone();
  stripe4.rotation.y = -Math.PI/6.8;
  stripe4.position.x = -stripe2.position.x;

  var stripe5 = stripe4.clone();
  stripe5.rotation.y = -Math.PI/5.6;
  stripe5.position.y = stripe3.position.y;
  stripe5.position.x = -12;

  var stripe6 = stripe2.clone();
  stripe6.rotation.y = Math.PI/5.2;
  stripe6.position.y = 2;
  stripe6.position.x = 9;
  stripe6.position.z = 7;

  var stripe7 = stripe6.clone();
  stripe7.rotation.y = -Math.PI/5.2;
  stripe7.position.x = -stripe6.position.x;



  this.head.add(stripe0);
  this.head.add(stripe1);
  this.head.add(stripe0_0);
  this.head.add(stripe1_1);
  this.head.add(stripe0_0_0);
  this.head.add(stripe1_1_1);
  this.head.add(stripe2);
  this.head.add(stripe3);
  this.head.add(stripe4);
  this.head.add(stripe5);
  this.head.add(stripe6);
  this.head.add(stripe7);
  this.head.add(eyesockets_r);
  this.head.add(eyesockets_l);
  this.head.add(highlight_r);
  this.head.add(highlight_l);
  
  // stripes Knee

  var stripe9 =new THREE.Mesh(stripeGeom2, blackishMat);
  stripe9.rotation.y = Math.PI/4;
  stripe9.position.y = 16;
  stripe9.position.x = 1;
  stripe9.position.z = 12;

  var stripe10 = stripe9.clone();
  stripe10.position.y = 22;
  stripe10.position.x = -1;
  stripe10.position.z = 16;

  var stripe11 = stripe9.clone();
  stripe11.position.y = 28;

  this.rightKnee.add(stripe9);
  this.rightKnee.add(stripe10);
  this.rightKnee.add(stripe11);

  var stripe12 = stripe9.clone();
  stripe12.position.x = 1;

  var stripe13 = stripe12.clone();
  stripe13.position.y = stripe10.position.y;
  stripe13.position.x = 2;
  stripe13.position.z = 16;

  var stripe14 = stripe12.clone();
  stripe14.position.y = stripe11.position.y;

  this.leftKnee.add(stripe12);
  this.leftKnee.add(stripe13);
  this.leftKnee.add(stripe14);

  this.threeGroup.add(this.body);
  this.threeGroup.add(this.head);
  this.threeGroup.add(this.rightShoulder);
  this.threeGroup.add(this.leftShoulder);

  this.threeGroup.add(this.rightKnee);
  this.threeGroup.add(this.leftKnee);
  this.threeGroup.add(this.tail);

  
  this.threeGroup.traverse( function ( object ) {
    if ( object instanceof THREE.Mesh ) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  } );
}

Cat.prototype.updateTail = function(t){
  
  for (var i=0; i<this.tailNSegs; i++){
    var angleStep = -i*.5;
    var angleAmp = Math.PI/(30/(i+1));

    var rotZ = Math.sin(t+angleStep)*angleAmp;
    var st = this.tailSegements[i];
    st.rotation.z = rotZ;//(rotY * i);
  }
}

Cat.prototype.interactWithBall = function(ballPos){
  var bDir = ballPos.clone().sub(this.shouldersPosition.clone());
  var isInDistance = bDir.length() < (this.armHeight*2 + this.handHeight + 8)*1.3;

  this.lookAt(ballPos);

  this.transferPower.x *= .8;
  this.transferPower.y *= .8;

  if (! this.isAttacking){
    if (! isInDistance){
      if (!this.isFootReplacing ){
        this.isFootReplacing = true;
        this.replaceFoot(this.footUsed);
      }
    }else{
      this.lookAt(ballPos);
      if (Math.random()>.96 ){
        this.isAttacking = true;
        this.isFootReplacing = false;
        this.attack(this.footUsed, ballPos, bDir);
      }else{
        this.isFootReplacing = false;
        var middleVector = this.shouldersPosition.clone().add(bDir.clone().multiplyScalar(.4));
        this.prepareAttack(this.footUsed, middleVector);
      }
    }
  }


  if (!this.isBlinking && Math.random()>.99){
    this.isBlinking = true;
    this.blink();
  }

  if (!this.mouthMoving && Math.random()>.99){
    this.mouthMoving = true;
    this.moveMouth();
  }
}

Cat.prototype.lookAt = function(v){
  if (!this.oldTargetLookPos)this.oldTargetLookPos = new THREE.Vector3();
  this.newTargetLookPos = v.clone();
  this.lookPos = this.oldTargetLookPos.clone().add(this.newTargetLookPos.sub(this.oldTargetLookPos).multiplyScalar(.15));
  this.head.lookAt(this.lookPos);
  this.oldTargetLookPos = this.lookPos;
}

Cat.prototype.prepareAttack = function(side, v){
  
  var angles = getAngles(v, this.rightShoulder.position, this.armHeight);
  this.updateArm(side, angles, 1, Back.easeOut, null);
}

Cat.prototype.attack = function(side, v, direction){
  _this = this;
  var shoulder = (side == "right")? this.rightShoulder : this.leftShoulder;
  var angles = getAngles(v, shoulder.position, this.armHeight);
  this.updateArm(side, angles, .15, Back.easeOut, function (){
    var isInDistance = direction.length() < (_this.armHeight*2 + _this.handHeight + 20);
    if (isInDistance) _this.transferPower = {x:-direction.x*(Math.random()*.5)-.1+Math.random()*.2,y:-direction.y*Math.random()*.5};
    _this.isAttacking = false;
    //console.log("attackComplete");
  });
}

Cat.prototype.replaceFoot = function(side){
  _this = this;
  var angles =  {theta:0, alpha:0, beta:0};
  this.updateArm(side, angles, 2, Strong.easeInOut, function (){
    _this.isFootReplacing = false;
    _this.footUsed = (_this.footUsed == "right") ? "left" : "right";
  });
}

Cat.prototype.updateArm = function(side, angles, speed, ease, callBack){
  var shoulder,arm, foreArm, foot;
  if (side == "right"){
    shoulder = this.rightShoulder;
    arm = this.rightArm;
    foreArm = this.rightForeArm;
    foot = this.rightFoot;
  }else{
    shoulder = this.leftShoulder;
    arm = this.leftArm;
    foreArm = this.leftForeArm;
    foot = this.leftFoot;
  }
  var ease = ease || Back.easeOut;

  var tFootAngle = Math.min (-angles.beta, Math.PI*1.5) ;

  TweenMax.to(shoulder.rotation, speed, {y:angles.theta, ease:ease} );
  TweenMax.to(arm.rotation, speed, {x:angles.alpha, ease:ease} );
  TweenMax.to(foreArm.rotation, speed, {x:angles.beta, ease:ease, onComplete:callBack} );
  TweenMax.to(foot.rotation, speed, {x:tFootAngle, ease:ease} );
}

Cat.prototype.blink = function(){
  _this = this;
  TweenMax.to (this.rightEye.scale, .07, {y:0, yoyo:true, repeat:1});
  TweenMax.to (this.leftEye.scale, .07, {y:0, yoyo:true, repeat:1, onComplete:function(){
    _this.isBlinking = false;
  }});
}

Cat.prototype.moveMouth = function(){
  _this = this;
  TweenMax.to (this.mouth.rotation, .2, {x:Math.PI/6, yoyo:true, repeat:1, onComplete:function(){
    _this.mouthMoving = false;
  }});
}

function getAngles(targetPos, shoulderPos, segmentLength){
  var ah = segmentLength;
  var alpha0, alpha1, alpha2;
  var beta0, beta1;
  var bDir = targetPos.clone().sub(shoulderPos);
  var bDirNorm = bDir.clone().normalize();
  
  var dist = bDir.length()-15 ;

  var bTargetDir = bDirNorm.clone().multiplyScalar(dist);
  var bDirMin = (dist < ah*2 ) ? bTargetDir.clone() : bDirNorm.clone().multiplyScalar(ah*2);


  // IK calculations
  var theta = Math.atan2(bDirMin.x, bDirMin.z); // shoulder orientation on Y axis
  theta = (theta < -Math.PI/2 || theta > Math.PI/2) ? 0 : theta;
  var x2 = Math.sqrt(bDirMin.x*bDirMin.x + bDirMin.z*bDirMin.z); // distance projected to x axis => used to find alpha2
  alpha2 = Math.PI/2 - Math.atan(bDirMin.y/x2);



  var cosAlpha1 = dist / (2*ah); 
  cosAlpha1 = (cosAlpha1>1) ? 1 : (cosAlpha1<-1)? -1 : cosAlpha1;

  alpha1 = Math.acos(cosAlpha1);
  alpha0 = (Math.PI) - (alpha1 + alpha2);
  alpha0 = Math.max(0, alpha0);


  cosBeta1 = (ah*ah + ah*ah - dist*dist) / (2*ah*ah);
  cosBeta1 = (cosBeta1 < -1) ? -1 : (cosBeta1 > 1) ? 1 : cosBeta1;
  beta1 = Math.acos(cosBeta1);
  beta0 = Math.PI - beta1;
  beta0 = Math.min(beta0, Math.PI*2/3);

  return {theta:theta, alpha:-alpha0, beta:-beta0};
}

function createBall() {
  ball = new Ball();
  scene.add(ball.threeGroup);
}

// BALL RELATED CODE


var woolNodes = 10,
  woolSegLength = 2,
  gravity = -.8,
  accuracy =1;


Ball = function(){

  var redMat = new THREE.MeshLambertMaterial ({
      color: 0x630d15, 
  });

  var stringMat = new THREE.LineBasicMaterial({
      color: 0x630d15,
      linewidth: 3
  });

  this.threeGroup = new THREE.Group();
  this.ballRay = 8;

  this.verts = [];

  // string
  var stringGeom = new THREE.Geometry();

  for (var i=0; i< woolNodes; i++ ){
    var v = new THREE.Vector3(0, -i*woolSegLength, 0);
    stringGeom.vertices.push(v);

    var woolV = new WoolVert();
    woolV.x = woolV.oldx = v.x;
    woolV.y = woolV.oldy = v.y;
    woolV.z = 0;
    woolV.fx = woolV.fy = 0;
    woolV.isRootNode = (i==0);
    woolV.vertex = v;
    if (i > 0) woolV.attach(this.verts[(i - 1)]);
    this.verts.push(woolV);
    
  }
    this.string = new THREE.Line(stringGeom, stringMat);

    // body
    var bodyGeom = new THREE.SphereGeometry(this.ballRay, 5,4);
    this.body = new THREE.Mesh(bodyGeom, redMat);
    this.body.position.y = -woolSegLength*woolNodes;

    var wireGeom = new THREE.TorusGeometry( this.ballRay, .5, 3, 10, Math.PI*2 );
    this.wire1 = new THREE.Mesh(wireGeom, redMat);
    this.wire1.position.x = 1;
    this.wire1.rotation.x = -Math.PI/4;

    this.wire2 = this.wire1.clone();
    this.wire2.position.y = 1;
    this.wire2.position.x = -1;
    this.wire1.rotation.x = -Math.PI/4 + .5;
    this.wire1.rotation.y = -Math.PI/6;

    this.wire3 = this.wire1.clone();
    this.wire3.rotation.x = -Math.PI/2 + .3;

    this.wire4 = this.wire1.clone();
    this.wire4.position.x = -1;
    this.wire4.rotation.x = -Math.PI/2 + .7;

    this.wire5 = this.wire1.clone();
    this.wire5.position.x = 2;
    this.wire5.rotation.x = -Math.PI/2 + 1;

    this.wire6 = this.wire1.clone();
    this.wire6.position.x = 2;
    this.wire6.position.z = 1;
    this.wire6.rotation.x = 1;

    this.wire7 = this.wire1.clone();
    this.wire7.position.x = 1.5;
    this.wire7.rotation.x = 1.1;

    this.wire8 = this.wire1.clone();
    this.wire8.position.x = 1;
    this.wire8.rotation.x = 1.3;

    this.wire9 = this.wire1.clone();
    this.wire9.scale.set(1.2,1.1,1.1);
    this.wire9.rotation.z = Math.PI/2;
    this.wire9.rotation.y = Math.PI/2;
    this.wire9.position.y = 1;
    
    this.body.add(this.wire1);
    this.body.add(this.wire2);
    this.body.add(this.wire3);
    this.body.add(this.wire4);
    this.body.add(this.wire5);
    this.body.add(this.wire6);
    this.body.add(this.wire7);
    this.body.add(this.wire8);
    this.body.add(this.wire9);

    this.threeGroup.add(this.string);
  this.threeGroup.add(this.body);

  this.threeGroup.traverse( function ( object ) {
    if ( object instanceof THREE.Mesh ) {
      object.castShadow = true;
      object.receiveShadow = true;
    }});

}

WoolVert = function(){
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.oldx = 0;
  this.oldy = 0;
  this.fx = 0;
  this.fy = 0;
  this.isRootNode = false;
  this.constraints = [];
  this.vertex = null;
}


WoolVert.prototype.update = function(){
  var wind = 0;//.1+Math.random()*.5;
    this.add_force(wind, gravity);

    nx = this.x + ((this.x - this.oldx)*.9) + this.fx;
    ny = this.y + ((this.y - this.oldy)*.9) + this.fy;
    this.oldx = this.x;
    this.oldy = this.y;
    this.x = nx;
    this.y = ny;

    this.vertex.x = this.x;
    this.vertex.y = this.y;
    this.vertex.z = this.z;

    this.fy = this.fx = 0
}

WoolVert.prototype.attach = function(point) {
  this.constraints.push(new Constraint(this, point));
};

WoolVert.prototype.add_force = function(x, y) {
  this.fx += x;
  this.fy += y;
};

Constraint = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
  this.length = woolSegLength;
};

Ball.prototype.update = function(posX, posY, posZ){
    
  var i = accuracy;
  
  while (i--) {
    
    var nodesCount = woolNodes;
    
    while (nodesCount--) {
    
      var v = this.verts[nodesCount];
      
      if (v.isRootNode) {
          v.x = posX;
          v.y = posY;
          v.z = posZ;
      }
    
      else {
    
        var constraintsCount = v.constraints.length;
          
          while (constraintsCount--) {
            
            var c = v.constraints[constraintsCount];

            var diff_x = c.p1.x - c.p2.x,
              diff_y = c.p1.y - c.p2.y,
              dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
              diff = (c.length - dist) / dist;

            var px = diff_x * diff * .5;
            var py = diff_y * diff * .5;

            c.p1.x += px;
            c.p1.y += py;
            c.p2.x -= px;
            c.p2.y -= py;
            c.p1.z = c.p2.z = posZ;
          }

          if (nodesCount == woolNodes-1){
            this.body.position.x = this.verts[nodesCount].x;
          this.body.position.y = this.verts[nodesCount].y;
          this.body.position.z = this.verts[nodesCount].z;

          this.body.rotation.z += (v.y <= this.ballRay)? (v.oldx-v.x)/10 : Math.min(Math.max( diff_x/2, -.1 ), .1);
          }
        }
        
        if (v.y < this.ballRay) {
          v.y = this.ballRay;
        }
    }
  }

  nodesCount = woolNodes;
  while (nodesCount--) this.verts[nodesCount].update();

  this.string.geometry.verticesNeedUpdate = true;

  
}

Ball.prototype.receivePower = function(tp){
  this.verts[woolNodes-1].add_force(tp.x, tp.y);
}

// Enf of the code inspired by dissmulate


// Make everything work together :

var t=0;

function loop(){
  render();
  
  t+=.05;
  pet.updateTail(t);

  var ballPos = getBallPos();
  ball.update(ballPos.x,ballPos.y, ballPos.z);
  ball.receivePower(pet.transferPower);
  pet.interactWithBall(ball.body.position);
  land.moveWaves();
  floatInWater(island);
  floatInWater(pet.threeGroup);
  requestAnimationFrame(loop);
}


function getBallPos(){
  var vector = new THREE.Vector3();

  vector.set(
      ( mousePos.x / window.innerWidth ) * 2 - 1, 
      - ( mousePos.y / window.innerHeight ) * 2 + 1,
      0.1 );

  vector.unproject( camera );
  var dir = vector.sub( camera.position ).normalize();
  var distance = (ballWallDepth - camera.position.z) / dir.z;
  var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
  return pos;
}

function render(){
  if (controls) controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('load', init, false);

function init(event){
  initScreenAnd3D();
  createLights();
  createWater();
  createIsland();
  createPet();
  createBall();
  loop();
}

