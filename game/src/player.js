// Player driving, on-foot movement and the chase camera for Solmar City 3D.
// The camera is LOW and CLOSE behind the car — the car stays large in the
// lower-centre frame, the way the top entries frame it.
import * as THREE from 'three';

export function createPlayer(carMesh) {
  const state = {
    speed: 0, // mph
    maxSpeed: 132,
    heading: Math.PI, // facing -Z down the boulevard
    onFoot: false,
    position: new THREE.Vector3(0, 0, 0),
    steering: 0,
    condition: 62, // percent dented is shown as 100 - condition in the HUD
  };

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function update(dt) {
    const accel = keys.KeyW || keys.ArrowUp ? 1 : 0;
    const brake = keys.KeyS || keys.ArrowDown ? 1 : 0;
    const left = keys.KeyA || keys.ArrowLeft ? 1 : 0;
    const right = keys.KeyD || keys.ArrowRight ? 1 : 0;
    state.steering = THREE.MathUtils.lerp(state.steering, right - left, dt * 8);

    if (state.onFoot) {
      const walkSpeed = 6;
      const move = (accel - brake) * walkSpeed;
      state.position.x += Math.sin(state.heading) * move * dt;
      state.position.z += Math.cos(state.heading) * move * dt;
      state.heading -= state.steering * dt * 2.2;
      state.speed = Math.abs(move) * 2.2;
    } else {
      if (accel) state.speed += 42 * dt;
      if (brake) state.speed -= 65 * dt;
      if (keys.Space) state.speed -= 90 * dt;
      state.speed -= state.speed * 0.12 * dt; // drag
      state.speed = THREE.MathUtils.clamp(state.speed, 0, state.maxSpeed);
      const turnRate = state.steering * dt * (0.9 - Math.min(0.55, state.speed / 240));
      state.heading -= turnRate * (state.speed > 1 ? 1 : 0);
      const metersPerSecond = (state.speed * 1609) / 3600;
      state.position.x += Math.sin(state.heading) * metersPerSecond * dt;
      state.position.z += Math.cos(state.heading) * metersPerSecond * dt;
    }

    carMesh.position.copy(state.position);
    carMesh.rotation.y = state.heading;
    return state;
  }

  return { state, keys, update };
}

// Low close chase camera: ~7 m behind, ~2 m up, looking just past the car
// so the car fills the lower frame and the road ahead stays visible.
export function createChaseCamera(camera) {
  const smoothed = new THREE.Vector3(0, 2, 7);
  const lookTarget = new THREE.Vector3();
  return {
    update(playerState, dt, instant = false) {
      const back = new THREE.Vector3(
        -Math.sin(playerState.heading), 0, -Math.cos(playerState.heading),
      );
      const desired = new THREE.Vector3(
        playerState.position.x + back.x * 7.2,
        playerState.position.y + 2.05,
        playerState.position.z + back.z * 7.2,
      );
      // Never let the camera sink below the street.
      desired.y = Math.max(desired.y, 1.5);
      if (instant) {
        smoothed.copy(desired);
      } else {
        smoothed.lerp(desired, 1 - Math.exp(-dt * 5.5));
      }
      camera.position.copy(smoothed);
      lookTarget.set(
        playerState.position.x + Math.sin(playerState.heading) * 9,
        playerState.position.y + 1.1,
        playerState.position.z + Math.cos(playerState.heading) * 9,
      );
      camera.lookAt(lookTarget);
    },
  };
}

// Fixed cinematic camera for a screenshot pose: position + target.
export function frameShot(camera, position, target) {
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
}
