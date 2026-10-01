import * as THREE from 'three';

// The corkboard's "swap the two player cards" animation:
//   out:  each pin is pulled straight out and flicked away, the freed card sags and is
//         slid off to its side of the frame
//   swap: with the cards out of sight, their pictures are replaced (the caller's job)
//   in:   the new cards slide in from the sides, then the pins fly back, hover, and
//         stab in
// Everything is computed from elapsed time against each object's resting pose, so it
// always ends exactly where it started.

const STAGGER = 0.09; // the right card runs this much behind the left one

// out
const PIN_PULL = 0.2;
const PIN_FLY = 0.42;
const CARD_OUT_START = 0.15;
const CARD_OUT = 0.6;
const OUT_TOTAL = Math.max(PIN_PULL + PIN_FLY, CARD_OUT_START + CARD_OUT) + STAGGER;
// swap
const MIN_SWAP_WAIT = 0.12;
const MAX_SWAP_WAIT = 2.5; // don't hang forever on a slow avatar download
// in
const CARD_IN = 0.55;
const PIN_IN_START = 0.34;
const PIN_FLY_IN = 0.3;
const PIN_STAB = 0.08;
const IMPACT = PIN_IN_START + PIN_FLY_IN + PIN_STAB;
const SETTLE = 0.2;
const IN_TOTAL = IMPACT + SETTLE + STAGGER;

const TRAVEL = 1.2; // how far a card slides to be fully out of frame (m)
const LIFT = 0.07; // cards rise this far off the cork while moving, to clear the frame
const PIN_OUT = 0.1; // how far a pin is pulled out before it flies / hovers before the stab
const PIN_FLIGHT = 1.25;

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (x) => x * x * (3 - 2 * x);
const easeIn2 = (x) => x * x;
const easeIn3 = (x) => x * x * x;
const easeOut3 = (x) => 1 - (1 - x) ** 3;
const backOut = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2; // overshoots ~10%, then settles
const softBackOut = (x) => 1 + 1.6 * (x - 1) ** 3 + 0.6 * (x - 1) ** 2; // overshoots ~1%

// cards: the two card meshes; viewRight/viewUp: the corkboard camera's axes in world
// space; normal: the cork's normal, pointing at that camera.
export function createCardSwap({ cards, viewRight, viewUp, normal }) {
  const items = cards.map((card) => {
    // the pin is modelled as a child of its card; move it up a level so it can leave
    // the card behind
    const pin = card.children.find((c) => c.name.startsWith('Pin')) || null;
    if (pin) card.parent.attach(pin);
    const side = Math.sign(card.getWorldPosition(new THREE.Vector3()).dot(viewRight)
      - cards.reduce((sum, c) => sum + c.getWorldPosition(new THREE.Vector3()).dot(viewRight), 0) / cards.length) || 1;
    return {
      card,
      pin,
      side, // -1: left card, slides out to the left; +1: right
      cardRest: { position: card.position.clone(), quaternion: card.quaternion.clone() },
      pinRest: pin && { position: pin.position.clone(), quaternion: pin.quaternion.clone() },
    };
  });
  // left card first
  items.sort((a, b) => a.side - b.side);

  // world-space moves are applied in each object's parent space
  const parentInverse = new THREE.Matrix3();
  const parentQuat = new THREE.Quaternion();
  const worldRot = new THREE.Quaternion();
  const delta = new THREE.Vector3();
  function pose(object, rest, worldDelta, axis, angle) {
    object.parent.updateWorldMatrix(true, false);
    parentInverse.setFromMatrix4(object.parent.matrixWorld).invert();
    object.position.copy(rest.position).add(delta.copy(worldDelta).applyMatrix3(parentInverse));
    object.parent.getWorldQuaternion(parentQuat);
    worldRot.setFromAxisAngle(axis, angle);
    // rotate about a world axis: conjugate into the parent's frame
    object.quaternion.copy(parentQuat).invert().multiply(worldRot).multiply(parentQuat).multiply(rest.quaternion);
  }

  const spinAxis = new THREE.Vector3(0.6, 0.3, 0.74).normalize();
  const move = new THREE.Vector3();
  const flyDir = new THREE.Vector3();

  // slide: 0 = on the board, 1 = off to its side. tilt: radians about the cork normal.
  function poseCard(item, slide, tilt, lift) {
    move.copy(viewRight).multiplyScalar(item.side * TRAVEL * slide).addScaledVector(normal, LIFT * lift);
    pose(item.card, item.cardRest, move, normal, -item.side * tilt);
  }
  // out: 0 = stuck in, 1 = pulled out. flight: 0 = at the board, 1 = flung out of frame.
  function posePin(item, out, flight, visible) {
    if (!item.pin) return;
    item.pin.visible = visible;
    flyDir.copy(normal).multiplyScalar(0.45).addScaledVector(viewUp, 0.8).addScaledVector(viewRight, item.side * 0.3).normalize();
    move.copy(normal).multiplyScalar(PIN_OUT * out).addScaledVector(flyDir, PIN_FLIGHT * flight);
    pose(item.pin, item.pinRest, move, spinAxis, flight * 9);
  }

  let phase = null; // 'out' | 'swap' | 'in'
  let phaseStart = 0;
  let apply = null; // redraws the card pictures; may return a promise
  let queued = null; // a swap asked for while the new cards were already coming in
  let swapDone = false;

  function begin(now, applyFn) {
    phase = 'out';
    phaseStart = now;
    apply = applyFn;
  }

  function update(now) {
    if (!phase) return;
    const t = (now - phaseStart) / 1000;

    if (phase === 'out') {
      items.forEach((item, i) => {
        const tt = t - i * STAGGER;
        const pull = clamp01(tt / PIN_PULL);
        const fly = clamp01((tt - PIN_PULL) / PIN_FLY);
        posePin(item, backOut(pull), easeIn2(fly), fly < 1);
        const c = clamp01((tt - CARD_OUT_START) / CARD_OUT);
        // freed from the pin it sags a little, then gets pulled away
        const sag = 0.05 * smooth(clamp01((tt - PIN_PULL * 0.6) / 0.2));
        poseCard(item, easeIn3(c), sag + 0.3 * easeIn2(c), smooth(clamp01(c / 0.35)));
      });
      if (t >= OUT_TOTAL) {
        phase = 'swap';
        phaseStart = now;
        swapDone = false;
        Promise.resolve()
          .then(() => apply && apply())
          .catch((e) => console.warn('[cardSwap] updating the cards failed', e))
          .then(() => { swapDone = true; });
      }
    } else if (phase === 'swap') {
      if ((swapDone && t >= MIN_SWAP_WAIT) || t >= MAX_SWAP_WAIT) {
        phase = 'in';
        phaseStart = now;
      }
    } else if (phase === 'in') {
      items.forEach((item, i) => {
        const tt = t - i * STAGGER;
        const c = clamp01(tt / CARD_IN);
        const hit = tt - IMPACT; // seconds since the pin went in
        // only a slight overshoot past its spot: more and the two cards cross over
        poseCard(item, 1 - softBackOut(c), 0.3 * (1 - easeOut3(c)), 1 - smooth(clamp01((c - 0.55) / 0.45)));
        const fly = clamp01((tt - PIN_IN_START) / PIN_FLY_IN);
        const stab = clamp01((tt - PIN_IN_START - PIN_FLY_IN) / PIN_STAB);
        // the pin buries itself a touch too deep on impact, then springs back
        const sink = hit > 0 ? -0.06 * Math.exp(-hit * 30) : 0;
        posePin(item, 1 - easeIn3(stab) + sink, 1 - easeOut3(fly), tt >= PIN_IN_START);
      });
      if (t >= IN_TOTAL) {
        phase = null;
        items.forEach((item) => {
          poseCard(item, 0, 0, 0);
          posePin(item, 0, 0, true);
        });
        if (queued) {
          const next = queued;
          queued = null;
          begin(now, next);
        }
      }
    }
  }

  return {
    update,
    get running() { return phase !== null; },
    // applyFn swaps the card pictures; it is called once the cards are out of sight.
    start(applyFn, now = performance.now()) {
      if (!phase) begin(now, applyFn);
      // not swapped yet: the newest request is the one that should be shown
      else if (phase === 'out') apply = applyFn;
      else queued = applyFn;
    },
  };
}
