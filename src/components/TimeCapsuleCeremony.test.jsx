import React, { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TimeCapsuleCeremony from "./TimeCapsuleCeremony";

jest.mock("../services/capsulePresentation", () => ({
  CAPSULE_PRESENTATION: {
    opening: { src: "opening.mp4", poster: "closed.png", end: "opened.png", duration: 6 },
    sealing: { src: "closing.mp4", poster: "opened.png", end: "closed.png", duration: 5.4 },
  },
}));

let play;
let pause;
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const elapsed = milliseconds => act(() => jest.advanceTimersByTime(milliseconds));
const video = () => document.querySelector("video");

beforeEach(() => {
  jest.useFakeTimers();
  play = jest.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  play.mockRestore();
  pause.mockRestore();
});

test("uses approved opening source inline, focuses Skip, and completes only once", async () => {
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" onFinish={onFinish} />);
  await flush();
  expect(video()).toHaveAttribute("src", "opening.mp4");
  expect(video()).toHaveAttribute("playsinline");
  expect(video().volume).toBe(0.65);
  expect(screen.getByRole("button", { name: "Skip animation" })).toHaveFocus();
  fireEvent.ended(video());
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  elapsed(20000);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(video().muted).toBe(true);
});

test("StrictMode and unrelated rerenders do not duplicate playback", async () => {
  const onFinish = jest.fn();
  const { rerender } = render(<StrictMode><TimeCapsuleCeremony kind="sealing" onFinish={onFinish} /></StrictMode>);
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  rerender(<StrictMode><TimeCapsuleCeremony kind="sealing" onFinish={() => onFinish()} /></StrictMode>);
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  expect(video()).toHaveAttribute("src", "closing.mp4");
  fireEvent.ended(video());
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("muted preference never prevents visuals and changes no saved preference", async () => {
  render(<TimeCapsuleCeremony kind="opening" sounds={false} onFinish={jest.fn()} />);
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  expect(video().muted).toBe(true);
  expect(screen.getByText("Sound off")).toBeInTheDocument();
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
});

test("Safari audible autoplay rejection retries muted and offers direct gesture recovery", async () => {
  play.mockRejectedValueOnce(new DOMException("User gesture required", "NotAllowedError"));
  render(<TimeCapsuleCeremony kind="opening" onFinish={jest.fn()} />);
  await flush();
  expect(play).toHaveBeenCalledTimes(2);
  expect(video().muted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Enable sound" }));
  await flush();
  expect(play).toHaveBeenCalledTimes(3);
  expect(video().muted).toBe(false);
});

test("decode or playback failure displays the saved endpoint with immediate Continue", async () => {
  play.mockRejectedValueOnce(new DOMException("Decode failed", "NotSupportedError"));
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="sealing" onFinish={onFinish} />);
  await flush();
  expect(screen.getByRole("img", { name: "Sealed Time Capsule vault" })).toHaveAttribute("src", "closed.png");
  expect(video()).not.toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Your capsule is saved");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  elapsed(5000);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("a hung play promise cannot lock controls and late completion remains paused", async () => {
  let resolve;
  play.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" onFinish={onFinish} />);
  await flush();
  elapsed(4000);
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  elapsed(2500);
  expect(onFinish).toHaveBeenCalledTimes(1);
  const previousPauses = pause.mock.calls.length;
  await act(async () => resolve());
  expect(pause.mock.calls.length).toBeGreaterThan(previousPauses);
  expect(video().muted).toBe(true);
});

test("hard deadline completes even if a browser reports playing but never ends", async () => {
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" onFinish={onFinish} />);
  await flush();
  fireEvent.playing(video());
  elapsed(10000);
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  elapsed(2500);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("Reduced Motion shows a silent endpoint and releases without any media playback", async () => {
  const onFinish = jest.fn();
  render(<TimeCapsuleCeremony kind="opening" reducedMotion onFinish={onFinish} />);
  await flush();
  expect(video()).toBeNull();
  expect(screen.getByRole("img", { name: "Opened Time Capsule vault" })).toHaveAttribute("src", "opened.png");
  expect(play).not.toHaveBeenCalled();
  elapsed(500);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("background interruption stops and finishes once; unmount cancels pending playback", async () => {
  const onFinish = jest.fn();
  const { unmount } = render(<TimeCapsuleCeremony kind="opening" onFinish={onFinish} />);
  await flush();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(video().muted).toBe(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
  unmount();
  elapsed(20000);
  expect(onFinish).toHaveBeenCalledTimes(1);

  let resolve;
  play.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const nextFinish = jest.fn();
  const next = render(<TimeCapsuleCeremony kind="opening" onFinish={nextFinish} />);
  await flush();
  const element = video();
  next.unmount();
  await act(async () => resolve());
  expect(element.muted).toBe(true);
  expect(nextFinish).not.toHaveBeenCalled();
});

test("volume control applies to the same video without restarting its clock", async () => {
  render(<TimeCapsuleCeremony kind="opening" onFinish={jest.fn()} />);
  await flush();
  video().currentTime = 2;
  fireEvent.change(screen.getByRole("slider", { name: "Capsule ceremony volume" }), { target: { value: "20" } });
  expect(video().volume).toBe(0.2);
  expect(video().currentTime).toBe(2);
  expect(play).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("slider", { name: "Capsule ceremony volume" }), { target: { value: "0" } });
  expect(video().muted).toBe(true);
  fireEvent.change(screen.getByRole("slider", { name: "Capsule ceremony volume" }), { target: { value: "20" } });
  await flush();
  expect(video().muted).toBe(false);
  expect(video().currentTime).toBe(2);
});
