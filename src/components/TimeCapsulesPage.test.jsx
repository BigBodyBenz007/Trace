import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { StrictMode, useState } from "react";
import { prepareCapsuleMediaFiles } from "../services/capsuleMedia";
import { createCapsuleAudioRecorder, getCapsuleAudioRecordingSupport } from "../services/capsuleAudioRecorder";
import { prepareCapsuleCeremony } from "../services/capsuleCeremonySound";
import TimeCapsuleReadyOverlay from "./TimeCapsuleReadyOverlay";
import TimeCapsulesPage from "./TimeCapsulesPage";

jest.mock("../services/capsuleMedia", () => ({
  ...jest.requireActual("../services/capsuleMedia"),
  prepareCapsuleMediaFiles: jest.fn(),
}));

jest.mock("../services/capsuleAudioRecorder", () => ({
  ...jest.requireActual("../services/capsuleAudioRecorder"),
  createCapsuleAudioRecorder: jest.fn(),
  getCapsuleAudioRecordingSupport: jest.fn(),
}));

jest.mock("../services/capsuleCeremonySound", () => ({
  ...jest.requireActual("../services/capsuleCeremonySound"),
  prepareCapsuleCeremony: jest.fn(() => null),
}));

let pauseMedia;
let playMedia;
const startCeremonyMedia = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getCapsuleAudioRecordingSupport.mockReturnValue({ supported: false, error: new Error("Audio recording is unavailable here. Choose an audio file.") });
  baseProps.mediaLoader.load.mockImplementation(() => new Promise(() => {}));
  prepareCapsuleCeremony.mockImplementation((...args) => {
    const prepared = jest.requireActual("../services/capsuleCeremonySound").prepareCapsuleCeremony(...args);
    if (prepared) {
      const start = prepared.start.bind(prepared);
      prepared.start = (...parameters) => { startCeremonyMedia(); return start(...parameters); };
    }
    return prepared;
  });
  playMedia = jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  pauseMedia = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => { pauseMedia.mockRestore(); playMedia.mockRestore(); });

function capsule(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "capsule-1",
    name: "Future birthday",
    text: "Private words for the future",
    openOn: "2026-09-11",
    media: [{ id: "private-audio", kind: "audio", name: "secret-name.m4a", mimeType: "audio/mp4", bytes: 5 }],
    createdAt: "2025-09-11T12:00:00.000Z",
    updatedAt: "2025-09-11T12:01:00.000Z",
    sealedAt: "2025-09-11T12:01:00.000Z",
    openedAt: null,
    ...overrides,
  };
}

function openedLifecycleCapsule(overrides = {}) {
  return capsule({
    openedAt: "2026-09-11T12:00:00.000Z",
    sealCycle: { number: 1, sealedAt: "2025-09-11T12:01:00.000Z" },
    openingHistory: [{ cycle: 1, openOn: "2026-09-11", openedAt: "2026-09-11T12:00:00.000Z" }],
    ...overrides,
  });
}

const baseProps = {
  capsules: [],
  draft: null,
  blockedMessage: "",
  mediaLoader: { load: jest.fn(() => new Promise(() => {})), evict: jest.fn() },
  reducedMotion: true,
  onBack: jest.fn(),
  onBeginDraft: jest.fn(() => true),
  onPersistDraft: jest.fn(() => true),
  onStageMedia: jest.fn(),
  onRemoveMedia: jest.fn(),
  onDiscardDraft: jest.fn(),
  onSeal: jest.fn(),
  onOpen: jest.fn(),
  onDelete: jest.fn(),
  today: "2026-09-11",
};

test("keeps sealed and available private content and media metadata out of the DOM", () => {
  const loader = { load: jest.fn(), evict: jest.fn() };
  const { rerender } = render(
    <TimeCapsulesPage {...baseProps} capsules={[capsule({ openOn: "2027-09-11" })]} initialCapsuleId="capsule-1" mediaLoader={loader} />
  );
  expect(screen.getByText("This capsule remains sealed. Its private contents are hidden.")).toBeInTheDocument();
  expect(screen.queryByText(/Private words/)).not.toBeInTheDocument();
  expect(screen.queryByText(/secret-name/)).not.toBeInTheDocument();
  expect(loader.load).not.toHaveBeenCalled();

  rerender(<TimeCapsulesPage {...baseProps} capsules={[capsule()]} initialCapsuleId="capsule-1" mediaLoader={loader} />);
  expect(screen.getByRole("button", { name: "Open Capsule" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /sound credits/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Private words/)).not.toBeInTheDocument();
  expect(screen.queryByText(/secret-name/)).not.toBeInTheDocument();
  expect(loader.load).not.toHaveBeenCalled();
});

test("uses approved film endpoints for sealed, ready, and opened states", () => {
  const { rerender } = render(
    <TimeCapsulesPage {...baseProps} capsules={[capsule({ openOn: "2027-09-11", media: [] })]} initialCapsuleId="capsule-1" />
  );
  const sealedVault = screen.getByRole("img", { name: "Sealed Time Capsule vault" });
  expect(sealedVault.querySelector(".trace-capsule-vault__endpoint")).toHaveAttribute("src", expect.stringContaining("vault-sealed.png"));

  rerender(<TimeCapsulesPage {...baseProps} capsules={[capsule({ media: [] })]} initialCapsuleId="capsule-1" />);
  expect(screen.getByRole("img", { name: "Time Capsule vault ready to open" })).toHaveClass("trace-capsule-vault--ready");

  rerender(<TimeCapsulesPage {...baseProps} capsules={[capsule({ media: [], openedAt: "2026-09-11T12:00:00.000Z" })]} initialCapsuleId="capsule-1" />);
  const openedVault = screen.getByRole("img", { name: "Opened Time Capsule vault" });
  expect(openedVault).toHaveClass("trace-capsule-vault--opened");
  expect(openedVault.querySelector("img")).toHaveAttribute("src", expect.stringContaining("vault-opened.png"));
});

test("reveals content only after the final opening write succeeds", async () => {
  const mediaLoader = { load: jest.fn().mockResolvedValue({ id: "private-audio", unavailable: false, url: "blob:voice" }), evict: jest.fn() };
  function Harness() {
    const [records, setRecords] = useState([capsule()]);
    return <TimeCapsulesPage
      {...baseProps}
      capsules={records}
      initialCapsuleId="capsule-1"
      mediaLoader={mediaLoader}
      onOpen={(id) => {
        const openedAt = "2026-09-11T12:00:00.000Z";
        setRecords((current) => current.map((item) => item.id === id ? { ...item, openedAt, updatedAt: openedAt } : item));
        return { id };
      }}
    />;
  }
  render(<Harness />);
  expect(screen.queryByText(/Private words/)).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  expect(screen.getByText("Your moment is opening…")).toBeInTheDocument();
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Seal again for later" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete Time Capsule" })).toBeDisabled();
  expect(startCeremonyMedia).not.toHaveBeenCalled(); // Reduced Motion uses a silent endpoint.
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
  expect(await screen.findByLabelText("Play Audio recording 1: secret-name.m4a")).toHaveAttribute("controls");
});

test("an opening write failure keeps private content hidden and offers a retry", async () => {
  const onOpen = jest.fn().mockResolvedValue(false);
  render(<TimeCapsulesPage {...baseProps} capsules={[capsule()]} initialCapsuleId="capsule-1" onOpen={onOpen} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  expect(screen.getByRole("alert")).toHaveTextContent("contents remain sealed");
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open Capsule" })).toBeEnabled();
  expect(prepareCapsuleCeremony).toHaveBeenCalledTimes(1);
  expect(startCeremonyMedia).not.toHaveBeenCalled();
});

test("keeps the endpoint closed and contents private while the opening promise is pending", async () => {
  let resolveOpening;
  const loader = { load: jest.fn().mockResolvedValue({ unavailable: true }), evict: jest.fn() };
  const onOpen = jest.fn();
  function Harness() {
    const [records, setRecords] = useState([capsule()]);
    onOpen.mockImplementation(() => {
      setRecords([openedLifecycleCapsule()]);
      return new Promise(resolve => { resolveOpening = resolve; });
    });
    return <TimeCapsulesPage {...baseProps} reducedMotion={false} capsules={records} initialCapsuleId="capsule-1" onOpen={onOpen} mediaLoader={loader} />;
  }
  render(<Harness />);
  const open = screen.getByRole("button", { name: "Open Capsule" });
  fireEvent.click(open);
  fireEvent.click(open);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(loader.load).not.toHaveBeenCalled();
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Sealed Time Capsule vault" })).toBeInTheDocument();
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  await act(async () => resolveOpening(openedLifecycleCapsule()));
  expect(startCeremonyMedia).toHaveBeenCalledTimes(1);
  expect(loader.load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Future birthday" })).toHaveFocus();
});

test("navigation during persistence cannot start a late ceremony and revisiting does not replay", async () => {
  let resolveOpening;
  function Harness() {
    const [records, setRecords] = useState([capsule({ media: [] })]);
    return <TimeCapsulesPage {...baseProps} reducedMotion={false} capsules={records} initialCapsuleId="capsule-1" onOpen={() => new Promise(resolve => {
      resolveOpening = () => { const opened = openedLifecycleCapsule({ media: [] }); setRecords([opened]); resolve(opened); };
    })} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Open Capsule" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Time Capsules" }));
  await act(async () => resolveOpening());
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Skip animation" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View Time Capsule" }));
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
  expect(startCeremonyMedia).not.toHaveBeenCalled();
});

test.each([
  ["sealed", { openOn: "2027-09-11" }],
  ["available", {}],
  ["opened", { openedAt: "2026-09-11T12:00:00.000Z", media: [] }],
])("returns from %s capsule details to the Timeline without opening or changing the capsule", (state, overrides) => {
  const onBack = jest.fn();
  const onOpen = jest.fn();
  const record = capsule(overrides);
  render(<TimeCapsulesPage {...baseProps} capsules={[record]} initialCapsuleId="capsule-1" onBack={onBack} onOpen={onOpen} />);
  const navigation = screen.getByRole("navigation", { name: "Time Capsule detail navigation" });
  expect(navigation).toHaveTextContent("Back to Time Capsules");
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
  expect(record.openedAt).toBe(overrides.openedAt || null);
});

test("keeps both capsule detail destinations touch-safe in the 390px mobile layout", () => {
  render(<TimeCapsulesPage {...baseProps} capsules={[capsule({ openOn: "2027-09-11" })]} initialCapsuleId="capsule-1" />);
  const navigation = screen.getByRole("navigation", { name: "Time Capsule detail navigation" });
  expect(navigation.querySelectorAll("button")).toHaveLength(2);
  const css = readFileSync(require.resolve("../index.css"), "utf8");
  expect(css).toMatch(/\.trace-capsule-detail-navigation button\s*\{[^}]*min-height:\s*44px/s);
  expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.trace-capsule-detail-navigation button\s*\{[^}]*width:\s*100%/s);
});

test("pauses opened capsule playback without revoking a shared loader URL on navigation", async () => {
  const loader = {
    load: jest.fn().mockResolvedValue({ id: "private-audio", unavailable: false, url: "blob:voice" }),
    evict: jest.fn(),
  };
  function Harness() {
    const [visible, setVisible] = useState(true);
    return visible ? <TimeCapsulesPage
      {...baseProps}
      capsules={[capsule({ openedAt: "2026-09-11T12:00:00.000Z" })]}
      initialCapsuleId="capsule-1"
      mediaLoader={loader}
      onBack={() => setVisible(false)}
    /> : <p>Timeline restored</p>;
  }
  render(<Harness />);
  const audio = await screen.findByLabelText("Play Audio recording 1: secret-name.m4a");
  audio.pause = jest.fn();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(screen.getByText("Timeline restored")).toBeInTheDocument();
  expect(audio.pause).toHaveBeenCalled();
  expect(loader.evict).not.toHaveBeenCalled();
});

test("keeps a stored photo URL alive through Strict Mode remount cleanup", async () => {
  const photo = { id: "photo-strict", kind: "photo", name: "strict.jpg", mimeType: "image/jpeg", bytes: 42 };
  const loader = {
    load: jest.fn().mockResolvedValue({ id: photo.id, unavailable: false, url: "blob:strict-photo" }),
    evict: jest.fn(),
  };
  const view = render(
    <StrictMode>
      <TimeCapsulesPage {...baseProps} capsules={[openedLifecycleCapsule({ media: [photo] })]} initialCapsuleId="capsule-1" mediaLoader={loader} />
    </StrictMode>
  );

  expect(await screen.findByRole("img", { name: "strict.jpg" })).toHaveAttribute("src", "blob:strict-photo");
  view.unmount();
  expect(loader.evict).not.toHaveBeenCalled();
});

test("replaces a failed photo element with a bounded retry state and reloads a fresh URL", async () => {
  const photo = { id: "photo-retry", kind: "photo", name: "retry.jpg", mimeType: "image/jpeg", bytes: 42 };
  const loader = {
    load: jest.fn()
      .mockResolvedValueOnce({ id: photo.id, unavailable: false, url: "blob:failed-photo" })
      .mockResolvedValueOnce({ id: photo.id, unavailable: false, url: "blob:retry-photo" }),
    evict: jest.fn(),
  };
  render(<TimeCapsulesPage {...baseProps} capsules={[openedLifecycleCapsule({ media: [photo] })]} initialCapsuleId="capsule-1" mediaLoader={loader} />);

  fireEvent.error(await screen.findByRole("img", { name: "retry.jpg" }));
  expect(screen.queryByRole("img", { name: "retry.jpg" })).not.toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Photo could not be loaded: retry.jpg" })).toHaveTextContent("Photo could not be loaded");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry photo retry.jpg" })); });
  expect(loader.evict).toHaveBeenCalledWith(photo.id);
  expect(await screen.findByRole("img", { name: "retry.jpg" })).toHaveAttribute("src", "blob:retry-photo");
});

test("keeps a draft photo loadable through seal, open, navigation, reseal, and reopening", async () => {
  const photo = { id: "photo-lifecycle", kind: "photo", name: "lifecycle.jpg", mimeType: "image/jpeg", bytes: 42 };
  const draft = {
    schemaVersion: 1,
    id: "draft-photo",
    capsuleId: "capsule-1",
    form: { name: "Photo lifecycle", text: "Keep the original media", openOn: "2026-09-11" },
    media: [photo],
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-11T10:01:00.000Z",
  };
  const loader = {
    load: jest.fn().mockResolvedValue({ id: photo.id, unavailable: false, url: "blob:lifecycle-photo" }),
    evict: jest.fn(),
  };
  let setTodayForTest;

  function Harness() {
    const [today, setToday] = useState("2026-09-11");
    const [records, setRecords] = useState([]);
    setTodayForTest = setToday;
    const seal = () => {
      const value = capsule({
        name: draft.form.name,
        text: draft.form.text,
        media: draft.media,
        sealedAt: "2026-09-11T10:02:00.000Z",
        sealCycle: { number: 1, sealedAt: "2026-09-11T10:02:00.000Z" },
        openingHistory: [],
      });
      setRecords([value]);
      return { value };
    };
    const open = () => {
      const current = records[0];
      const cycle = current.sealCycle.number;
      const openedAt = cycle === 1 ? "2026-09-11T10:03:00.000Z" : "2027-09-11T10:03:00.000Z";
      const value = {
        ...current,
        openedAt,
        openingHistory: [...current.openingHistory, { cycle, openOn: current.openOn, openedAt }],
      };
      setRecords([value]);
      return value;
    };
    const reseal = (id, openOn) => {
      const current = records[0];
      const value = { ...current, openOn, openedAt: null, sealCycle: { number: 2, sealedAt: "2026-09-11T10:04:00.000Z" } };
      setRecords([value]);
      return { value };
    };
    return <TimeCapsulesPage
      {...baseProps}
      capsules={records}
      draft={draft}
      mediaLoader={loader}
      onOpen={open}
      onReseal={reseal}
      onSeal={seal}
      reducedMotion={false}
      today={today}
    />;
  }

  window.confirm = jest.fn(() => true);
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  expect(await screen.findByRole("img", { name: "lifecycle.jpg" })).toHaveAttribute("src", "blob:lifecycle-photo");

  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal Time Capsule" })); });
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  expect(screen.queryByText("Time Capsule sealed.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(await screen.findByRole("img", { name: "lifecycle.jpg" })).toHaveAttribute("src", "blob:lifecycle-photo");

  fireEvent.click(screen.getByRole("button", { name: "Back to Time Capsules" }));
  fireEvent.click(screen.getByRole("button", { name: "View Time Capsule" }));
  expect(await screen.findByRole("img", { name: "lifecycle.jpg" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Seal again for later" }));
  fireEvent.change(screen.getByLabelText("New opening date"), { target: { value: "2027-09-11" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal again" })); });
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.queryByRole("img", { name: "lifecycle.jpg" })).not.toBeInTheDocument();

  act(() => setTodayForTest("2027-09-11"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(await screen.findByRole("img", { name: "lifecycle.jpg" })).toHaveAttribute("src", "blob:lifecycle-photo");
  expect(loader.evict).not.toHaveBeenCalled();
});

test("restores every draft field and attachment reference and preserves it on Back to Timeline", () => {
  const onBack = jest.fn();
  const onPersistDraft = jest.fn(() => true);
  const draft = {
    schemaVersion: 1,
    id: "draft-1",
    capsuleId: "capsule-2",
    form: { name: "Restored name", text: "Restored private text", openOn: "2031-09-11" },
    media: [
      { id: "photo-1", kind: "photo", name: "photo.jpg", mimeType: "image/jpeg", bytes: 10 },
      { id: "audio-1", kind: "audio", name: "audio.m4a", mimeType: "audio/mp4", bytes: 11 },
      { id: "video-1", kind: "video", name: "video.mp4", mimeType: "video/mp4", bytes: 12 },
    ],
    createdAt: "2026-09-11T12:00:00.000Z",
    updatedAt: "2026-09-11T12:01:00.000Z",
  };
  render(<TimeCapsulesPage {...baseProps} draft={draft} onBack={onBack} onPersistDraft={onPersistDraft} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  expect(screen.getByLabelText("Visible capsule name")).toHaveValue("Restored name");
  expect(screen.getByLabelText("Private message")).toHaveValue("Restored private text");
  expect(screen.getByLabelText("Custom date")).toHaveValue("2031-09-11");
  expect(screen.getByRole("list", { name: "Draft attachments" })).toHaveTextContent("photo.jpg");
  expect(screen.getByRole("list", { name: "Draft attachments" })).toHaveTextContent("audio.m4a");
  expect(screen.getByRole("list", { name: "Draft attachments" })).toHaveTextContent("video.mp4");
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(onPersistDraft).toHaveBeenLastCalledWith(draft.form, draft.media);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("allows today in the initial opening-date picker and explains immediate readiness", () => {
  render(<TimeCapsulesPage {...baseProps} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));
  expect(screen.getByLabelText("Custom date")).toHaveAttribute("min", "2026-09-11");
  expect(screen.getByText(/Choose today to make the capsule ready immediately/)).toBeInTheDocument();
});

test("starts sealing visuals and sound only after the durable seal succeeds and ignores a double tap", async () => {
  let finishSeal;
  let updateRecords;
  const sealed = capsule({ name: "Ceremony capsule", text: "Persist first", media: [] });
  const onSeal = jest.fn(() => new Promise((resolve) => { finishSeal = () => { updateRecords([sealed]); resolve({ value: sealed }); }; }));
  function Harness() {
    const [records, setRecords] = useState([]);
    updateRecords = setRecords;
    return <TimeCapsulesPage {...baseProps} capsules={records} onSeal={onSeal} reducedMotion={false} />;
  }
  window.confirm = jest.fn(() => true);
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));
  fireEvent.change(screen.getByLabelText("Visible capsule name"), { target: { value: "Ceremony capsule" } });
  fireEvent.change(screen.getByLabelText("Private message"), { target: { value: "Persist first" } });
  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule" }));
  expect(prepareCapsuleCeremony).not.toHaveBeenCalled();
  const sealButton = screen.getByRole("button", { name: "Confirm seal Time Capsule" });
  fireEvent.click(sealButton);
  fireEvent.click(sealButton);
  expect(onSeal).toHaveBeenCalledTimes(1);
  expect(prepareCapsuleCeremony).toHaveBeenCalledWith("sealing", {sounds: true, volume: 0.65, reducedMotion: false});
  expect(prepareCapsuleCeremony.mock.invocationCallOrder[0]).toBeLessThan(onSeal.mock.invocationCallOrder[0]);
  expect(startCeremonyMedia).not.toHaveBeenCalled();

  await act(async () => finishSeal());
  expect(startCeremonyMedia).toHaveBeenCalledTimes(1);
  expect(document.querySelector("video")).toHaveAttribute("src", expect.stringContaining("ceremony-close.mp4"));
  expect(screen.getByText("Your memories are being sealed…")).toBeInTheDocument();
  expect(document.querySelector("[data-capsule-ceremony]")).toHaveAttribute("data-capsule-ceremony", "sealing");
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByRole("img", { name: "Time Capsule vault ready to open" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open Capsule" })).toBeInTheDocument();
});

test("a failed seal disposes the prepared element and never starts success playback", async () => {
  const onSeal = jest.fn().mockResolvedValue({ error: "storage denied" });
  window.confirm = jest.fn(() => true);
  render(<TimeCapsulesPage {...baseProps} onSeal={onSeal} reducedMotion={false} capsuleVolume={0.67} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));
  fireEvent.change(screen.getByLabelText("Visible capsule name"), { target: { value: "Remain a draft" } });
  fireEvent.change(screen.getByLabelText("Private message"), { target: { value: "Not sealed" } });
  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal Time Capsule" })); });
  expect(screen.getByRole("alert")).toHaveTextContent("storage denied");
  expect(screen.queryByRole("button", { name: "Skip animation" })).not.toBeInTheDocument();
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  expect(prepareCapsuleCeremony).toHaveBeenCalledWith("sealing", { sounds: true, volume: 0.67, reducedMotion: false });
  const prepared = prepareCapsuleCeremony.mock.results[0].value;
  expect(prepared.phase).toBe("disposed");
  expect(prepared.video.muted).toBe(true);
  expect(screen.getByLabelText("Private message")).toHaveValue("Not sealed");
});

test("seal confirmation supports keyboard cancellation and only its final tap prepares playback", () => {
  render(<TimeCapsulesPage {...baseProps} reducedMotion={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));
  const seal = screen.getByRole("button", { name: "Seal Time Capsule" });
  seal.focus();
  fireEvent.click(seal);
  const dialog = screen.getByRole("dialog", { name: "Seal this Time Capsule?" });
  const cancel = screen.getByRole("button", { name: "Cancel" });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
  expect(screen.getByRole("button", { name: "Confirm seal Time Capsule" })).toHaveFocus();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(seal).toHaveFocus();
  expect(prepareCapsuleCeremony).not.toHaveBeenCalled();
  expect(baseProps.onSeal).not.toHaveBeenCalled();
});

test("a seal completed in the background leaves the saved editor and never replays on return", async () => {
  let finishSeal;
  const sealed = capsule({ media: [] });
  function Harness() {
    const [records, setRecords] = useState([]);
    return <TimeCapsulesPage {...baseProps} reducedMotion={false} capsules={records} onSeal={() => new Promise(resolve => {
      finishSeal = () => { setRecords([sealed]); resolve({ value: sealed }); };
    })} />;
  }
  window.confirm = jest.fn(() => true);
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));
  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule" })); fireEvent.click(screen.getByRole("button", { name: "Confirm seal Time Capsule" }));
  const visibility = jest.spyOn(document, "visibilityState", "get");
  visibility.mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  await act(async () => finishSeal());
  expect(screen.queryByLabelText("Private message")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Future birthday" })).toBeInTheDocument();
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByRole("button", { name: "Open Capsule" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Seal Time Capsule" })).not.toBeInTheDocument();
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  visibility.mockRestore();
});

test("navigation interrupts an opening ceremony, stops its sound, and cannot undo the saved opening", async () => {

  const openedAt = "2026-09-11T12:00:00.000Z";
  const opened = capsule({ openedAt, updatedAt: openedAt, media: [] });
  let updateRecords;
  function Harness() {
    const [visible, setVisible] = useState(true);
    const [records, setRecords] = useState([capsule({ media: [] })]);
    updateRecords = setRecords;
    return visible ? <TimeCapsulesPage
      {...baseProps}
      capsules={records}
      initialCapsuleId="capsule-1"
      onBack={() => setVisible(false)}
      onOpen={() => { updateRecords([opened]); return opened; }}
      reducedMotion={false}
    /> : <p>Timeline restored after saved opening</p>;
  }
  render(<Harness />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  await act(async () => {});
  expect(screen.getByText("Your moment is opening…")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(screen.getByText("Timeline restored after saved opening")).toBeInTheDocument();
  expect(pauseMedia).toHaveBeenCalled();
  expect(document.querySelector("video")).toBeNull();
  expect(opened.openedAt).toBe(openedAt);
});

test("uses the restrained reduced-motion vault and leaves blocked or disabled sound silent", async () => {
  const openedAt = "2026-09-11T12:00:00.000Z";
  const opened = capsule({ openedAt, updatedAt: openedAt, media: [] });
  let updateRecords;
  prepareCapsuleCeremony.mockReturnValueOnce(null);
  function Harness() {
    const [records, setRecords] = useState([capsule({ media: [] })]);
    updateRecords = setRecords;
    return <TimeCapsulesPage
      {...baseProps}
      capsuleSounds={false}
      capsules={records}
      initialCapsuleId="capsule-1"
      onOpen={() => { updateRecords([opened]); return opened; }}
      reducedMotion
    />;
  }
  render(<Harness />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  expect(prepareCapsuleCeremony).toHaveBeenCalledWith("opening", {sounds: false, volume: 0.65, reducedMotion: true});
  expect(startCeremonyMedia).not.toHaveBeenCalled();
  expect(screen.getByRole("img", { name: "Opened Time Capsule vault" })).toHaveAttribute("src", expect.stringContaining("vault-opened.png"));
  expect(document.querySelector("video")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
});

test("labels multiple audio attachments as separate cards with reliable durations", async () => {
  const media = [
    { id: "audio-a", kind: "audio", name: "First memo.m4a", mimeType: "audio/mp4", bytes: 5, durationMs: 65000 },
    { id: "audio-b", kind: "audio", name: "Second memo.m4a", mimeType: "audio/mp4", bytes: 6 },
  ];
  const loader = { load: jest.fn(({ id } = {}) => Promise.resolve({ id, unavailable: false, url: `blob:${id}` })), evict: jest.fn() };
  loader.load.mockImplementation((id) => Promise.resolve({ id, unavailable: false, url: `blob:${id}` }));
  render(<TimeCapsulesPage {...baseProps} capsules={[openedLifecycleCapsule({ media })]} initialCapsuleId="capsule-1" mediaLoader={loader} />);
  expect(screen.getByText("Audio recording 1")).toBeInTheDocument();
  expect(screen.getByText("Audio recording 2")).toBeInTheDocument();
  expect(screen.getByText("Duration: 1:05")).toBeInTheDocument();
  expect(await screen.findByLabelText("Play Audio recording 1: First memo.m4a")).toHaveAttribute("controls");
  expect(await screen.findByLabelText("Play Audio recording 2: Second memo.m4a")).toHaveAttribute("controls");
});

test("reseals opened content for a future cycle while preserving identity and cleaning up playback", async () => {
  const original = openedLifecycleCapsule();
  const loader = {
    load: jest.fn().mockResolvedValue({ id: "private-audio", unavailable: false, url: "blob:voice" }),
    evict: jest.fn(),
  };
  let updateRecords;
  const onReseal = jest.fn((id, openOn, expectedCycle) => {
    const value = {
      ...original,
      openOn,
      openedAt: null,
      updatedAt: "2026-09-12T12:00:00.000Z",
      sealCycle: { number: 2, sealedAt: "2026-09-12T12:00:00.000Z" },
    };
    updateRecords([value]);
    return { value };
  });
  function Harness() {
    const [records, setRecords] = useState([original]);
    updateRecords = setRecords;
    return <TimeCapsulesPage {...baseProps} capsules={records} initialCapsuleId="capsule-1" mediaLoader={loader} onReseal={onReseal} reducedMotion={false} capsuleVolume={0.67} />;
  }
  window.confirm = jest.fn(() => true);
  render(<Harness />);
  const audio = await screen.findByLabelText("Play Audio recording 1: secret-name.m4a");
  audio.pause = jest.fn();
  fireEvent.click(screen.getByRole("button", { name: "Seal again for later" }));
  expect(screen.getByRole("button", { name: "1 year" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "5 years" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "10 years" })).toBeInTheDocument();
  expect(screen.getByLabelText("New opening date")).toHaveAttribute("min", "2026-09-12");
  fireEvent.change(screen.getByLabelText("New opening date"), { target: { value: "2028-04-17" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal again" })); });

  expect(onReseal).toHaveBeenCalledWith("capsule-1", "2028-04-17", 1);
  expect(prepareCapsuleCeremony).toHaveBeenCalledWith("sealing", { sounds: true, volume: 0.67, reducedMotion: false });
  expect(prepareCapsuleCeremony.mock.invocationCallOrder[0]).toBeLessThan(onReseal.mock.invocationCallOrder[0]);
  expect(window.confirm).not.toHaveBeenCalled();
  expect(screen.getByText("Your memories are being sealed…")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByText("This capsule remains sealed. Its private contents are hidden.")).toBeInTheDocument();
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(audio.pause).toHaveBeenCalled();
  expect(loader.evict).not.toHaveBeenCalled();
  expect(original).toMatchObject({ id: "capsule-1", sealedAt: "2025-09-11T12:01:00.000Z", openedAt: "2026-09-11T12:00:00.000Z" });
});

test("canceling or failing to reseal leaves opened content visible and prevents duplicate submissions", async () => {
  let finishReseal;
  const onReseal = jest.fn(() => new Promise((resolve) => { finishReseal = resolve; }));
  window.confirm = jest.fn(() => true);
  render(<TimeCapsulesPage {...baseProps} capsules={[openedLifecycleCapsule({ media: [] })]} initialCapsuleId="capsule-1" onReseal={onReseal} />);
  fireEvent.click(screen.getByRole("button", { name: "Seal again for later" }));
  fireEvent.change(screen.getByLabelText("New opening date"), { target: { value: "2028-09-11" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onReseal).not.toHaveBeenCalled();
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Seal again for later" }));
  const confirm = screen.getByRole("button", { name: "Confirm seal again" });
  fireEvent.click(confirm);
  expect(confirm).toBeDisabled();
  fireEvent.click(confirm);
  expect(onReseal).toHaveBeenCalledTimes(1);
  await act(async () => finishReseal({ error: "storage failed" }));
  expect(screen.getByRole("alert")).toHaveTextContent("storage failed");
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
  expect(screen.getByText("Opened")).toBeInTheDocument();
});

test("chooses audio files without exposing a capture control or affecting photo and video controls", async () => {
  const preparedAudio = {
    id: "voice-memo",
    kind: "audio",
    name: "Voice Memo.m4a",
    mimeType: "audio/mp4",
    bytes: 4,
    blob: new Blob(["memo"], { type: "audio/mp4" }),
    url: "blob:voice-memo",
  };
  const onStageMedia = jest.fn().mockResolvedValue([preparedAudio]);
  prepareCapsuleMediaFiles.mockResolvedValueOnce([preparedAudio]);
  render(<TimeCapsulesPage {...baseProps} onStageMedia={onStageMedia} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Time Capsule" }));

  const audioInput = screen.getByLabelText("Choose audio file");
  expect(audioInput).toHaveAttribute("type", "file");
  expect(audioInput).not.toHaveAttribute("capture");
  expect(audioInput).toHaveAttribute("multiple");
  expect(audioInput.getAttribute("accept")).toContain(".m4a");
  expect(audioInput.getAttribute("accept")).toContain("audio/mp4");
  expect(screen.getByRole("button", { name: "Record audio" })).toBeDisabled();
  expect(audioInput).toBeEnabled();
  expect(screen.queryByText(/save or share a Voice Memo to Files first/)).not.toBeInTheDocument();

  expect(screen.getByLabelText("Choose photos")).not.toHaveAttribute("capture");
  expect(screen.getByLabelText("Take photo")).toHaveAttribute("capture", "environment");
  expect(screen.getByLabelText("Choose video")).not.toHaveAttribute("capture");
  expect(screen.getByLabelText("Record video")).toHaveAttribute("capture", "environment");

  const voiceMemo = new File(["memo"], "Voice Memo.m4a", { type: "audio/mp4" });
  await act(async () => {
    fireEvent.change(audioInput, { target: { files: [voiceMemo] } });
  });

  expect(prepareCapsuleMediaFiles).toHaveBeenCalledWith([voiceMemo], []);
  expect(onStageMedia).toHaveBeenCalledWith([preparedAudio], {
    name: "",
    text: "",
    openOn: "2027-09-11",
  }, []);
  expect(screen.getByRole("status")).toHaveTextContent("1 audio added.");
  expect(screen.getByRole("list", { name: "Draft attachments" })).toHaveTextContent("Voice Memo.m4a");
  expect(screen.getByText("Audio recording 1")).toBeInTheDocument();
  expect(await screen.findByLabelText("Play Audio recording 1: Voice Memo.m4a")).toHaveAttribute("controls");
});

test("paginates the capsule archive in batches of ten", () => {
  const records = Array.from({ length: 11 }, (_, index) => capsule({ id: `capsule-${index}`, name: `Capsule ${index}` }));
  render(<TimeCapsulesPage {...baseProps} capsules={records} />);
  expect(screen.getAllByRole("button", { name: "View Time Capsule" })).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(screen.getAllByRole("button", { name: "View Time Capsule" })).toHaveLength(11);
});

const recordedTakeReference = { id: "recorded-take", kind: "audio", name: "Voice message.m4a", mimeType: "audio/mp4", bytes: 123, durationMs: 2100 };

function recordingDraft(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "recording-draft",
    capsuleId: "recorded-capsule",
    form: { name: "A recorded message", text: "Keep these private words", openOn: "2026-09-11" },
    media: [],
    pendingRecording: recordedTakeReference,
    createdAt: "2026-09-11T12:00:00.000Z",
    updatedAt: "2026-09-11T12:00:00.000Z",
    ...overrides,
  };
}

test("a restored pending take blocks sealing and attachment changes while draft text stays editable", async () => {
  const photo = { id: "existing-photo", kind: "photo", name: "Keep photo.jpg", mimeType: "image/jpeg", bytes: 45 };
  const draft = recordingDraft({ media: [photo] });
  const onPersistDraft = jest.fn(() => true);
  const loader = { load: jest.fn(async (id) => ({ id, url: `blob:${id}` })) };
  render(<TimeCapsulesPage {...baseProps} draft={draft} mediaLoader={loader} onPersistDraft={onPersistDraft} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("controls");
  expect(screen.getByLabelText("Preview your recording")).not.toHaveAttribute("autoplay");
  expect(screen.getByRole("button", { name: "Seal Time Capsule" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Discard draft" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Remove", exact: true })).toBeDisabled();
  expect(screen.getByLabelText("Choose audio file")).toBeDisabled();
  expect(screen.getByLabelText("Choose photos")).toBeDisabled();
  expect(screen.getByText(/Finish your recording, then keep or discard the take/)).toBeInTheDocument();
  expect(screen.getByLabelText("Private message")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Private message"), { target: { value: "Still editable during review" } });
  expect(onPersistDraft).toHaveBeenLastCalledWith({ ...draft.form, text: "Still editable during review" }, [photo]);
  fireEvent.change(screen.getByLabelText("Choose audio file"), { target: { files: [new File(["other"], "other.m4a", { type: "audio/mp4" })] } });
  expect(prepareCapsuleMediaFiles).not.toHaveBeenCalled();
  expect(baseProps.onStageMedia).not.toHaveBeenCalled();
  expect(baseProps.onSeal).not.toHaveBeenCalled();
  expect(draft.pendingRecording).toBe(recordedTakeReference);
});

test("Keeping a restored recording adds its existing reference to an audio card and allows sealing and opening", async () => {
  const onKeepRecording = jest.fn();
  const onPersistRecording = jest.fn();
  const loader = { load: jest.fn(async (id) => ({ id, url: `blob:${id}` })) };
  function Harness() {
    const [draft, setDraft] = useState(recordingDraft());
    const [capsules, setCapsules] = useState([]);
    onKeepRecording.mockImplementation(async (id) => {
      const media = [draft.pendingRecording];
      setDraft({ ...draft, media, pendingRecording: null });
      return { ok: true, media };
    });
    return <TimeCapsulesPage {...baseProps} draft={draft} capsules={capsules} mediaLoader={loader}
      onKeepRecording={onKeepRecording} onPersistRecording={onPersistRecording}
      onSeal={async (form, media) => {
        const value = capsule({ id: "recorded-capsule", ...form, media });
        setCapsules([value]); setDraft(null);
        return { value };
      }}
      onOpen={async () => {
        const value = { ...capsules[0], openedAt: "2026-09-11T12:10:00.000Z" };
        setCapsules([value]);
        return value;
      }} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep recording" })));
  expect(onKeepRecording).toHaveBeenCalledWith("recorded-take");
  expect(onPersistRecording).not.toHaveBeenCalled();
  expect(screen.getByText("Audio recording 1")).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Draft attachments" }).querySelectorAll("li")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Seal Time Capsule" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm seal Time Capsule" })));
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })));
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(await screen.findByLabelText("Play Audio recording 1: Voice message.m4a")).toHaveAttribute("src", "blob:recorded-take");
  expect(screen.getByText("Keep these private words")).toBeInTheDocument();
});

test("leaving a safely persisted pending take preserves the draft and permits later review", async () => {
  const draft = recordingDraft();
  const onBack = jest.fn();
  const onPersistDraft = jest.fn(() => true);
  render(<TimeCapsulesPage {...baseProps} draft={draft} onBack={onBack} onPersistDraft={onPersistDraft} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" })));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onPersistDraft).toHaveBeenLastCalledWith(draft.form, draft.media);
  expect(draft.pendingRecording).toBe(recordedTakeReference);
});

test("Back waits for a pending Keep action before saving the editor's attachment list", async () => {
  let finishKeep;
  const keepResult = new Promise((resolve) => { finishKeep = resolve; });
  const onBack = jest.fn();
  const onPersistDraft = jest.fn(() => true);
  function Harness() {
    const [draft, setDraft] = useState(recordingDraft());
    return <TimeCapsulesPage {...baseProps} draft={draft} onBack={onBack} onPersistDraft={onPersistDraft}
      onKeepRecording={() => {
        // Durable persistence can finish before its asynchronous writer returns
        // the new media list to the editor wrapper.
        setDraft((current) => ({ ...current, pendingRecording: null, media: [recordedTakeReference] }));
        return keepResult;
      }} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep recording" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" })));
  expect(onBack).not.toHaveBeenCalled();
  expect(onPersistDraft).not.toHaveBeenCalled();
  expect(screen.getByText("Finish saving or reviewing your recording before leaving. Wait for any ongoing action, or retry saving the take.")).toBeInTheDocument();
  await act(async () => finishKeep({ ok: true, media: [recordedTakeReference] }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onPersistDraft).toHaveBeenLastCalledWith(recordingDraft().form, [recordedTakeReference]);
});

test("an unsaved session take blocks leaving until retry succeeds or confirmed discard clears it", async () => {
  const draft = recordingDraft({ pendingRecording: null });
  const onBack = jest.fn();
  const onDiscardRecording = jest.fn();
  function Harness() {
    const [retryTake, setRetryTake] = useState({ id: "failed-take", draftId: draft.id, file: new File(["voice"], "Voice.m4a", { type: "audio/mp4" }), durationMs: 2100 });
    onDiscardRecording.mockImplementation(async () => { setRetryTake(null); return { ok: true }; });
    return <TimeCapsulesPage {...baseProps} draft={draft} recordingRetryTake={retryTake} onBack={onBack} onDiscardRecording={onDiscardRecording} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  expect(screen.getByRole("button", { name: "Seal Time Capsule" })).toBeDisabled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" })));
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByText("Finish saving or reviewing your recording before leaving. Wait for any ongoing action, or retry saving the take.")).toBeInTheDocument();
  expect(screen.getByLabelText("Private message")).toHaveValue(draft.form.text);
  fireEvent.click(screen.getByRole("button", { name: "Discard recording", exact: true }));
  expect(onDiscardRecording).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm discard recording" })));
  expect(onDiscardRecording).toHaveBeenCalledWith("failed-take");
  expect(screen.getByRole("button", { name: "Seal Time Capsule" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("Back stops active recording and waits for storage while preserving text typed during finalization", async () => {
  getCapsuleAudioRecordingSupport.mockReturnValue({ supported: true, mimeType: "audio/mp4" });
  let resolveSave;
  const save = new Promise((resolve) => { resolveSave = resolve; });
  const file = new File(["encoded voice"], "Voice message.m4a", { type: "audio/mp4" });
  const stop = jest.fn();
  const onBack = jest.fn();
  const onPersistDraft = jest.fn(() => true);
  const lifecycleAdapter = { subscribe: jest.fn() };
  createCapsuleAudioRecorder.mockImplementation((options) => {
    let state = { status: "idle", elapsedMs: 0 };
    stop.mockImplementation(async (stopReason) => {
      state = { ...state, status: "validating", stopReason };
      options.onState(state);
      await options.onComplete({ file, durationMs: 2100, stopReason });
      state = { ...state, status: "ready" };
      options.onState(state);
    });
    return {
      getState: () => state,
      start: async () => { options.stopPlayback?.(); state = { ...state, status: "recording" }; options.onState(state); },
      stop,
      dispose: jest.fn(),
      cancel: jest.fn(),
    };
  });
  function Harness() {
    const [draft, setDraft] = useState(recordingDraft({ pendingRecording: null, media: [
      { id: "large-video", kind: "video", name: "Clip.mp4", mimeType: "video/mp4", bytes: 75 * 1024 * 1024 },
      { id: "existing-voice-1", kind: "audio", name: "First.m4a", mimeType: "audio/mp4", bytes: 10 * 1024 * 1024 },
      { id: "existing-voice-2", kind: "audio", name: "Second.m4a", mimeType: "audio/mp4", bytes: 10 * 1024 * 1024 },
    ] }));
    return <TimeCapsulesPage {...baseProps} draft={draft} lifecycleAdapter={lifecycleAdapter} onBack={onBack} onPersistDraft={onPersistDraft}
      onPersistRecording={async (recordedFile) => {
        expect(recordedFile).toBe(file);
        await save;
        setDraft((current) => ({ ...current, pendingRecording: recordedTakeReference }));
        return { pendingRecording: recordedTakeReference };
      }} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Continue draft" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  expect(createCapsuleAudioRecorder.mock.calls[0][0]).toEqual(expect.objectContaining({ maxBytes: 5 * 1024 * 1024, lifecycleAdapter }));
  expect(screen.getByRole("button", { name: "Seal Time Capsule" })).toBeDisabled();
  expect(screen.getByLabelText("Choose audio file")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(stop).toHaveBeenCalledWith("navigation");
  expect(onBack).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Private message"), { target: { value: "Words added while the take saves" } });
  await act(async () => resolveSave());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onPersistDraft).toHaveBeenLastCalledWith(expect.objectContaining({ text: "Words added while the take saves" }), expect.arrayContaining([expect.objectContaining({ id: "large-video" })]));
});

test("ready overlay navigates without opening and keeps failed postpone choices retryable", async () => {
  const onOpenNow = jest.fn();
  const onPostpone = jest.fn().mockResolvedValue(false);
  render(<TimeCapsuleReadyOverlay capsule={capsule()} onOpenNow={onOpenNow} onDismiss={jest.fn()} onPostpone={onPostpone} />);
  expect(screen.getByRole("dialog")).not.toHaveTextContent("Private words");
  expect(screen.getByRole("dialog")).not.toHaveTextContent("secret-name");
  fireEvent.click(screen.getByRole("button", { name: "Open now" }));
  expect(onOpenNow).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Open Capsule" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Postpone" }));
  const futureReminder = screen.getByLabelText("Reminder date").min;
  fireEvent.change(screen.getByLabelText("Reminder date"), { target: { value: futureReminder } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm" })); });
  expect(onPostpone).toHaveBeenCalledWith(futureReminder);
  expect(screen.getByRole("alert")).toHaveTextContent("previous reminder is unchanged");
  expect(screen.getByLabelText("Reminder date")).toHaveValue(futureReminder);
});
