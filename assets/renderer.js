// This is a little rendering script for NuScenes and other traffic datasets.
// It's not polished at all.
// This is not intended for reuse and so the code is a bit of a mess.
// If you're interested in using this yourself,
// please reach out to Florian Golemo, fgolemo@gmail.com
// I'd be happy to make this into a standalone visualizer.
// I just don't know if anybody cares.


import * as THREE from './three.module.js'
import { OrbitControls } from './OrbitControls.js'
// import Stats from './stats.module.js'


const scene = new THREE.Scene()

// wtf Y is up???
// var capturer = new ccap.CCapture( { format: 'png' } );

const canvasElm = document.getElementById('canvas');
const canvasSize = canvasElm.getBoundingClientRect();

const camera = new THREE.PerspectiveCamera(75, canvasSize.width / canvasSize.height, 0.01, 100)
camera.position.x = .8
camera.position.y = .85
camera.position.z = .8


const renderer = new THREE.WebGLRenderer( { canvas: canvasElm } );
renderer.setSize(canvasSize.width, canvasSize.height)
renderer.setClearColor( 0xffffff, 1);
// document.body.appendChild(renderer.domElement)


const controls = new OrbitControls(camera, renderer.domElement)


const light = new THREE.PointLight(0xffffff, 1)
light.position.set(10, 10, 10)
scene.add(light)

const light2 = new THREE.PointLight(0xffaaff, 1)
light2.position.set(-10, 10, 10)
scene.add(light2)

const light3 = new THREE.PointLight(0xaaffff, 1)
light3.position.set(10, 10, -10)
scene.add(light3)

const light4 = new THREE.AmbientLight(0x404040, 1) // soft white light
scene.add(light4)

// window.addEventListener(
//     'resize',
//     () => {
//         camera.aspect = window.innerWidth / window.innerHeight
//         camera.updateProjectionMatrix()
//         renderer.setSize(window.innerWidth, window.innerHeight)
//         render()
//     },
//     false,
// )

// const stats = Stats()
// document.body.appendChild(stats.dom)

const text = document.getElementById("info");
const labels = ["Ground Truth Trajectory\n(both turn)", "AutoBots Prediction 1\n(both turn)", "AutoBots Prediction 2\n(left yields)", "AutoBots Prediction 3\n(possible danger)", "AutoBots Prediction 4\n(right yields)"]

const floor_geom = new THREE.PlaneGeometry(2, 2) // width, height, no depth for plane
var floor_tex = new THREE.TextureLoader().load(
    './assets/boston-55-8.png',
)
const floor_mat = new THREE.MeshBasicMaterial({
    // color: 0xeba6f5,
    side: THREE.FrontSide,
    map: floor_tex, // texture as a map for material
})
const floor = new THREE.Mesh(floor_geom, floor_mat) // mesh takes just two parameters
floor.position.x = 0
floor.position.y = 0
floor.position.z = 0
floor.rotation.x = -Math.PI / 2

scene.add(floor)

const SUBSTEPS = 20

const car_geom = new THREE.BoxGeometry(0.1, 0.05, 0.05)
const car_mat = new THREE.MeshStandardMaterial({
    color: 0x94D0FF,
    opacity: 0.7,
    transparent: true,
    roughness: 1,
})
const ped_geom = new THREE.CylinderGeometry(0.025, 0.025, 0.05)
const ped_mat = new THREE.MeshStandardMaterial({
    color: 0x94D0FF,
    // wireframe: true,
    opacity: 0.7,
    transparent: true,
    roughness: 1,
})
const mat_wire = new THREE.MeshStandardMaterial({
    wireframe: true,
})
const circle_geom = new THREE.CircleGeometry( 0.01, 32 );
const circle_mat = new THREE.MeshBasicMaterial( { color: 0xffff00 } );

const line_mat = new THREE.LineBasicMaterial( { color: 0xffffff,linewidth: 5 } );


var objects = []
let optimus;
// not using this in production bc very slow
// new MTLLoader()
//     .setMaterialOptions({
//         invertTrProperty: 1,
//     })
//     .load( 'optimus-truck-v5-half.obj.mtl', function ( materials ) {
//         materials.preload();
//         new OBJLoader()
//             .setMaterials( materials )
//             .load( 'optimus-truck-v5-half.obj', object => {
//                 object.position.set(0,0,0);
//                 object.scale.set(0.00010,0.00010,0.00010);
//
//                 object.children[0].geometry.rotateY(Math.PI/2);
//
//                 object.children[0].geometry.center();
//                 for (const mIdx in object.children[0].material){
//                     object.children[0].material[mIdx].opacity = 0.8
//                     object.children[0].material[mIdx].transparent= true
//                 }
//                 optimus = object;
//                 loadTraj();
//             }, onProgress );
//     } );

const good_trajectories = [8, 3, 9, 1]

function loadTraj() {
    const loader = new THREE.FileLoader()
    loader.setResponseType('json')
    loader.load(
        // resource URL
        './assets/data-55-0.json',

        // onLoad callback
        function(data) {
            // output the text to the console
            console.log(data)
            for (const idx in data) {

                let obj_box
                let obj_car
                if (data[idx]['type'] == 'car') {
                    obj_box = new THREE.Mesh(car_geom, car_mat)
                    // obj_car = optimus.clone();
                } else if (data[idx]['type'] == 'pedestrian') {
                    obj_box = new THREE.Mesh(ped_geom, ped_mat)
                } else {
                    console.log('obj type not recognized:' + data[idx]['type'])
                }

                let steps_x = data[idx]['inputs_x'].concat(data[idx]['outputs_x'])
                let steps_y = data[idx]['inputs_y'].concat(data[idx]['outputs_y'])
                if (idx == 2) { // weird special case with error
                    steps_x = steps_x.slice(0, -4)
                    steps_y = steps_y.slice(0, -4)
                }
                let predictions = []
                for (const predIdx in data[idx]['predictions']) {
                    let pred = data[idx]['predictions'][predIdx]
                    predictions.push({
                        x: pred['outputs_x'],
                        y: pred['outputs_y'],
                        yaw: pred['outputs_yaw'],
                    })
                }
                let pos = new THREE.Vector3(data[idx]['inputs_x'][0], 0.0001, -data[idx]['inputs_y'][0])
                let rot = data[idx]['inputs_yaw'][0]
                obj_box.position.copy(pos)
                obj_box.rotation.set(0, rot, 0)
                scene.add(obj_box)

                let circle = new THREE.Mesh(circle_geom, circle_mat.clone());
                circle.position.copy(pos)
                circle.rotation.set(-Math.PI/2,0,0)
                circle.material.color.setHex(color_in);
                scene.add(circle);

                objects.push({
                    kind: data[idx]['type'],
                    handle_car: obj_car,
                    handle_box: obj_box,
                    handle: obj_box,
                    waypoints: [circle],
                    waypoint_lines: [],
                    steps_x_gt: steps_x,
                    steps_y_gt: steps_y,
                    steps_yaw_gt: data[idx]['inputs_yaw'].concat(data[idx]['outputs_yaw']),
                    in_steps: data[idx]['inputs_x'].length,
                    predictions: predictions,
                })

            }
        },
        // onProgress callback
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded')
        },
        // onError callback
        function(err) {
            console.error('IDK WTF happened here')
            console.dir(err)
        },
    )
}

loadTraj();

let step = 0;
let prediction = 0;
let lastStep = -1;
let color_in = 0x94D0FF;
let color_out = 0xFF6AD5;
let color_pred = 0x966BFF;

const MOVE_THRESHOLD = 0.02;

let show_gt = true;

function cleanWaypointsAndReset() {
    for (const objIdx in objects) {
        let o = objects[objIdx]
        for (const wIdx in o.waypoints) {
            scene.remove(o.waypoints[wIdx]);
        }
        for (const wpIdx in o.waypoint_lines) {
            scene.remove(o.waypoint_lines[wpIdx]);
        }
        o.waypoints = [];
        o.waypoint_lines = [];
        o.handle.material.color.setHex(color_in)
    }

}

function moveObjsSeq() {

    let dones = 0;
    for (const objIdx in objects) {
        let o = objects[objIdx]
        let majorStep = Math.floor(step / SUBSTEPS)
        let subStep = step % SUBSTEPS
        if (majorStep >= o.steps_x_gt.length) dones+=1;

        let current_x_major
        let current_y_major
        let pos, rot;
        if (show_gt || majorStep < o.in_steps) {
            current_x_major = o.steps_x_gt[majorStep]
            current_y_major = -o.steps_y_gt[majorStep]
            let current_yaw_major_gt = o.steps_yaw_gt[majorStep]
            let next_x_major_gt = o.steps_x_gt[majorStep + 1]
            let next_y_major_gt = -o.steps_y_gt[majorStep + 1]
            let next_yaw_major_gt = o.steps_yaw_gt[majorStep + 1]
            let diff_x_gt = (next_x_major_gt - current_x_major) * (subStep / SUBSTEPS)
            let diff_y_gt = (next_y_major_gt - current_y_major) * (subStep / SUBSTEPS)
            let diff_yaw_gt = (next_yaw_major_gt - current_yaw_major_gt) * (subStep / SUBSTEPS)
            if ((next_x_major_gt - current_x_major) < MOVE_THRESHOLD && (next_y_major_gt - current_y_major) < MOVE_THRESHOLD) {
                diff_yaw_gt = 0;
            }

            pos = new THREE.Vector3(current_x_major + diff_x_gt, 0.025, current_y_major + diff_y_gt)
            rot = current_yaw_major_gt + diff_yaw_gt
        } else {
            let pred = o.predictions[good_trajectories[prediction]]
            current_x_major = pred['x'][majorStep - o.in_steps]
            current_y_major = -pred['y'][majorStep - o.in_steps]
            let current_yaw_major_p = pred['yaw'][majorStep - o.in_steps]
            let next_x_major_p = pred['x'][majorStep - o.in_steps + 1]
            let next_y_major_p = -pred['y'][majorStep - o.in_steps + 1]
            let next_yaw_major_p = pred['yaw'][majorStep - o.in_steps + 1]
            let diff_x_p = (next_x_major_p - current_x_major) * (subStep / SUBSTEPS)
            let diff_y_p = (next_y_major_p - current_y_major) * (subStep / SUBSTEPS)
            let diff_yaw_p = (next_yaw_major_p - current_yaw_major_p) * (subStep / SUBSTEPS)
            if ((next_x_major_p - current_x_major) < MOVE_THRESHOLD && (next_y_major_p - current_y_major) < MOVE_THRESHOLD) {
                diff_yaw_p = 0;
            }

            pos = new THREE.Vector3(current_x_major + diff_x_p, 0.025, current_y_major + diff_y_p)
            rot = current_yaw_major_p + diff_yaw_p
        }

        // add waypoints and lines
        if (subStep == 0 && majorStep < o.steps_x_gt.length && current_x_major !== undefined) {
            let circle = new THREE.Mesh(circle_geom, circle_mat.clone());
            let wpPos = new THREE.Vector3(current_x_major, 0.00001, current_y_major)
            circle.position.copy(wpPos)
            circle.rotation.set(-Math.PI/2,0,0)
            let color;
            if (majorStep < o.in_steps) {
                color = color_in;
            } else{
                if (show_gt) color = color_out;
                else color = color_pred
            }
            circle.material.color.setHex(color);

            if (o.waypoints.length > 0) {
                const line_geom = new THREE.BufferGeometry().setFromPoints( [
                    o.waypoints[o.waypoints.length - 1].position,
                    wpPos
                ] );

                const line = new THREE.Line( line_geom, line_mat );
                o.waypoint_lines.push(line);
                scene.add(line);
            }

            o.waypoints.push(circle);
            scene.add(circle);

        }

        if (o.kind == 'car') { pos.y = 0.045}
        o.handle.position.copy(pos)
        o.handle.rotation.set(0, rot, 0)

        if (majorStep == o.in_steps && subStep == 0) {
            let color
            // if (o.kind == 'car' && !show_gt) {
            //     // o.handle_car.position.copy(o.handle.position)
            //     // o.handle_car.rotation.copy(o.handle.rotation)
            //     // scene.remove(o.handle)
            //     // o.handle = o.handle_car
            //     // scene.add(o.handle)
            //     // color = 0xFF6AD5
            //
            // } else {
            // color = 0xFFDE8B
            if (show_gt) color = color_out;
            else color = color_pred
            o.handle.material.color.setHex(color);
            // }

        }
    }
    if (dones == objects.length && objects.length > 0) {
        if (lastStep == -1) {
            lastStep = step;
        }
        else if (step == lastStep + 20) {
            // reset the scene

            if (show_gt) {
                show_gt = false;
                text.innerText = labels[1];
            } else if (prediction < objects[0].predictions.length-1){
                prediction+=1;
                text.innerText = labels[prediction+1];
                console.log(prediction);
                if (prediction == 4) return true; //TODO: this is temporary
            } else {
                return true;
            }
            step = -1;
            lastStep = -1;
            cleanWaypointsAndReset();
        }
    }
    return false;

}


var period = 12000; // rotation time in seconds
// var clock = new THREE.Clock();
var matrix = new THREE.Matrix4();
let lookat = floor.position.clone();
lookat.z+=.25;

text.innerText = labels[0];

function animate() {
    requestAnimationFrame(animate)

    let all_done = moveObjsSeq();
    if (all_done) {
        camera.position.x = .8
        camera.position.y = .85
        camera.position.z = .8
        camera.lookAt(lookat);
        step = 0;
        prediction = 0;
        lastStep = -1;
        show_gt = true;
        cleanWaypointsAndReset();
        text.innerText = labels[0];
        console.log("done resetting scene");
    }
    controls.update()

    // Create a generic rotation matrix that will rotate an object
    // The math here just makes it rotate every 'period' seconds.
    // matrix.makeRotationY(-rotation_counter  * Math.PI / period);
    matrix.makeRotationY( -2 * Math.PI / period);

    // Apply matrix like this to rotate the camera.
    camera.position.applyMatrix4(matrix);

    // Make camera look at the box.

    camera.lookAt(lookat);
    render()

    // stats.update()
    step += 1;

}

function render() {
    renderer.render(scene, camera)
}

animate();
