import * as CANNON from "https://cdn.skypack.dev/cannon-es";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvasEl = document.querySelector("#canvas");
const containerEl = document.querySelector(".container");

let renderer, scene, camera, orbit, physicsWorld, boxMaterial, dummy, instancedBoxesMesh, boxesBodies = [];

const params = {
    boxesNumber: 100,
    boxSize: .03,
    containerSize: 1,
    gravity: 10
};

initPhysics();
initScene();
throwBoxes();

boxMaterial.visible = true;
render();

window.addEventListener("resize", updateSceneSize);
containerEl.addEventListener("dblclick", throwBoxes);

function initScene() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvasEl
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, .1, 100)
    camera.position.set(0, 1, .5).multiplyScalar(5);

    updateSceneSize();

    dummy = new THREE.Object3D();

    orbit = new OrbitControls(camera, canvasEl);
    orbit.enableZoom = false;
    orbit.enablePan = false;
    orbit.minPolarAngle = .1 * Math.PI;
    orbit.maxPolarAngle = .9 * Math.PI;
    orbit.autoRotate = true;
    orbit.autoRotateSpeed = 19;
    orbit.enableDamping = true;


    for (let i = 0; i < 6; i++) {
        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane(),
        });
        physicsWorld.addBody(body);

        const posSign = i % 2 ? 1 : (-1);
        if (i < 2) {
            body.position.x = posSign * .5 * params.containerSize;
            body.quaternion.setFromEuler(0, -posSign * Math.PI / 2, 0);
        } else if (i < 4) {
            body.position.y = posSign * .5 * params.containerSize;
            body.quaternion.setFromEuler(posSign * Math.PI / 2, 0, 0);
        } else {
            body.position.z = posSign * .5 * params.containerSize;
            if (i > 4) {
                body.quaternion.setFromEuler(0, Math.PI, 0);
            }
        }
    }

    boxMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        visible: false
    })
    const boxGeometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, .2 * params.boxSize);

    instancedBoxesMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, params.boxesNumber);
    scene.add(instancedBoxesMesh);

    for (let i = 0; i < params.boxesNumber; i++) {
        boxesBodies[i] = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(.6 * params.boxSize, .6 * params.boxSize, .6 * params.boxSize)),
        });
        physicsWorld.addBody(boxesBodies[i]);
    }

    const wallGeometry = new THREE.BoxGeometry(params.containerSize, params.containerSize, params.containerSize);
    const wallEdges = new THREE.EdgesGeometry(wallGeometry);
    const wallLine = new THREE.LineSegments(wallEdges, new THREE.LineBasicMaterial({color: 0x000000}));
    scene.add(wallLine);
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -params.gravity, 0),
    })
    physicsWorld.defaultContactMaterial.friction = .1;
    physicsWorld.defaultContactMaterial.restitution = .9;
}


function render() {

    orbit.update();

    physicsWorld.fixedStep();

    for (let i = 0; i < params.boxesNumber; i++) {
        dummy.position.copy(boxesBodies[i].position);
        dummy.quaternion.copy(boxesBodies[i].quaternion);
        dummy.updateMatrix();
        instancedBoxesMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedBoxesMesh.instanceMatrix.needsUpdate = true;

    const gravity = new THREE.Vector3(0, -params.gravity, 0);
    gravity.applyQuaternion(camera.quaternion);
    physicsWorld.gravity = new CANNON.Vec3(gravity.x, gravity.y, gravity.z);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function throwBoxes() {
    boxesBodies.forEach(body => {
        const force = 7;
        body.applyImpulse(
            new CANNON.Vec3(
                Math.random() > .5 ? -force : force,
                Math.random() > .5 ? -force : force,
                Math.random() > .5 ? -force : force
            ),
        );
    });
}

function updateSceneSize() {
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
}