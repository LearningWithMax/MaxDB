// Pure settings and geometry for the opening: finishes, space black, the two sphere tiers, the glide math.
// No DOM and no three.js, so Node tests can import it.

export const SPACE_BLACK = '#07070b';

// The one finish the opening plays in: polished chrome, to match the chrome logo (the owner's pick; gold, emerald, gunmetal
// and orange are gone). A light neutral color and full metalness, so the tint comes from the room it reflects.
export const FINISHES = {
  chrome: { color: '#e6e8ec', metalness: 1.0, roughness: 0.12, clearcoat: 0.3 },
};

// What the chrome reflects: a dark room with a few bright softboxes (positions in world units around the logo, intensity is linear
// brightness over the room). A bright even room, which the opening used for gold, made chrome beads read as flat grey pearls;
// chrome looks like chrome through contrast, dark reflections next to bright streaks, with a warm bounce from below like the render.
export const STUDIO = {
  ambient: 0.1,
  panels: [
    { pos: [-6, 5, 5],  size: [7, 4], intensity: 10, color: '#fff3e0' },   // big warm key, top left
    { pos: [8, 1, 3],   size: [3, 9], intensity: 7,  color: '#e8f0ff' },   // tall cool strip, right
    { pos: [0, -7, 3],  size: [10, 2], intensity: 3, color: '#ffc78f' },   // low warm bounce, the bronze in the render
    { pos: [0, 8, -3],  size: [9, 3], intensity: 5,  color: '#ffffff' },   // top back
  ],
};

// Large-scale shading of the bead cloud, so the whole logo is lit like the chrome render and not just speckled: u and v run 0 to 1
// across the letters (v up). Returns red, green, blue multipliers for the bead at that spot.
export function chromeShade(u, v) {
  const light = 0.78 + 0.34 * v + 0.14 * (1 - u);          // brighter toward the top left, where the key light is
  const bounce = Math.pow(1 - v, 2);                       // the bronze bounce, strongest at the bottom edge
  return [light, light * (1 - 0.16 * bounce), light * (1 - 0.34 * bounce)];
}

// Sphere radius in logo pixels is clamp(distance / 3 * k, min, max). Full is about 3,400 fine spheres,
// lite is about 500 fat ones for phones. Anything unknown gets lite, never the heavy set by accident.
const TIERS = {
  full: { k: 0.5, min: 1.6, max: 6, pixelRatioCap: 1.5 },
  lite: { k: 1.3, min: 4.2, max: 18, pixelRatioCap: 1.5 },
};
export function tierParams(tier) {
  return TIERS[tier] || TIERS.lite;
}

// Scale and offset that move the on-screen letters (Rect in CSS px) onto the banner logo slot (Rect in CSS px).
export function glideTargets(letters, slot) {
  const c = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const a = c(letters), b = c(slot);
  return { scale: slot.width / letters.width, dx: b.x - a.x, dy: b.y - a.y };
}
