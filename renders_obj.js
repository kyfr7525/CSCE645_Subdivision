// main.js code but only renders/uploads obj object with not subdivision logic (just to have something working)

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
let coloredPointsArrays = []; // Array to store colored points for each iteration
let uploadedGeometry = null;
let isUploadedVisible = false; // Flag to control the visibility of the uploaded object
let subdivisionController;

// Create a gray color
const grayColor = new THREE.Color(0.6,0.6,0.6); // base color

const colors = [
    new THREE.Color(1, 0, 0), // Red
    new THREE.Color(0, 1, 0), // Green
    new THREE.Color(0, 0, 1), // Blue
    new THREE.Color(1, 1, 0), // Yellow
    new THREE.Color(1, 0, 1), // Pink
    new THREE.Color(0, 1, 1), // Cyan
    new THREE.Color(1, 0.5, 0) // Orange
];

const params = {
    geometry: 'Box',
    iterations: 0,
    split: true,
    wireframe: true,
    showColoredPoints: true, // Added control for colored points visibility
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
    scene.background = new THREE.Color(0.2,0.2,0.2); // Set the background color 

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

    const geomTypes = ['Box', 'Capsule', 'Circle', 'Cylinder', 'Dodecahedron', 'Icosahedron', 'Octahedron', 'Plane', 'Ring', 'Sphere', 'Tetrahedron', 'Torus', 'Upload'];

    const gui = new GUI();

    // Create GUI controllers
    const folder1 = gui.addFolder('Subdivide Params');
    const geomController = folder1.add(params, 'geometry', geomTypes).name('Geometry').onFinishChange(() => {
        const geom = params.geometry.toLowerCase();
        params.split = geom === 'box' || geom === 'ring' || geom === 'plane';

        // Disable subdivision slider for uploaded geometry
        subdivisionController.domElement.style.pointerEvents = geom === 'upload' ? 'none' : 'auto';

        // Clear uploaded geometry if the selected geometry is not "Upload"
        if (geom !== 'upload' && uploadedGeometry) {
            scene.remove(uploadedGeometry);
            uploadedGeometry = null;
            updateMeshes(); // Update other geometries
        } else if (geom === 'upload') {
            // Load and render the uploaded geometry
            uploadObj();
        }

        refreshDisplay();
    });

    subdivisionController = folder1.add(params, 'iterations').min(0).max(5).step(1).onFinishChange(updateMeshes);
    subdivisionController.domElement.style.pointerEvents = 'auto'; // Set pointer events to 'auto'

    const splitController = folder1.add(params, 'split').onFinishChange(updateMeshes);

    const folder2 = gui.addFolder('Material');
    folder2.add(params, 'wireframe').onFinishChange(updateWireframe);
    folder2.add(params, 'showColoredPoints').onFinishChange(updateColoredPointsVisibility);

    function refreshDisplay() {
        geomController.updateDisplay();
        splitController.updateDisplay();
        updateMeshes();
    }
}



function getGeometry() {
    switch (params.geometry.toLowerCase()) {
        case 'box':
            return new THREE.BoxGeometry();

        case 'capsule':
            return new THREE.CapsuleGeometry(0.5, 0.5, 3, 5);

        case 'circle':
            return new THREE.CircleGeometry(0.6, 10);

        case 'cylinder':
            return new THREE.CylinderGeometry(0.5, 0.5, 1, 5, 4);

        case 'dodecahedron':
            return new THREE.DodecahedronGeometry(0.6);

        case 'icosahedron':
            return new THREE.IcosahedronGeometry(0.6);

        case 'octahedron':
            return new THREE.OctahedronGeometry(0.7);

        case 'plane':
            return new THREE.PlaneGeometry();

        case 'ring':
            return new THREE.RingGeometry(0.3, 0.6, 10);

        case 'sphere':
            return new THREE.SphereGeometry(0.6, 8, 4);

        case 'tetrahedron':
            return new THREE.TetrahedronGeometry(0.8);

        case 'torus':
            return new THREE.TorusGeometry(0.48, 0.24, 4, 6);

        case 'upload':
            // when the user wants to upload their own obj file
            return uploadedGeometry.clone();
    }
}



// Add an event listener to the file input
const fileInput = document.getElementById('input');
fileInput.addEventListener('change', () => {
    const fileURL = URL.createObjectURL(fileInput.files[0]);
    const fileName = fileInput.files[0].name;

    // Display the uploaded file name
    document.getElementById('uploadLabel').innerText = `Uploaded file: ${fileName}`;

    const loader = new OBJLoader();
    loader.load(
        fileURL,
        function (object) {
            handleUploadedObject(object);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        function (error) {
            console.log('An error happened');
        }
    );
});


function uploadObj() {
    // Trigger click event on the file input to open the file dialog
    fileInput.click();
}


function handleUploadedObject(object) {
    // Clear existing geometry and materials
    clearExistingGeometry();

    // Set the geometry for the uploaded object
    uploadedGeometry = object.clone();

    // Apply a MeshBasicMaterial to the uploaded geometry
    // const material = new THREE.MeshBasicMaterial({ color: grayColor });
    const material = new THREE.MeshNormalMaterial();
    uploadedGeometry.traverse((node) => {
        if (node.isMesh) {
            node.material = material;
        }
    });

    // Set the initial visibility
    uploadedGeometry.visible = true;

    // Add the uploaded geometry to the scene
    scene.add(uploadedGeometry);
    uploadedGeometry.scale.set(1, 1, 1); // Set the scale factor as needed

    uploadedGeometry.position.set(0, 0, 0); // Set the position as needed


    // Disable subdivision slider for uploaded geometry
    subdivisionController.domElement.style.pointerEvents = 'none';

    // Display the uploaded file name
    const fileName = document.getElementById('input').files[0].name;
    document.getElementById('uploadLabel').innerText = `Uploaded file: ${fileName}`;

    // Render the scene
    render();
}


function clearExistingGeometry() {
    if (uploadedGeometry) {
        scene.remove(uploadedGeometry);
        uploadedGeometry.traverse((node) => {
            if (node.isMesh) {
                node.geometry.dispose();
                node.material.dispose();
            }
        });
        uploadedGeometry = null;
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
    // Clear the scene if "upload" is selected and no OBJ file has been uploaded
    const selectedGeometry = params.geometry.toLowerCase();
    if (selectedGeometry === 'upload' && !uploadedGeometry) {
        // Hide other geometries
        meshNormal.visible = false;
        meshSmooth.visible = false;
        wireNormal.visible = false;
        wireSmooth.visible = false;

        // Remove existing colored points from the scene
        coloredPointsArrays.flat().forEach(points => scene.remove(points));

        // Clear the colored points array
        coloredPointsArrays = [];

        // Render the empty scene
        render();
        return;
    }

    // Show other geometries only if uploaded geometry doesn't exist
    if (!uploadedGeometry) {
        meshNormal.visible = true;
        meshSmooth.visible = true;
        wireNormal.visible = true;
        wireSmooth.visible = true;
    }

    // Dispose existing geometries and materials
    meshNormal.geometry.dispose();
    meshSmooth.geometry.dispose();
    wireNormal.geometry.dispose();
    wireSmooth.geometry.dispose();

    disposeMaterial(meshNormal.material);
    disposeMaterial(meshSmooth.material);

    // Create new geometries
    const normalGeometry = getGeometry();
    const baseSmoothGeometry = getGeometry(); // Create a base smooth geometry for iteration 0
    meshNormal.geometry = normalGeometry;
    meshSmooth.geometry = LoopSubdivision.modify(baseSmoothGeometry.clone(), params.iterations, params);

    // Create materials for normal and smooth geometries
    const normalMaterial = new THREE.MeshBasicMaterial({ color: grayColor });
    const smoothMaterial = standardMat.clone(); // Use the same material for smooth geometry
    meshNormal.material = normalMaterial;
    meshSmooth.material = smoothMaterial;

    // Create wireframe geometries
    wireNormal.geometry = new THREE.WireframeGeometry(normalGeometry);
    wireSmooth.geometry = new THREE.WireframeGeometry(meshSmooth.geometry);

    // Ensure the wireframe material is applied
    wireNormal.material.dispose();
    wireSmooth.material.dispose();
    wireNormal.material = wireMaterial.clone();
    wireSmooth.material = wireMaterial.clone();

    // Set the wireframe visibility
    wireNormal.visible = params.wireframe;
    wireSmooth.visible = params.wireframe;

    // Update wireframe positions to match the corresponding geometries
    wireNormal.position.copy(meshNormal.position);
    wireSmooth.position.copy(meshSmooth.position);

    // Remove existing colored points from the scene
    coloredPointsArrays.flat().forEach(points => scene.remove(points));

    // Clear the colored points array
    coloredPointsArrays = [];

    // Create colored points for iteration 0 of both normalGeometry and smoothGeometry
    const coloredPointsNormalIteration0 = createColoredPoints(normalGeometry, colors[0], new THREE.Vector3(-0.7, 0, 0), 0);
    const coloredPointsSmoothIteration0 = createColoredPoints(baseSmoothGeometry.clone(), colors[0], new THREE.Vector3(0.7, 0, 0), 0);

    if (coloredPointsNormalIteration0 && params.showColoredPoints) {
        scene.add(coloredPointsNormalIteration0);
        coloredPointsArrays[0] = coloredPointsArrays[0] || [];
        coloredPointsArrays[0].push(coloredPointsNormalIteration0);
    }

    if (coloredPointsSmoothIteration0 && params.showColoredPoints) {
        scene.add(coloredPointsSmoothIteration0);
        coloredPointsArrays[0] = coloredPointsArrays[0] || [];
        coloredPointsArrays[0].push(coloredPointsSmoothIteration0);
    }

    // Iterate through each iteration and create colored points for smoothGeometry only
    for (let i = 1; i <= params.iterations; i++) {
        const smoothGeometry = LoopSubdivision.modify(baseSmoothGeometry.clone(), i, params);

        // Create colored points for smoothGeometry only if visibility is on
        if (params.showColoredPoints) {
            const color = colors[i % colors.length];
            const coloredPointsSmooth = createColoredPoints(smoothGeometry, color, new THREE.Vector3(0.7, 0, 0), i);

            // Add the colored points to the scene
            if (coloredPointsSmooth) {
                scene.add(coloredPointsSmooth);
                coloredPointsArrays[i] = coloredPointsArrays[i] || [];
                coloredPointsArrays[i].push(coloredPointsSmooth);
            }
        }
    }

    // Render the scene
    render();
}

function disposeMaterial(material) {
    if (material) {
        if (material instanceof THREE.Material) {
            material.dispose();
        } else if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
        }
    }
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

function updateColoredPointsVisibility() {
    const visibility = params.showColoredPoints;

    // Set visibility for colored points in each iteration
    coloredPointsArrays.flat().forEach(points => (points.visible = visibility));

    render();
}

function render() {
    renderer.render(scene, camera);
}
