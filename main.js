import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import LoopSubdivision from './LoopSubdivision.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

let renderer, scene, camera;
let standardMat;
let meshNormal, meshSmooth;
let wireNormal, wireSmooth;
let wireMaterial;

const params = {
    geometry: 'Box',
    iterations: 3,
    split: true,
    wireframe: true
};

init();

function init() {
    const version = parseInt(THREE.REVISION.replace(/\D/g, ''));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (version && version > 151) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
    camera.position.set(0, 0.7, 2.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.rotateSpeed = 0.5;
    controls.minZoom = 1;
    controls.target.set(0, 0, 0);
    controls.update();

    const light = new THREE.PointLight(0xff0000, 1, 100);
    light.position.set(2.5, 7.5, 15);
    scene.add(light);

    standardMat = new THREE.MeshNormalMaterial();

    meshNormal = new THREE.Mesh(new THREE.BufferGeometry(), standardMat);
    meshSmooth = new THREE.Mesh(new THREE.BufferGeometry(), standardMat);
    meshNormal.position.set(-0.7, 0, 0);
    meshSmooth.position.set(0.7, 0, 0);
    scene.add(meshNormal, meshSmooth);

    wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true, wireframe: true });
    wireNormal = new THREE.Mesh(new THREE.BufferGeometry(), wireMaterial);
    wireSmooth = new THREE.Mesh(new THREE.BufferGeometry(), wireMaterial);
    wireNormal.visible = false;
    wireSmooth.visible = false;
    wireNormal.position.copy(meshNormal.position);
    wireSmooth.position.copy(meshSmooth.position);
    scene.add(wireNormal, wireSmooth);

    updateMeshes();

    window.addEventListener('resize', onWindowResize);

    const geomTypes = ['Box', 'Capsule', 'Circle', 'Cone', 'Cylinder', 'Dodecahedron', 'Icosahedron', 'Octahedron', 'Plane', 'Ring', 'Sphere', 'Tetrahedron', 'Torus', 'TorusKnot'];//, 'Upload'];

    const gui = new GUI();

    const folder1 = gui.addFolder('Subdivide Params');
    const geomController = folder1.add(params, 'geometry', geomTypes).onFinishChange(() => {
        const geom = params.geometry.toLowerCase();
        params.split = geom === 'box' || geom === 'ring' || geom === 'plane';
        refreshDisplay();
    });

    folder1.add(params, 'iterations').min(0).max(5).step(1).onFinishChange(updateMeshes);
    const splitController = folder1.add(params, 'split').onFinishChange(updateMeshes);

    const folder2 = gui.addFolder('Material');
    folder2.add(params, 'wireframe').onFinishChange(updateWireframe);

    function refreshDisplay() {
        geomController.updateDisplay();
        splitController.updateDisplay();
        updateMeshes();
    }
}


function getGeometry() {

    switch ( params.geometry.toLowerCase() ) {

        case 'box':
            return new THREE.BoxGeometry();

        case 'capsule':
            return new THREE.CapsuleGeometry( 0.5, 0.5, 3, 5 );

        case 'circle':
            return new THREE.CircleGeometry( 0.6, 10 );

        case 'cone':
            return new THREE.ConeGeometry( 0.6, 1.5, 5, 3 );

        case 'cylinder':
            return new THREE.CylinderGeometry( 0.5, 0.5, 1, 5, 4 );

        case 'dodecahedron':
            return new THREE.DodecahedronGeometry( 0.6 );

        case 'icosahedron':
            return new THREE.IcosahedronGeometry( 0.6 );

        case 'octahedron':
            return new THREE.OctahedronGeometry( 0.7 );

        case 'plane':
            return new THREE.PlaneGeometry();

        case 'ring':
            return new THREE.RingGeometry( 0.3, 0.6, 10 );

        case 'sphere':
            return new THREE.SphereGeometry( 0.6, 8, 4 );

        case 'tetrahedron':
            return new THREE.TetrahedronGeometry( 0.8 );

        case 'torus':
            return new THREE.TorusGeometry( 0.48, 0.24, 4, 6 );

        case 'torusknot':
            return new THREE.TorusKnotGeometry( 0.38, 0.18, 20, 4 );

        // case 'Upload':
        //     // when user wants to upload their own obj file
    }

}


function updateMeshes() {
    const normalGeometry = getGeometry();
    const smoothGeometry = LoopSubdivision.modify(normalGeometry, params.iterations, params);

    meshNormal.geometry.dispose();
    meshSmooth.geometry.dispose();
    meshNormal.geometry = normalGeometry;
    meshSmooth.geometry = smoothGeometry;

    wireNormal.geometry.dispose();
    wireSmooth.geometry.dispose();
    wireNormal.geometry = normalGeometry.clone();
    wireSmooth.geometry = smoothGeometry.clone();

    updateMaterial();
}

function disposeMaterial(material) {
    const materials = Array.isArray(material) ? material : [material];
    for (let i = 0; i < materials.length; i++) {
        if (materials[i].dispose) materials[i].dispose();
    }
}

function updateMaterial() {
    disposeMaterial(meshNormal.material);
    disposeMaterial(meshSmooth.material);

    meshNormal.material = meshSmooth.material = standardMat;

    render();
}

function updateWireframe() {
    wireNormal.visible = wireSmooth.visible = params.wireframe;
    render();
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    render();
}

function render() {
    renderer.render(scene, camera);
}

