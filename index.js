var dt = 1 / 60,
    R = 0.2;

var clothMass = 0.1; // 1 kg in total
var clothSize = 1; // 1 meter
var Nx = 36;
var Ny = 26;
var mass = clothMass / Nx * Ny;

var restDistance = clothSize / Nx;

var ballSize = 0.1;

var clothFunction = plane(restDistance * Nx, restDistance * Ny);

function plane(width, height) {
    return function(u, v) {
        var x = (u - 0.5) * width;
        var y = (v + 0.5) * height; // height * 1.5; //
        var z = 0; //(v + 0.5) * height;

        return new THREE.Vector3(x, y, z);
    };
}

if (!Detector.webgl) Detector.addGetWebGLMessage();

var container, stats;
var camera, scene, renderer;

var clothGeometry;
var sphereMesh, sphereBody;
var object;
var particles = [];
var world;

//NOISE DEFINED
var simplex = new SimplexNoise();

//TIME FOR 3D NOISE



initCannon();
init();
animate();

function initCannon() {
    world = new CANNON.World();
    world.broadphase = new CANNON.NaiveBroadphase();
    world.gravity.set(0, -9.82, 0);
    world.solver.iterations = 20;

    // Materials
    clothMaterial = new CANNON.Material();
    var sphereMaterial = new CANNON.Material();
    var clothSphereContactMaterial = new CANNON.ContactMaterial(clothMaterial,
        sphereMaterial,
        0.0, // friction coefficient
        0.0 // restitution
    );
    // Adjust constraint equation parameters for ground/ground contact
    clothSphereContactMaterial.contactEquationStiffness = 1e9;
    clothSphereContactMaterial.contactEquationRelaxation = 3;

    // Add contact material to the world
    world.addContactMaterial(clothSphereContactMaterial);

    // Create sphere
    var sphereShape = new CANNON.Sphere(ballSize * 1.3);
    sphereBody = new CANNON.Body({
        mass: 0
    });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0, 0, 0);
    //world.addBody(sphereBody);
    //!! --------------------------------------------------------------------------------------- Sphere Removed

    // Create cannon particles
    for (var i = 0, il = Nx + 1; i !== il; i++) {
        particles.push([]);
        for (var j = 0, jl = Ny + 1; j !== jl; j++) {
            var idx = j * (Nx + 1) + i;
            var p = clothFunction(i / (Nx + 1), j / (Ny + 1));
            var particle = new CANNON.Body({
                    mass: myMass(i, j) // j == Ny ? 0 : mass //

                }
                //hiren
            );
            particle.addShape(new CANNON.Particle());
            particle.linearDamping = 0.5;
            particle.position.set(
                p.x,
                p.y - Ny * 0.9 * restDistance,
                p.z
            );
            particles[i].push(particle);
            world.addBody(particle);
            //particle.velocity.set(0, 0, -0.5 * (Ny - j) * (i - Nx));


        }
    }

    function myMass(ii, jj) {
        if (jj == Ny) {
            return mass;
        } else {
            // console.log(jj, jj / Ny);
            return mass; //(jj / Ny);
        }

    }

    function connect(i1, j1, i2, j2) {
        world.addConstraint(new CANNON.DistanceConstraint(particles[i1][j1], particles[i2][j2], restDistance));
    }
    for (var i = 0; i < Nx + 1; i++) {
        for (var j = 0; j < Ny + 1; j++) {
            if (i < Nx) connect(i, j, i + 1, j);
            if (j < Ny) connect(i, j, i, j + 1);
        }
    }
}

var clothMaterial;

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    // scene

    scene = new THREE.Scene();

    scene.fog = new THREE.Fog(0xffffff, 500, 10000);

    // camera

    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 10000);

    camera.position.set(0, 0, 3);

    scene.add(camera);


    // Controls
    // controls = new THREE.TrackballControls(camera);


    // controls.rotateSpeed = 1.0; // 1.0;
    // controls.zoomSpeed = 1.2;
    // controls.panSpeed = 0; // 0.8;

    // controls.noZoom = false;
    // controls.noPan = false;

    // controls.staticMoving = true;
    // controls.dynamicDampingFactor = 0.3;

    // controls.keys = [65, 83, 68];


    // lights
    var light, light2, materials;
    scene.add(new THREE.AmbientLight(0x666666));

    light = new THREE.DirectionalLight(0xaaaaaa, 1.75);
    var d = 5;

    light.position.set(d, d, 2 * d);

    light.castShadow = true;
    //light.shadowCameraVisible = true;

    light.shadowMapWidth = 1024 * 2;
    light.shadowMapHeight = 1024 * 2;

    light.shadowCameraLeft = -d;
    light.shadowCameraRight = d;
    light.shadowCameraTop = d;
    light.shadowCameraBottom = -d;

    light.shadowCameraFar = 3 * d;
    light.shadowCameraNear = d;
    light.shadowDarkness = 0.5;

    scene.add(light);

    //Second Light

    light2 = new THREE.DirectionalLight(0xaaaaaa, 1.75);
    var d = -5;

    light2.position.set(d, d, d);

    light2.castShadow = true;
    //light.shadowCameraVisible = true;

    light2.shadowMapWidth = 1024 * 2;
    light2.shadowMapHeight = 1024 * 2;

    light2.shadowCameraLeft = -d;
    light2.shadowCameraRight = d;
    light2.shadowCameraTop = d;
    light2.shadowCameraBottom = -d;

    light2.shadowCameraFar = 3 * d;
    light2.shadowCameraNear = d;
    light2.shadowDarkness = 0.5;

    scene.add(light2);

    /*
    light = new THREE.DirectionalLight( 0xffffff, 0.35 );
    light.position.set( 0, -1, 0 );

    scene.add( light );
    */

    // cloth material

    clothTexture = THREE.ImageUtils.loadTexture('SM21_[L.1]_2018_Porto_1911_lowest.jpg'); // circuit_pattern.png
    clothTexture.wrapS = clothTexture.wrapT = THREE.RepeatWrapping;
    clothTexture.anisotropy = 16;


    var normalTexture = THREE.ImageUtils.loadTexture('NormalMap.png'); // circuit_pattern.png
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.anisotropy = 16;


    var clothMaterial = new THREE.MeshPhongMaterial({
        alphaTest: 0.5,
        ambient: 0x000000,
        color: 0xffffff,
        specular: 0x333333,
        emissive: 0x000000,
        shininess: 2,
        map: clothTexture,
        // normalMap: normalTexture,
        side: THREE.DoubleSide
    });

    // cloth geometry
    clothGeometry = new THREE.ParametricGeometry(clothFunction, Nx, Ny, true);
    clothGeometry.dynamic = true;
    clothGeometry.computeFaceNormals();

    // cloth mesh
    object = new THREE.Mesh(clothGeometry, clothMaterial);
    object.position.set(0., 0.0, 0.); //(0.8, -0.08, 1.); //
    object.rotation.set(0, 0, 0);
    object.castShadow = true;
    //object.receiveShadow = true;
    scene.add(object);

    // sphere
    var ballGeo = new THREE.SphereGeometry(ballSize, 20, 20);
    var ballMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888
    });

    sphereMesh = new THREE.Mesh(ballGeo, ballMaterial);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    //scene.add(sphereMesh);
    //!! --------------------------------------------------------------------------------------- Sphere Removed


    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('myCanvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color);

    //container.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;

    renderer.shadowMapEnabled = true;

    window.addEventListener('resize', onWindowResize, false);

    camera.lookAt(scene.position);
}

var clothTexture1;

function changeClothMaterial() {
    // clothTexture1 = THREE.ImageUtils.loadTexture('SM20_[L.2]_2020_shoreditch_lockdown_lowest.jpg'); // circuit_pattern.png
    // clothTexture1.wrapS = clothTexture1.wrapT = THREE.RepeatWrapping;
    // clothTexture1.anisotropy = 16;

    // clothMaterial.map = clothTexture1;
    // clothMaterial.needsUpdate = true
    //     // maybe need this too..
    // clothMaterial.map.needsUpdate = true;


    let loader = new THREE.TextureLoader()
    loader.load('SM20_[L.2]_2020_shoreditch_lockdown_lowest.jpg', (texture) => {
        texture.minFilter = THREE.LinearFilter
        texture.anisotropy = 8
        object.material.map = texture
        object.material.needsUpdate = true

        console.log("WHOKAY!1");
    })

    // object.material.map = THREE.ImageUtils.loadTexture('SM20_[L.2]_2020_shoreditch_lockdown_lowest.jpg');
    // object.material.needsUpdate = true;

    console.log("WHOKAY!");
}

//

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // controls.handleResize();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//INTERACTION

var phoneOrientationZ = 0;
var phoneOrientationY = 0;

var isDevicePhone = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {

    if (window.DeviceOrientationEvent) {



        console.log("DeviceOrientation is supported");
        isDevicePhone = true;


        window.addEventListener('deviceorientation', function(event) {
            //  document.getElementById("moAccel").innerHTML = 0;//event.alpha;
            // 	document.getElementById("moRotation").innerHTML = event.beta;
            // document.getElementById("moInterval").innerHTML = event.gamma;

            // if( (0 < event.beta) && (event.beta < 45) )
            // {
            //   phoneOrientationY = event.beta;
            // }
            // if( (45 <= event.beta) && (event.beta < 90) )
            // {
            //   phoneOrientationY = event.beta;
            // }

            phoneOrientationY = event.beta - 45;

            if (Math.abs(event.gamma) < 45) {
                phoneOrientationZ = event.gamma;
            }
        }, false);
    }
} else {

}

var canvas = document.getElementById('myCanvas');

var mouseX = -1;
var mouseY = -1;

if (isDevicePhone) {
    canvas.addEventListener('touchstart', function(evt) {
        //TOUCH EVENTS
    }, false);

    camera.position.set(0, 0, 4);

} else {
    canvas.addEventListener('mousemove', function(evt) {
        var mousePos = getMousePos(canvas, evt);
        if (!isDevicePhone) {

            mouseX = mousePos.x - window.innerWidth / 2;
            mouseY = mousePos.y - window.innerHeight / 2;
        }

    }, false);

    canvas.addEventListener('click', function(evt) {
        //MOUSE EVENTS
    }, false);
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function animate() {
    requestAnimationFrame(animate);
    // controls.update();
    world.step(dt);
    var t = world.time;
    sphereBody.position.set(R * Math.sin(t), 0, R * Math.cos(t));
    //world.gravity.set(R * Math.sin(t / 3), -9.82, R * Math.cos(t));
    // world.gravity.set(5 * R * Math.sin(t / 3), -9.82, -1 * R * (Math.cos(t) + 1.5));
    world.gravity.set(0, 0, 0);

    //object.rotation.set(20 * R * Math.sin(t / 3), 29.6, 0);

    var d = new Date();
    var time = d.getTime() / 2000;


    //console.log(time);
    var multt = 0.05;

    for (var i = 0, il = Nx + 1; i !== il; i++) {
        for (var j = 0, jl = Ny + 1; j !== jl; j++) {
            var idx = j * (Nx + 1) + i;

            var pp = particles[i][j];
            // pp.velocity.set(0, 0, (1 - j / Ny) * 0.5 * simplex.noise3D(i, j, time));
            // pp.velocity.set(0, 0, ((1 - j / Ny) - 0.5) * 0.1 * simplex.noise3D(i * multt, j * multt, time));
            var p = clothFunction(i / (Nx + 1), j / (Ny + 1));
            pp.position.set(p.x,
                p.y - Ny * 0.9 * restDistance,
                p.z + 0.05 * simplex.noise3D(i * multt, j * multt, time));
            // pp.velocity.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
            // console.log(i, j, simplex.noise3D(i, j, time));
        }
    }

    // // Create cannon particles
    // for (var i = 0, il = Nx + 1; i !== il; i++) {
    //     particles.push([]);
    //     for (var j = 0, jl = Ny + 1; j !== jl; j++) {
    //         var idx = j * (Nx + 1) + i;
    //         var p = clothFunction(i / (Nx + 1), j / (Ny + 1));
    //         var particle = new CANNON.Body({
    //                 mass: myMass(i, j) // j == Ny ? 0 : mass //

    //             }
    //             //hiren
    //         );
    //         particle.addShape(new CANNON.Particle());
    //         particle.linearDamping = 0.5;
    //         particle.position.set(
    //             p.x,
    //             p.y - Ny * 0.9 * restDistance,
    //             p.z
    //         );
    //         particles[i].push(particle);
    //         world.addBody(particle);
    //         //particle.velocity.set(0, 0, -0.5 * (Ny - j) * (i - Nx));



    //         var d = new Date();
    //         var time = d.getTime();
    //         particle.velocity.set(0, 0, 0 * simplex.noise3D(i, j, time));
    //         // console.log(simplex.noise3D(i, j, time));
    //         if (i == Nx) {
    //             //    particle.velocity.set(0, 0, 5 * (1 - (j - Ny)));
    //         }
    //     }
    // }



    render();
}

function render() {

    for (var i = 0, il = Nx + 1; i !== il; i++) {
        for (var j = 0, jl = Ny + 1; j !== jl; j++) {
            var idx = j * (Nx + 1) + i;
            clothGeometry.vertices[idx].copy(particles[i][j].position);
        }
    }

    clothGeometry.computeFaceNormals();
    clothGeometry.computeVertexNormals();

    clothGeometry.normalsNeedUpdate = true;
    clothGeometry.verticesNeedUpdate = true;

    sphereMesh.position.copy(sphereBody.position);

    //interaction

    if (isDevicePhone) {


        mouseX = phoneOrientationZ * 9; //36;
        mouseY = phoneOrientationY * 4.5; //18;
    }



    if (1) {
        //camera.position.x += (-mouseX / 10 - camera.position.x) * .05;
        //camera.position.y += (-mouseY / 05 - camera.position.y) * .05;



        if (isNaN(mouseX)) {
            mouseX = 0;
        }

        if (isNaN(mouseY)) {
            mouseY = 0;
        }
        object.rotation.x += (mouseY / 600 - object.rotation.x) * .05;
        object.rotation.y += (mouseX / 1200 - object.rotation.y) * .05;


    }

    camera.lookAt(scene.position);

    renderer.render(scene, camera);

}