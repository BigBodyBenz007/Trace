const assert = require("node:assert/strict");
const { test } = require("node:test");
const motionModule = import("../docs/time-capsule-motion-preview/motion.mjs");

const physicalPose = ({ angle, bolts, dial, valve, light, pressure }) => ({ angle, bolts, dial, valve, light, pressure });
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test("open and close share exact physical endpoints, including clamped times", async () => {
  const { durations, sampleMotion } = await motionModule;
  const sealed = { angle: 0, bolts: 1, dial: 1, valve: 0, light: 0, pressure: 0 };
  const opened = { angle: 102 * Math.PI / 180, bolts: 0, dial: 0, valve: 0, light: 1, pressure: 0 };
  assert.deepEqual(physicalPose(sampleMotion("open", 0)), sealed);
  assert.deepEqual(physicalPose(sampleMotion("close", durations.close)), sealed);
  assert.deepEqual(physicalPose(sampleMotion("open", durations.open)), opened);
  assert.deepEqual(physicalPose(sampleMotion("close", 0)), opened);
  for (const kind of ["open", "close"]) {
    assert.deepEqual(sampleMotion(kind, -100), sampleMotion(kind, 0));
    assert.deepEqual(sampleMotion(kind, -Infinity), sampleMotion(kind, 0));
    assert.deepEqual(sampleMotion(kind, NaN), sampleMotion(kind, 0));
    assert.deepEqual(sampleMotion(kind, Infinity), sampleMotion(kind, durations[kind]));
    assert.deepEqual(sampleMotion(kind, 100), sampleMotion(kind, durations[kind]));
    assert.equal(sampleMotion(kind, durations[kind] - 0.001).done, false);
    assert.equal(sampleMotion(kind, durations[kind]).done, true);
  }
});

test("opening unlocks and vents while the lid remains seated", async () => {
  const { sampleMotion } = await motionModule;
  assert.ok(sampleMotion("open", 0.8).dial < 1);
  assert.equal(sampleMotion("open", 0.8).bolts, 1);
  assert.equal(sampleMotion("open", 1.2).dial, 0);
  assert.equal(sampleMotion("open", 1.7).bolts, 0);
  assert.equal(sampleMotion("open", 1.9).pressure, 0);
  assert.ok(sampleMotion("open", 2.15).pressure > 0);
  assert.equal(sampleMotion("open", 2.15).angle, 0);
  assert.equal(sampleMotion("open", 2.55).pressure, 0);
  assert.equal(sampleMotion("open", 2.65).angle, 0);
  assert.ok(sampleMotion("open", 2.8).angle > 0);
  assert.equal(sampleMotion("open", 3.2).valve, 0);
});

test("closing settles before hardware engages and extinguishes interior light", async () => {
  const { sampleMotion } = await motionModule;
  near(sampleMotion("close", 3.4).angle, 7 * Math.PI / 180);
  assert.ok(sampleMotion("close", 3.8).angle > 0);
  assert.ok(sampleMotion("close", 3.8).angle < 7 * Math.PI / 180);
  assert.equal(sampleMotion("close", 4.2).angle, 0);
  assert.equal(sampleMotion("close", 4.2).light, 0);
  assert.equal(sampleMotion("close", 4.45).bolts, 0);
  assert.equal(sampleMotion("close", 5.15).bolts, 1);
  assert.equal(sampleMotion("close", 5.2).dial, 0);
  assert.equal(sampleMotion("close", 6.05).dial, 1);
  for (let time = 0; time <= 6.4; time += 0.01) {
    const pose = sampleMotion("close", time);
    if (pose.bolts > 0) assert.equal(pose.angle, 0);
    if (pose.dial > 0) assert.equal(pose.bolts, 1);
    assert.equal(pose.pressure, 0);
  }
});

test("hinge travels monotonically within physical bounds without rebound", async () => {
  const { durations, sampleMotion } = await motionModule;
  const limit = 102 * Math.PI / 180;
  for (const kind of ["open", "close"]) {
    let previous = sampleMotion(kind, 0).angle;
    for (let step = 0; step <= 1000; step++) {
      const pose = sampleMotion(kind, durations[kind] * step / 1000);
      assert.ok(pose.angle >= -1e-12 && pose.angle <= limit + 1e-12);
      assert.ok(kind === "open" ? pose.angle >= previous - 1e-12 : pose.angle <= previous + 1e-12);
      for (const key of ["bolts", "dial", "valve", "light", "pressure"]) {
        assert.ok(pose[key] >= -1e-12 && pose[key] <= 1 + 1e-12, `${kind}.${key}: ${pose[key]}`);
      }
      previous = pose.angle;
    }
  }
});

test("closing uses distinct choreography rather than reversing opening", async () => {
  const { durations, sampleMotion } = await motionModule;
  const fraction = 0.4;
  const closing = sampleMotion("close", durations.close * fraction);
  const reversedOpening = sampleMotion("open", durations.open * (1 - fraction));
  assert.ok(Math.abs(closing.angle - reversedOpening.angle) > 0.05);
  assert.equal(closing.phase, "Lowering lid");
  assert.equal(reversedOpening.phase, "Lifting lid");
  assert.ok(sampleMotion("open", 2.15).pressure > sampleMotion("close", durations.close - 2.15).pressure);
});

test("unknown motion kinds fail explicitly", async () => {
  const { sampleMotion } = await motionModule;
  assert.throws(() => sampleMotion("reverse", 1), /Unknown capsule motion/);
});
