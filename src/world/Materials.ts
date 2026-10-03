import * as THREE from 'three';

/** Shared uniforms so every lit window / lamp in the city reacts to night & blackouts. */
export const worldUniforms = {
  uNight: { value: 0 },
  uBlackout: { value: 0 },
};

/**
 * Building material: procedural windows from world position so one instanced
 * draw call can render thousands of differently sized buildings.
 */
export function buildingMaterial(opts: { glassy?: boolean } = {}): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const glassy = opts.glassy ? 1 : 0;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = worldUniforms.uNight;
    shader.uniforms.uBlackout = worldUniforms.uBlackout;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAbWPos;\nvarying vec3 vAbWNrm;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 abWp = vec4(transformed, 1.0);
        vec3 abN = objectNormal;
        #ifdef USE_INSTANCING
          abWp = instanceMatrix * abWp;
          abN = mat3(instanceMatrix) * abN;
        #endif
        vAbWPos = (modelMatrix * abWp).xyz;
        vAbWNrm = normalize(mat3(modelMatrix) * abN);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vAbWPos;
        varying vec3 vAbWNrm;
        uniform float uNight;
        uniform float uBlackout;
        float abHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float abGlow = 0.0;
        vec3 abN = normalize(vAbWNrm);
        if (abs(abN.y) < 0.5) {
          float hAxis = abs(abN.x) > 0.5 ? vAbWPos.z : vAbWPos.x;
          vec2 cuv = vec2(hAxis / ${glassy ? '2.4' : '3.2'}, vAbWPos.y / 3.4);
          vec2 f = fract(cuv);
          vec2 id = floor(cuv);
          float win = step(${glassy ? '0.06' : '0.2'}, f.x) * step(f.x, ${glassy ? '0.94' : '0.8'}) * step(0.26, f.y) * step(f.y, ${glassy ? '0.92' : '0.78'});
          win *= step(0.5, vAbWPos.y - 0.6);
          vec3 glass = mix(vec3(0.14, 0.2, 0.28), vec3(0.32, 0.46, 0.58), ${glassy}.0 * 0.6 + f.y * 0.25);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.88);
          // Darker band at the base like a shop front / plinth.
          diffuseColor.rgb *= mix(0.78, 1.0, step(0.9, vAbWPos.y));
          float h = abHash(id + floor(vAbWPos.xz / 37.0) * 7.0 + abN.xz * 3.0);
          abGlow = win * step(0.42, h) * uNight * (1.0 - uBlackout);
        } else {
          diffuseColor.rgb *= 0.82;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * abGlow * 0.95;`,
      );
  };
  mat.customProgramCacheKey = () => 'abuja-building-' + glassy;
  return mat;
}

/** Emissive material that glows at night (street lamps, signage). */
export function nightGlowMaterial(color: number, dayColor = 0x777777): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ color: dayColor, emissive: color, emissiveIntensity: 0 });
  mat.userData.nightGlow = true;
  return mat;
}

export function updateGlowMaterials(mats: THREE.MeshLambertMaterial[], night: number, blackout: number): void {
  const k = night * (1 - blackout);
  for (const m of mats) m.emissiveIntensity = k * (m.userData.glowStrength ?? 1.2);
}

const texCache = new Map<string, THREE.Texture>();

/** Canvas text sign texture (billboards, shop signs). */
export function signTexture(text: string, opts: { bg?: string; fg?: string; w?: number; h?: number; font?: string; sub?: string } = {}): THREE.Texture {
  const key = JSON.stringify([text, opts]);
  const hit = texCache.get(key);
  if (hit) return hit;
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = opts.bg ?? '#0f6b3a';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = Math.max(4, h * 0.05);
  g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
  g.fillStyle = opts.fg ?? '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = Math.floor(h * (opts.sub ? 0.42 : 0.55));
  g.font = `900 ${size}px ${opts.font ?? 'system-ui, sans-serif'}`;
  while (g.measureText(text).width > w * 0.9 && size > 10) {
    size -= 2;
    g.font = `900 ${size}px ${opts.font ?? 'system-ui, sans-serif'}`;
  }
  g.fillText(text, w / 2, opts.sub ? h * 0.38 : h / 2);
  if (opts.sub) {
    let s2 = Math.floor(h * 0.2);
    g.font = `700 ${s2}px system-ui, sans-serif`;
    while (g.measureText(opts.sub).width > w * 0.9 && s2 > 8) {
      s2 -= 1;
      g.font = `700 ${s2}px system-ui, sans-serif`;
    }
    g.fillText(opts.sub, w / 2, h * 0.75);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

/** Set a solid vertex colour on a geometry (adds the attribute). */
export function paint(geo: THREE.BufferGeometry, color: number | THREE.Color): THREE.BufferGeometry {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Ensure geometry has position/normal/uv/color and is indexed, so it can be merged. */
export function normalizeGeo(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.index) {
    const n = geo.attributes.position.count;
    const idx: number[] = [];
    for (let i = 0; i < n; i++) idx.push(i);
    geo.setIndex(idx);
  }
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.color) paint(geo, 0xffffff);
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
  return geo;
}
