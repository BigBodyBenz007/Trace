import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { useState } from "react";
import { prepareCapsuleMediaFiles } from "../services/capsuleMedia";
import TimeCapsuleReadyOverlay from "./TimeCapsuleReadyOverlay";
import TimeCapsulesPage from "./TimeCapsulesPage";

jest.mock("../services/capsuleMedia", () => ({
  ...jest.requireActual("../services/capsuleMedia"),
  prepareCapsuleMediaFiles: jest.fn(),
}));

let pauseMedia;

beforeEach(() => {
  pauseMedia = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => pauseMedia.mockRestore());

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
  mediaLoader: { load: jest.fn(), evict: jest.fn() },
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
  expect(screen.queryByText(/Private words/)).not.toBeInTheDocument();
  expect(screen.queryByText(/secret-name/)).not.toBeInTheDocument();
  expect(loader.load).not.toHaveBeenCalled();
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
  expect(screen.getByText("Private words for the future")).toBeInTheDocument();
  expect(await screen.findByLabelText("secret-name.m4a")).toHaveAttribute("controls");
});

test("an opening write failure keeps private content hidden and offers a retry", async () => {
  const onOpen = jest.fn().mockResolvedValue(false);
  render(<TimeCapsulesPage {...baseProps} capsules={[capsule()]} initialCapsuleId="capsule-1" onOpen={onOpen} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  expect(screen.getByRole("alert")).toHaveTextContent("contents remain sealed");
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open Capsule" })).toBeEnabled();
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

test("pauses opened capsule playback and releases its transient URL when returning to the Timeline", async () => {
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
  const audio = await screen.findByLabelText("secret-name.m4a");
  audio.pause = jest.fn();
  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));
  expect(screen.getByText("Timeline restored")).toBeInTheDocument();
  expect(audio.pause).toHaveBeenCalledTimes(1);
  expect(loader.evict).toHaveBeenCalledWith("private-audio");
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
    return <TimeCapsulesPage {...baseProps} capsules={records} initialCapsuleId="capsule-1" mediaLoader={loader} onReseal={onReseal} />;
  }
  window.confirm = jest.fn(() => true);
  render(<Harness />);
  const audio = await screen.findByLabelText("secret-name.m4a");
  audio.pause = jest.fn();
  fireEvent.click(screen.getByRole("button", { name: "Seal again for later" }));
  expect(screen.getByRole("button", { name: "1 year" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "5 years" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "10 years" })).toBeInTheDocument();
  expect(screen.getByLabelText("New opening date")).toHaveAttribute("min", "2026-09-12");
  fireEvent.change(screen.getByLabelText("New opening date"), { target: { value: "2028-04-17" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal again" })); });

  expect(onReseal).toHaveBeenCalledWith("capsule-1", "2028-04-17", 1);
  expect(screen.getByText("This capsule remains sealed. Its private contents are hidden.")).toBeInTheDocument();
  expect(screen.queryByText("Private words for the future")).not.toBeInTheDocument();
  expect(audio.pause).toHaveBeenCalledTimes(1);
  expect(loader.evict).toHaveBeenCalledWith("private-audio");
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
  expect(screen.queryByLabelText(/record audio/i)).not.toBeInTheDocument();

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
});

test("paginates the capsule archive in batches of ten", () => {
  const records = Array.from({ length: 11 }, (_, index) => capsule({ id: `capsule-${index}`, name: `Capsule ${index}` }));
  render(<TimeCapsulesPage {...baseProps} capsules={records} />);
  expect(screen.getAllByRole("button", { name: "View Time Capsule" })).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(screen.getAllByRole("button", { name: "View Time Capsule" })).toHaveLength(11);
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
  fireEvent.change(screen.getByLabelText("Reminder date"), { target: { value: "2026-09-12" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm" })); });
  expect(onPostpone).toHaveBeenCalledWith("2026-09-12");
  expect(screen.getByRole("alert")).toHaveTextContent("previous reminder is unchanged");
  expect(screen.getByLabelText("Reminder date")).toHaveValue("2026-09-12");
});
