import * as THREE from 'three';
import type { CollisionWorld } from '../core/Collision';
import { angleDiff, clamp, damp } from '../core/rng';

/** Third-person orbit camera with wall avoidance and a chase mode for driving. */
export class CameraRig {
  yaw = 0;
  pitch = 0.32;
  distance = 5.5;
  private curDist = 5.5;
  private target = new THREE.Vector3();
  private idle = 0;
  private shake = 0;
  private fovKick = 0;
  baseFov = 62;
  /** Lower inside buildings so the camera stays under the ceiling. */
  maxPitch = 1.2;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  addShake(s: number): void {
    this.shake = Math.min(1, this.shake + s);
  }

  private snapNext = true;

  /** Face `heading` and jump straight to the focus next frame (teleports, spawns). */
  snapBehind(heading: number): void {
    this.yaw = heading;
    this.idle = 0;
    this.snapNext = true;
  }

  /**
   * focus: point to orbit. followHeading: when set (driving / moving on touch),
   * swing gently behind it after a moment without manual look input.
   */
  update(
    dt: number,
    look: { x: number; y: number },
    focus: THREE.Vector3,
    world: CollisionWorld,
    opts: { followHeading?: number; followDelay?: number; distance: number; speed?: number; snap?: boolean },
  ): void {
    const manual = Math.abs(look.x) + Math.abs(look.y) > 1e-5;
    this.yaw -= look.x;
    this.pitch = clamp(this.pitch + look.y, -0.25, this.maxPitch);
    if (manual) this.idle = 0;
    else this.idle += dt;
    if (opts.followHeading !== undefined && this.idle > (opts.followDelay ?? 1.2)) {
      this.yaw += angleDiff(this.yaw, opts.followHeading) * damp(2.2, dt);
      this.pitch += (0.28 - this.pitch) * damp(1.5, dt);
    }
    if (opts.snap || this.snapNext || this.target.distanceToSquared(focus) > 900) {
      this.target.copy(focus);
      this.curDist = opts.distance;
      this.snapNext = false;
    } else this.target.lerp(focus, damp(14, dt));
    this.distance = opts.distance;
    // Camera sits behind the look direction.
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    const hit = world.raycast(this.target.x, this.target.y, this.target.z, dir.x, dir.y, dir.z, this.distance);
    const want = Math.max(1.2, hit - 0.35);
    // Pull in fast, ease back out slowly.
    this.curDist += (want - this.curDist) * damp(want < this.curDist ? 20 : 3, dt);
    const pos = this.target.clone().addScaledVector(dir, this.curDist);
    if (pos.y < 0.4) pos.y = 0.4;
    if (this.shake > 0) {
      const s = this.shake * 0.25;
      pos.x += (Math.random() - 0.5) * s;
      pos.y += (Math.random() - 0.5) * s;
      pos.z += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target.x, this.target.y + 0.2, this.target.z);
    const kick = clamp(((opts.speed ?? 0) - 12) / 30, 0, 1) * 12;
    this.fovKick += (kick - this.fovKick) * damp(3, dt);
    const fov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
