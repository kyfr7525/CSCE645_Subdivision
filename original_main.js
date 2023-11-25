import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
// import LoopSubdivision from './Subdivision';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// Actually do stuff
const geometry = new THREE.TorusGeometry(10, 3, 16, 100); 
const material = new THREE.MeshNormalMaterial(); 
const torus = new THREE.Mesh( geometry, material ); 
scene.add( torus );

const light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set(2.5, 7.5, 15);
scene.add( light );
var heliMat = new THREE.MeshNormalMaterial();

const loader = new OBJLoader();
loader.load(
    './resources/helicopter_body2.obj',
    function(object) {
        object.traverse( function ( node ) {
            if ( node.isMesh ) node.material = heliMat;
        });
        object.position.set(0,0,0);
        scene.add(object);
    },
    function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
    function ( error ) {
		console.log( 'An error happened' );
	}
);
loader.load(
    './models/helicopter_body1.obj',
    function(object) {
        object.traverse( function ( node ) {
            if ( node.isMesh ) node.material = heliMat;
        });
        object.position.set(0,0,0);
        scene.add(object);
    },
    function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
    function ( error ) {
		console.log( 'An error happened' );
	}
);

camera.position.x = 3;
camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();