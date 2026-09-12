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

test("opening retracts the bolts before cracking the seal and venting through its narrow gap", async () => {
  const { cues, sampleMotion } = await motionModule;
  const turning = sampleMotion("open", 0.223); // Recorded lock transient.
  assert.ok(turning.dial > 0 && turning.dial < 1);
  assert.equal(turning.bolts, 1);
  assert.equal(turning.angle, 0);
  const retracting = sampleMotion("open", 1.125); // Strongest recorded bolt transient.
  assert.equal(retracting.dial, 0);
  assert.ok(retracting.bolts > 0 && retracting.bolts < 1);
  assert.equal(retracting.angle, 0);
  assert.equal(sampleMotion("open", 1.4).bolts, 0);
  assert.equal(sampleMotion("open", 1.455).angle, 0); // Release latch precedes the seam opening.
  assert.equal(sampleMotion("open", 1.72).angle, 0);

  const airOnset = sampleMotion("open", cues.air);
  assert.equal(airOnset.bolts, 0);
  assert.ok(airOnset.angle > 0 && airOnset.angle < 2 * Math.PI / 180);
  assert.equal(airOnset.pressure, 0);
  assert.ok(sampleMotion("open", cues.air + 0.06).pressure > 0);
  const cracked = sampleMotion("open", 1.96);
  assert.ok(cracked.angle > 0 && cracked.angle < 2 * Math.PI / 180);
  near(sampleMotion("open", 2.18).angle, cracked.angle);
  assert.ok(sampleMotion("open", 3).angle > cracked.angle);
  assert.equal(sampleMotion("open", 3.22).pressure, 1);
  assert.ok(sampleMotion("open", 3.7).pressure > 0 && sampleMotion("open", 3.7).pressure < 1);
  assert.equal(sampleMotion("open", 4.17).pressure, 0);
  near(sampleMotion("open", 5.35).angle, 102 * Math.PI / 180);
});

test("closing makes physical contact before the separate locking engagement, without vapor", async () => {
  const { cues, durations, sampleMotion } = await motionModule;
  const initial = sampleMotion("close", 0);
  near(sampleMotion("close", 0.3).angle, initial.angle);
  assert.ok(sampleMotion("close", 1).angle < initial.angle);
  assert.ok(sampleMotion("close", cues.contact - 0.01).angle > 0);
  assert.equal(sampleMotion("close", cues.contact).angle, 0);
  assert.equal(sampleMotion("close", cues.contact).light, 0);
  assert.equal(sampleMotion("close", cues.contact).bolts, 0);
  assert.equal(sampleMotion("close", cues.contact).dial, 0);
  assert.equal(sampleMotion("close", cues.boltTravel).bolts, 0);
  const engaging = sampleMotion("close", 3.8);
  assert.ok(engaging.bolts > 0 && engaging.bolts < 1);
  assert.ok(engaging.dial > 0 && engaging.dial < 1);
  assert.equal(sampleMotion("close", cues.lockContact).bolts, 1);
  assert.equal(sampleMotion("close", 4.1).dial, 1);
  for (let time = 0; time <= durations.close; time += 0.01) {
    const pose = sampleMotion("close", time);
    if (pose.bolts > 0) assert.equal(pose.angle, 0);
    if (pose.dial > 0) assert.equal(pose.angle, 0);
    assert.equal(pose.pressure, 0);
    assert.equal(pose.valve, 0);
  }
});

test("mechanical cues align to approved audio and the preview preserves each full recording", async () => {
  const { audioOffsets, cues, durations, sampleMotion } = await motionModule;
  const recipe = require("../docs/time-capsule-sound-candidates/edit-recipe.json");
  assert.equal(audioOffsets.open, 0);
  assert.equal(audioOffsets.close, 2.345);
  assert.equal(durations.open, 6);
  assert.equal(durations.close, 5.4);
  const air = recipe.opening.layers.find(layer => layer.source === "compressor-air");
  near(cues.air, audioOffsets.open + air.at);
  near(cues.contact, audioOffsets.close + 0.255); // Measured door-impact attack, not the layer start.
  const boltTravel = recipe.closing.layers.find(layer => layer.source === "prison-latch-slide");
  near(cues.boltTravel, audioOffsets.close + boltTravel.at);
  near(cues.lockContact, audioOffsets.close + 1.545); // First strong latch attack.
  assert.ok(cues.boltTravel > cues.contact);
  assert.ok(cues.lockContact > cues.boltTravel);
  for (const [kind, recording] of [["open", recipe.opening], ["close", recipe.closing]]) {
    const recordingEnd = audioOffsets[kind] + recording.duration;
    assert.ok(recordingEnd <= durations[kind], `${kind} preview would truncate its approved recording`);
  }
  assert.equal(sampleMotion("open", audioOffsets.open + air.at + air.to - air.from).pressure, 0);
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
  assert.ok(reversedOpening.pressure > 0);
  assert.equal(closing.pressure, 0);
  assert.ok(sampleMotion("open", 0.4).dial < 1);
  assert.equal(sampleMotion("open", 0.4).angle, 0);
  assert.ok(sampleMotion("close", 0.4).angle < sampleMotion("close", 0).angle);
  assert.equal(sampleMotion("close", 0.4).dial, 0);
  assert.equal(sampleMotion("close", 0.4).bolts, 0);
});

test("unknown motion kinds fail explicitly", async () => {
  const { sampleMotion } = await motionModule;
  assert.throws(() => sampleMotion("reverse", 1), /Unknown capsule motion/);
});
