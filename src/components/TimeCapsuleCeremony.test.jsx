import React, { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TimeCapsuleCeremony from "./TimeCapsuleCeremony";
import { prepareCapsuleCeremony, resetCapsuleCeremonyAudioForTests } from "../services/capsuleCeremonySound";
import * as ceremonySound from "../services/capsuleCeremonySound";

jest.mock("../services/capsulePresentation", () => ({ CAPSULE_PRESENTATION: {
  opening: { src: "opening.mp4", poster: "closed.png", end: "opened.png", duration: 6 },
  sealing: { src: "closing.mp4", poster: "opened.png", end: "closed.png", duration: 5.4 },
} }));

let play;
let pause;
let controllers;
const flush = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };
const elapsed = milliseconds => act(() => jest.advanceTimersByTime(milliseconds));
const prepare = (kind = "opening", options = {}) => {
  const value = prepareCapsuleCeremony(kind, options);
  controllers.push(value);
  if (value) Object.defineProperty(value.video, "duration", { configurable: true, value: kind === "opening" ? 6 : 5.4 });
  return value;
};
const video = () => document.querySelector("video");
const progress = time => { video().currentTime = time; fireEvent.timeUpdate(video()); };
const end = () => { video().currentTime = video().duration; fireEvent.ended(video()); };

beforeEach(() => {
  jest.useFakeTimers();
  resetCapsuleCeremonyAudioForTests();
  controllers = [];
  play = jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  controllers.forEach(controller => controller?.dispose());
  play.mockRestore(); pause.mockRestore(); jest.useRealTimers();
});

test("adopts the gesture-prepared opening element and holds the full endpoint before finishing once", async () => {
  const prepared = prepare();
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={onFinish} />);
  await flush();
  expect(video()).toBe(prepared.video);
  expect(video()).toHaveAttribute("src", "opening.mp4");
  expect(video()).toHaveAttribute("playsinline");
  expect(screen.getByRole("button", { name: "Skip animation" })).toHaveFocus();
  progress(5.99);
  expect(onFinish).not.toHaveBeenCalled();
  const priorPauses = pause.mock.calls.length;
  end();
  expect(screen.getByRole("status")).toHaveTextContent("Your capsule is open");
  expect(pause).toHaveBeenCalledTimes(priorPauses);
  elapsed(799);
  expect(onFinish).not.toHaveBeenCalled();
  elapsed(1);
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("StrictMode and unrelated renders reuse the same prepared element without duplicate success playback", async () => {
  const prepared = prepare("sealing");
  const onFinish = jest.fn();
  const { rerender } = render(<StrictMode><TimeCapsuleCeremony kind="sealing" prepared={prepared} onFinish={onFinish} /></StrictMode>);
  await flush();
  expect(play).toHaveBeenCalledTimes(2); // One silent prime, one success playback.
  rerender(<StrictMode><TimeCapsuleCeremony kind="sealing" prepared={prepared} onFinish={() => onFinish()} /></StrictMode>);
  await flush();
  expect(play).toHaveBeenCalledTimes(2);
  expect(video()).toHaveAttribute("src", "closing.mp4");
  end(); elapsed(800);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("fast persistence cannot expose silent priming frames or a rewind", async () => {
  let primed;
  play.mockImplementationOnce(() => new Promise(resolve => { primed = resolve; }));
  const prepared = prepare();
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={jest.fn()} />);
  await flush();
  video().currentTime = 0.2;
  fireEvent.playing(video());
  expect(video()).not.toBeVisible();
  expect(document.querySelector(".trace-capsule-film__media").style.backgroundImage).toContain("closed.png");
  await act(async () => primed());
  await flush();
  expect(video().currentTime).toBe(0);
  expect(video()).toBeVisible();
});

test("sound-off preference remains silent and all ceremony sound controls are absent", async () => {
  const prepared = prepare("opening", { sounds: false });
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} sounds={false} onFinish={jest.fn()} />);
  await flush();
  expect(video().muted).toBe(true);
  expect(screen.getByText("Sound off")).toBeInTheDocument();
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Enable sound" })).not.toBeInTheDocument();
});

test("genuinely blocked audio continues muted with an honest passive explanation", async () => {
  const prepared = prepare();
  await prepared.ready;
  play.mockRejectedValueOnce(new DOMException("User gesture required", "NotAllowedError"));
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={jest.fn()} />);
  await flush();
  expect(play).toHaveBeenCalledTimes(3);
  expect(video().muted).toBe(true);
  expect(screen.getByText(/Sound was blocked by this browser/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Enable sound" })).not.toBeInTheDocument();
});

test("failed playback offers the saved static endpoint and immediate Continue", async () => {
  const prepared = prepare("sealing");
  await prepared.ready;
  play.mockRejectedValueOnce(new DOMException("Decode failed", "NotSupportedError"));
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="sealing" prepared={prepared} onFinish={onFinish} />);
  await flush();
  expect(screen.getByRole("img", { name: "Sealed Time Capsule vault" })).toHaveAttribute("src", "closed.png");
  expect(video()).not.toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  elapsed(3000);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("failed local media initialization shows a safe endpoint and releases controls without crashing", () => {
  const factory = jest.spyOn(ceremonySound, "prepareCapsuleCeremony").mockImplementation(() => { throw Error("Media initialization unavailable"); });
  const onFinish = jest.fn();
  try {
    expect(() => render(<TimeCapsuleCeremony kind="sealing" prepared={null} onFinish={onFinish} />)).not.toThrow();
    expect(screen.getByRole("img", { name: "Sealed Time Capsule vault" })).toHaveAttribute("src", "closed.png");
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
    elapsed(2500);
    expect(onFinish).toHaveBeenCalledTimes(1);
  } finally { factory.mockRestore(); }
});

test("delayed startup still receives the complete closing clip and settled pose", async () => {
  const prepared = prepare("sealing");
  await prepared.ready;
  let start;
  play.mockImplementationOnce(() => new Promise(resolve => { start = resolve; }));
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="sealing" prepared={prepared} onFinish={onFinish} />);
  await flush();
  elapsed(10000);
  expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  await act(async () => start());
  for (let i = 1; i <= 5; i += 1) { progress(i); elapsed(1000); }
  progress(5.39);
  expect(onFinish).not.toHaveBeenCalled();
  end(); elapsed(800);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("missing ended event completes only at actual duration plus grace and hold", async () => {
  const prepared = prepare();
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={onFinish} />);
  await flush();
  progress(5.99); elapsed(200);
  expect(onFinish).not.toHaveBeenCalled();
  progress(6); elapsed(1049);
  expect(onFinish).not.toHaveBeenCalled();
  elapsed(1);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("a stalled promise cannot hold controls forever and late completion stays paused", async () => {
  const prepared = prepare();
  await prepared.ready;
  let resolve;
  play.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={onFinish} />);
  await flush();
  elapsed(12000);
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  elapsed(2500);
  expect(onFinish).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
  expect(prepared.video.muted).toBe(true);
});

test("Reduced Motion uses a silent endpoint with Skip and no priming", async () => {
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" reducedMotion onFinish={onFinish} />);
  await flush();
  expect(video()).toBeNull();
  expect(screen.getByRole("img", { name: "Opened Time Capsule vault" })).toHaveAttribute("src", "opened.png");
  expect(play).not.toHaveBeenCalled();
  elapsed(500);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("Skip and background interruption stop immediately without waiting for the settled hold", async () => {
  const prepared = prepare();
  const onFinish = jest.fn();
  const { unmount } = render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={onFinish} />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(prepared.video.muted).toBe(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
  unmount();

  const second = prepare();
  const nextFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" prepared={second} onFinish={nextFinish} />);
  await flush();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(second.video.muted).toBe(true);
  expect(nextFinish).toHaveBeenCalledTimes(1);
});

test("unmount cancels late success playback without calling completion", async () => {
  const prepared = prepare();
  await prepared.ready;
  let resolve;
  play.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const onFinish = jest.fn();
  const { unmount } = render(<TimeCapsuleCeremony kind="opening" prepared={prepared} onFinish={onFinish} />);
  await flush();
  unmount();
  await act(async () => resolve());
  expect(prepared.video.muted).toBe(true);
  expect(onFinish).not.toHaveBeenCalled();
});
