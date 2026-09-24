import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/utils/particleEngine.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
const sandbox = { module: { exports: {} }, window: {} };
vm.runInNewContext(code, sandbox);
const { ParticleWordmarkEngine } = sandbox.module.exports;

// The physics only ever touches the container's own window (frame clock); the
// step()/particle internals the assertions drive are plain object state.
const containerStub = () => ({ ownerDocument: { defaultView: { performance: { now: () => 0 } } } });

const OPTIONS = {
  colorMode: 'original',
  color: '#6C31E3',
  color2: '#E36C31',
  zoom: 1.9,
  spacing: 2.2,
  dotSize: 0.5,
  repulsionRadius: 124,
  repulsionStrength: 1.8,
  ambientMotion: 'none',
};

/** recoverySpeed omitted entirely must behave like the default (old settings objects). */
function createEngine(recoverySpeed) {
  const options = recoverySpeed === undefined ? { ...OPTIONS } : { ...OPTIONS, recoverySpeed };
  return new ParticleWordmarkEngine(containerStub(), options);
}

function makeRow(engine, count = 320, spacing = 2.2) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const hx = i * spacing;
    particles.push({ x: hx, y: 0, hx, hy: 0, vx: 0, vy: 0, radius: 1, fill: 'rgb(1, 2, 3)' });
  }
  engine.particles = particles;
  return particles;
}

const REFERENCE_FRAME_MS = 1000 / 60;

function maxDisplacement(particles) {
  let max = 0;
  for (const particle of particles) {
    const distance = Math.hypot(particle.x - particle.hx, particle.y - particle.hy);
    if (distance > max) max = distance;
  }
  return max;
}

/**
 * Sweeps the cursor across the row of resting particles once and then lets the
 * physics settle. The cursor position is a function of wall-clock time, so runs
 * with different step sizes follow the identical path and stay comparable.
 * `dt` is the step size in 60 Hz reference frames (1 = 60 Hz, 0.5 = 120 Hz).
 */
function cursorPass(engine, { dt = 1, passSeconds = 1.5, seconds = 16 } = {}) {
    const particles = engine.particles;
    const probe = particles[Math.floor(particles.length / 2)];
    const width = particles[particles.length - 1].hx;
    const sweep = width + 400;
    const dtSeconds = (dt * REFERENCE_FRAME_MS) / 1000;
    const frames = Math.round(seconds / dtSeconds);
    const samples = [];
    let leaveTime = null;
    let peak = 0;
    let peakAfterLeave = 0;
    let visibleAfterLeave = 0;
    let stillAfterLeave = 0;
    let bouncesAfterLeave = 0;
    let lastOffsetSign = 0;
    let armed = false;
    for (let frame = 0; frame <= frames; frame++) {
        const time = frame * dtSeconds;
        if (time <= passSeconds) {
            engine.mouse.x = -200 + (time / passSeconds) * sweep;
            engine.mouse.y = 0;
        } else {
            if (leaveTime === null) leaveTime = time;
            engine.mouse.x = -9999;
            engine.mouse.y = -9999;
        }
        engine.step(dt);
        const distance = maxDisplacement(particles);
        samples.push({ time, distance });
        const offset = probe.x - probe.hx;
        if (time <= passSeconds) {
            if (distance > peak) peak = distance;
        } else {
            if (distance > peakAfterLeave) peakAfterLeave = distance;
            if (distance > 0.5) visibleAfterLeave = time - leaveTime;
            if (distance > 0.05) stillAfterLeave = time - leaveTime;
            // Count overshoots of the tracked particle: a zero crossing only
            // counts when the swing that led to it was actually visible.
            if (Math.abs(offset) > 0.5) armed = true;
            const sign = Math.sign(offset);
            if (armed && sign !== 0 && lastOffsetSign !== 0 && sign !== lastOffsetSign) {
                bouncesAfterLeave++;
                armed = false;
            }
            if (sign !== 0) lastOffsetSign = sign;
        }
    }
    return {
        samples,
        peak,
        peakAfterLeave,
        visibleAfterLeave,
        stillAfterLeave,
        bouncesAfterLeave,
        finalDistance: samples[samples.length - 1].distance,
    };
}

/** Distance at an arbitrary wall-clock time, linearly interpolated from a run. */
function distanceAt(run, time) {
    const samples = run.samples;
    if (time <= samples[0].time) return samples[0].distance;
    for (let i = 1; i < samples.length; i++) {
        if (samples[i].time >= time) {
            const previous = samples[i - 1];
            const ratio = (time - previous.time) / (samples[i].time - previous.time);
            return previous.distance + ratio * (samples[i].distance - previous.distance);
        }
    }
    return samples[samples.length - 1].distance;
}

/**
 * The fixed solver this release replaces (spring 0.02, damping 0.12 per frame),
 * kept here only as the baseline the new default has to beat.
 */
function legacyPass({ passSeconds = 1.5, seconds = 16 } = {}) {
    const particles = [];
    for (let i = 0; i < 320; i++) {
        const hx = i * 2.2;
        particles.push({ x: hx, y: 0, hx, hy: 0, vx: 0, vy: 0 });
    }
    const width = particles[particles.length - 1].hx;
    const sweep = width + 400;
    const radius = 124;
    const radiusSquared = radius * radius;
    const frames = Math.round((seconds * 1000) / REFERENCE_FRAME_MS);
    const probe = particles[Math.floor(particles.length / 2)];
    let mouseX = -200;
    let mouseY = 0;
    let leaveTime = null;
    let visibleAfterLeave = 0;
    let peak = 0;
    let bouncesAfterLeave = 0;
    let lastOffsetSign = 0;
    let armed = false;
    for (let frame = 0; frame <= frames; frame++) {
        const time = (frame * REFERENCE_FRAME_MS) / 1000;
        if (time <= passSeconds) {
            mouseX = -200 + (time / passSeconds) * sweep;
        } else {
            if (leaveTime === null) leaveTime = time;
            mouseX = -9999;
            mouseY = -9999;
        }
        for (const particle of particles) {
            const dx = particle.x - mouseX;
            const dy = particle.y - mouseY;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared < radiusSquared && distanceSquared > 0.0001) {
                const distance = Math.sqrt(distanceSquared);
                const ratio = (radius - distance) / radius;
                const force = ratio * ratio * 1.8;
                particle.vx += (dx / distance) * force;
                particle.vy += (dy / distance) * force;
            }
            particle.vx += (particle.hx - particle.x) * 0.02;
            particle.vy += (particle.hy - particle.y) * 0.02;
            particle.vx *= 1 - 0.12;
            particle.vy *= 1 - 0.12;
            particle.x += particle.vx;
            particle.y += particle.vy;
        }
        const distance = maxDisplacement(particles);
        if (time <= passSeconds) {
            if (distance > peak) peak = distance;
        } else {
            if (distance > 0.5) visibleAfterLeave = time - leaveTime;
            const offset = probe.x - probe.hx;
            if (Math.abs(offset) > 0.5) armed = true;
            const sign = Math.sign(offset);
            if (armed && sign !== 0 && lastOffsetSign !== 0 && sign !== lastOffsetSign) {
                bouncesAfterLeave++;
                armed = false;
            }
            if (sign !== 0) lastOffsetSign = sign;
        }
    }
    return { visibleAfterLeave, peak, bouncesAfterLeave };
}

function passAt(speed, options) {
    const engine = createEngine(speed);
    makeRow(engine);
    return cursorPass(engine, options);
}

// --- 1. Recovery speed drives the real physics, monotonically -----------------
const speeds = [0.6, 0.8, 1, 1.4, 2, 2.5];
const runs = speeds.map((speed) => passAt(speed));
for (const run of runs) {
    assert.ok(Number.isFinite(run.peak) && run.peak > 0, 'the cursor must disturb the particles');
    assert.ok(Number.isFinite(run.finalDistance), 'displacement must stay finite');
    // Bounded: the wordmark may scatter, but it must not blow up.
    assert.ok(run.peak < 150, `peak displacement ${run.peak.toFixed(1)}px is out of bounds`);
    // Still settling at the end: a decaying response, never sustained oscillation.
    assert.ok(run.finalDistance < 0.01, `displacement ${run.finalDistance}px did not decay`);
}
for (let i = 1; i < runs.length; i++) {
    assert.ok(
        runs[i].visibleAfterLeave < runs[i - 1].visibleAfterLeave,
        `recovery speed ${speeds[i]} must settle faster than ${speeds[i - 1]}: ` +
            `${runs[i].visibleAfterLeave.toFixed(2)}s vs ${runs[i - 1].visibleAfterLeave.toFixed(2)}s`,
    );
}

// --- 2. The new default ripples markedly longer than the old fixed solver -----
const legacy = legacyPass();
const [slowest, , , defaultRun, , fastest] = runs;
assert.ok(
    defaultRun.visibleAfterLeave > 2 * legacy.visibleAfterLeave,
    `default ripple (${defaultRun.visibleAfterLeave.toFixed(2)}s) must linger well past the old solver ` +
        `(${legacy.visibleAfterLeave.toFixed(2)}s)`,
);
assert.ok(defaultRun.peak > legacy.peak, 'the default ripple should read more clearly than the old snap-back');
assert.ok(fastest.visibleAfterLeave < legacy.visibleAfterLeave * 2, 'the fast end should stay close to the old snap');
assert.ok(fastest.visibleAfterLeave < 1.5, 'the fast end must still settle quickly');
assert.ok(slowest.visibleAfterLeave > defaultRun.visibleAfterLeave, 'the slow end must linger even longer');
assert.ok(defaultRun.bouncesAfterLeave > legacy.bouncesAfterLeave,
    `the default must overshoot more than the old solver: ${defaultRun.bouncesAfterLeave} vs ${legacy.bouncesAfterLeave} bounces`);
assert.ok(defaultRun.bouncesAfterLeave >= 3, `the default must visibly overshoot, got ${defaultRun.bouncesAfterLeave} bounces`);

// --- 3. Frame rate independence ----------------------------------------------
const dtValues = [1, 0.5, 1 / 3];
const rateRuns = dtValues.map((dt) => passAt(1, { dt }));
const reference = rateRuns[0];
for (let i = 1; i < rateRuns.length; i++) {
    const run = rateRuns[i];
    for (let time = 1.5; time <= 8; time += 0.25) {
        const expected = distanceAt(reference, time);
        const actual = distanceAt(run, time);
        const tolerance = Math.max(0.05, expected * 0.05);
        assert.ok(
            Math.abs(actual - expected) <= tolerance,
            `step size ${dtValues[i]} drifts from 60 Hz at t=${time.toFixed(2)}s: ` +
                `${actual.toFixed(3)}px vs ${expected.toFixed(3)}px`,
        );
    }
    assert.ok(
        Math.abs(run.visibleAfterLeave - reference.visibleAfterLeave) < 0.15,
        `step size ${dtValues[i]} changed the ripple duration: ${run.visibleAfterLeave.toFixed(2)}s vs ` +
            `${reference.visibleAfterLeave.toFixed(2)}s`,
    );
}

// --- 4. Frame hitches, clamping and legacy callers ----------------------------
const hitch = createEngine(2.5);
makeRow(hitch);
for (let frame = 0; frame < 400; frame++) {
    hitch.mouse.x = frame < 60 ? frame * 6 : -9999;
    hitch.mouse.y = 0;
    hitch.step(frame % 7 === 0 ? 3 : 0.25);
}
assert.ok(Number.isFinite(maxDisplacement(hitch.particles)), 'clamped steps must stay finite');
assert.ok(maxDisplacement(hitch.particles) < 150, 'clamped steps must not blow up');

assert.equal(createEngine(0.01).recoverySpeed, 0.6, 'values below the range clamp to the slowest');
assert.equal(createEngine(99).recoverySpeed, 2.5, 'values above the range clamp to the fastest');
assert.equal(createEngine(undefined).recoverySpeed, 1.4, 'a missing value falls back to the default');
assert.equal(createEngine(1.4).recoverySpeed, 1.4, 'the default is used as-is');

const legacyCaller = createEngine(undefined);
makeRow(legacyCaller);
const legacyCallerRun = cursorPass(legacyCaller);
assert.ok(
    Math.abs(legacyCallerRun.visibleAfterLeave - defaultRun.visibleAfterLeave) < 0.05,
    'an engine built without recoverySpeed must behave exactly like the default',
);

console.log(
    `Particle recovery passed: ${speeds.length} speeds (ripple ${slowest.visibleAfterLeave.toFixed(2)}s…` +
        `${fastest.visibleAfterLeave.toFixed(2)}s, default ${defaultRun.visibleAfterLeave.toFixed(2)}s vs ` +
        `${legacy.visibleAfterLeave.toFixed(2)}s / ${legacy.bouncesAfterLeave} bounces before), ${dtValues.length} step sizes.`,
);
console.log(
    '  per speed (visible after the cursor left): ' +
        speeds.map((speed, index) => `${speed}=${runs[index].visibleAfterLeave.toFixed(2)}s/${runs[index].bouncesAfterLeave}b`).join(', '),
);
