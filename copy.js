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
let coloredPoints;
let coloredPointsArrays = []; // Array to store colored points for each iteration

// Create a gray color
var grayColor = new THREE.Color(0.5, 0.5, 0.5); // base color

var color0 = new THREE.Color(1, 0, 0); // Red
var color1 = new THREE.Color(0, 1, 0); // Green
var color2 = new THREE.Color(0, 0, 1); // Blue
var color3 = new THREE.Color(1, 1, 0); // Yellow
var color4 = new THREE.Color(1, 0, 1); // Pink
var color5 = new THREE.Color(0, 1, 1); // Cyan

var colors = [
    color0.toArray(),
    color1.toArray(),
    color2.toArray(),
    color3.toArray(),
    color4.toArray(),
    color5.toArray()
];

// Define colors for each iteration
var colorsByIteration = [
    [color0.toArray()],
    [color0.toArray(), color1.toArray()],
    [color0.toArray(), color1.toArray(), color2.toArray()],
    [color0.toArray(), color1.toArray(), color2.toArray(), color3.toArray()],
    [color0.toArray(), color1.toArray(), color2.toArray(), color3.toArray(), color4.toArray()],
    [color0.toArray(), color1.toArray(), color2.toArray(), color3.toArray(), color4.toArray(), color5.toArray()]
];

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

    // standardMat = new THREE.MeshBasicMaterial(); // rainbow color
    // standardMat.vertexColors = THREE.VertexColors;
    standardMat = new THREE.MeshBasicMaterial({ color: grayColor });

    meshNormal = new THREE.Mesh(new THREE.BufferGeometry(), standardMat);
    meshSmooth = new THREE.Mesh(new THREE.BufferGeometry(), standardMat);
    meshNormal.position.set(-0.7, 0, 0);
    meshSmooth.position.set(0.7, 0, 0);
    scene.add(meshNormal, meshSmooth);

    wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true, wireframe: true });
    wireNormal = new THREE.Mesh(new THREE.BufferGeometry(), wireMaterial);
    wireSmooth = new THREE.Mesh(new THREE.BufferGeometry(), wireMaterial);
    wireNormal.visible = true;
    wireSmooth.visible = true;
    wireNormal.position.copy(meshNormal.position);
    wireSmooth.position.copy(meshSmooth.position);
    scene.add(wireNormal, wireSmooth);

    updateMeshes();

    window.addEventListener('resize', onWindowResize);

    const geomTypes = ['Box', 'Capsule', 'Circle', 'Cylinder', 'Dodecahedron', 'Icosahedron', 'Octahedron', 'Plane', 'Ring', 'Sphere', 'Tetrahedron', 'Torus'];//, 'Upload'];

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

        // case 'Upload':
        //     // when user wants to upload their own obj file
    }

}



function createColoredPoints(geometry, color, offset, iteration) {
    const positions = geometry.attributes.position;

    if (!positions) {
        console.error('Invalid geometry for colored points.');
        return null;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', positions);

    const pointsMaterial = new THREE.PointsMaterial({ color: color, size: 0.05 }); // Adjust the size as needed
    const points = new THREE.Points(pointsGeometry, pointsMaterial);

    // Center the points on the geometry and apply the offset
    const boundingBox = new THREE.Box3().setFromBufferAttribute(positions);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const adjustedOffset = offset.clone().add(center); // Adjusted offset based on the bounding box center
    points.position.copy(adjustedOffset);

    // Store the points in the corresponding iteration array
    coloredPointsArrays[iteration] = coloredPointsArrays[iteration] || [];
    coloredPointsArrays[iteration].push(points);

    return points;
}

function updateMeshes() {
    const normalGeometry = getGeometry();
    const smoothGeometry = LoopSubdivision.modify(normalGeometry, params.iterations, params);

    // Dispose existing geometries
    meshNormal.geometry.dispose();
    meshSmooth.geometry.dispose();
    wireNormal.geometry.dispose();
    wireSmooth.geometry.dispose();

    // Create new geometries
    meshNormal.geometry = normalGeometry;
    meshSmooth.geometry = smoothGeometry;

    // Create wireframe geometries
    wireNormal.geometry = new THREE.WireframeGeometry(normalGeometry);
    wireSmooth.geometry = new THREE.WireframeGeometry(smoothGeometry);

    // Ensure the wireframe material is applied
    wireNormal.material.dispose();
    wireSmooth.material.dispose();
    wireNormal.material = wireMaterial.clone();
    wireSmooth.material = wireMaterial.clone();

    // Set the wireframe visibility
    wireNormal.visible = wireSmooth.visible = params.wireframe;

    // Remove existing colored points from the scene
    coloredPointsArrays.flat().forEach(points => scene.remove(points));

    // Clear the colored points array
    coloredPointsArrays = [];

    // Iterate through each iteration and create colored points
    for (let i = 0; i <= params.iterations; i++) {
        const color = new THREE.Color().fromArray(colors[i % colors.length]);
        const coloredPointsNormal = createColoredPoints(normalGeometry, color, new THREE.Vector3(-0.7, 0, 0), i);
        const coloredPointsSmooth = createColoredPoints(smoothGeometry, color, new THREE.Vector3(0.7, 0, 0), i);

        // Add the colored points to the scene
        if (coloredPointsNormal) {
            scene.add(coloredPointsNormal);
            coloredPointsArrays[i] = coloredPointsArrays[i] || [];
            coloredPointsArrays[i].push(coloredPointsNormal);
        }

        if (coloredPointsSmooth) {
            scene.add(coloredPointsSmooth);
            coloredPointsArrays[i] = coloredPointsArrays[i] || [];
            coloredPointsArrays[i].push(coloredPointsSmooth);
        }
    }

    // Update the material if needed
    updateMaterial();

    // Render the scene
    render();
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

