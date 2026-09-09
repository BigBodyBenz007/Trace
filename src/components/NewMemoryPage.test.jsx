import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PHOTO_SELECTION_RESULT_STATUS } from "../services/photoSelectionAdapter";
import NewMemoryPage from "./NewMemoryPage";

let originalCreateObjectURL;
let originalCreateImageBitmap;

beforeEach(() => {
  originalCreateObjectURL = URL.createObjectURL;
  originalCreateImageBitmap = global.createImageBitmap;
  URL.createObjectURL = jest.fn((file) => `blob:${file.name}`);
  global.createImageBitmap = jest.fn(async () => ({ width: 1200, height: 900, close: jest.fn() }));
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  global.createImageBitmap = originalCreateImageBitmap;
});

function renderPage({
  categories = [],
  date = "2026-08-17",
  description = "",
  discardDraft,
  draftInitialDate,
  draftRecovered = false,
  editingIndex = null,
  images = [],
  onBackToTimeline,
  onCancelExistingMemory,
  photoSelectionAdapter,
  photoLoader,
  persistDraft,
  removeDraftPhoto,
  setCategories = jest.fn(),
  setDate = jest.fn(),
  setDescription = jest.fn(),
  setEditingIndex = jest.fn(),
  setImages = jest.fn(),
  setPage = jest.fn(),
  setTitle = jest.fn(),
  stageDraftPhotos,
  title = "",
} = {}) {
  return render(
    <NewMemoryPage
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      date={date}
      setDate={setDate}
      categories={categories}
      setCategories={setCategories}
      images={images}
      setImages={setImages}
      photoLoader={photoLoader}
      saveMemory={jest.fn()}
      inputStyle={{}}
      buttonStyle={{}}
      containerStyle={{}}
      setPage={setPage}
      editingIndex={editingIndex}
      setEditingIndex={setEditingIndex}
      onCancelExistingMemory={onCancelExistingMemory}
      draftRecovered={draftRecovered}
      draftInitialDate={draftInitialDate}
      persistDraft={persistDraft}
      stageDraftPhotos={stageDraftPhotos}
      removeDraftPhoto={removeDraftPhoto}
      discardDraft={discardDraft}
      onBackToTimeline={onBackToTimeline}
      photoSelectionAdapter={photoSelectionAdapter}
    />
  );
}

test("uses isolated Modern Heirloom hierarchy for Add and Edit Memory", () => {
  const first = renderPage();
  const addHeading = screen.getByRole("heading", { name: "Add Memory" });
  const addEditor = addHeading.closest(".trace-memory-editor");
  expect(addEditor).toHaveAttribute("data-memory-editor-mode", "add");
  expect(addHeading).toHaveClass("trace-memory-editor__title");
  expect(screen.getByRole("heading", { name: "Categories" })).toHaveClass(
    "trace-memory-editor__section-title"
  );
  expect(screen.getByRole("heading", { name: "Photographs" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Memory" })).toHaveClass(
    "trace-memory-editor__action--primary"
  );
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
    "trace-memory-editor__action--secondary"
  );
  expect(screen.getByRole("button", { name: "Close Add Memory" })).toHaveClass(
    "trace-memory-editor__close"
  );
  expect(screen.getByLabelText("Choose Photos")).toHaveAttribute("multiple");
  expect(screen.getByLabelText("Choose Photos")).toHaveAttribute("accept", "image/*");
  first.unmount();

  renderPage({ editingIndex: "memory-edit", title: "Existing Memory" });
  const editHeading = screen.getByRole("heading", { name: "Edit Memory" });
  expect(editHeading.closest(".trace-memory-editor")).toHaveAttribute(
    "data-memory-editor-mode",
    "edit"
  );
  expect(screen.getByRole("button", { name: "Save Changes" })).toHaveClass(
    "trace-memory-editor__action--primary"
  );
  expect(screen.getByRole("button", { name: "Close Edit Memory" })).toHaveClass(
    "trace-memory-editor__close"
  );
});

test.each(["Close Add Memory", "Cancel"])(
  "%s uses the existing Add Memory cancellation path",
  (controlName) => {
    const setEditingIndex = jest.fn();
    const setPage = jest.fn();
    renderPage({ setEditingIndex, setPage });

    fireEvent.click(screen.getByRole("button", { name: controlName }));

    expect(setEditingIndex).toHaveBeenCalledWith(null);
    expect(setPage).toHaveBeenCalledWith("home");
  }
);

test.each(["Close Edit Memory", "Cancel"])(
  "%s uses the existing Edit Memory cancellation callback",
  (controlName) => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    const onCancelExistingMemory = jest.fn();
    const setPage = jest.fn();
    renderPage({
      editingIndex: "memory-edit",
      onCancelExistingMemory,
      setPage,
      title: "Existing Memory",
    });

    fireEvent.click(screen.getByRole("button", { name: controlName }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard your changes? Your unsaved changes will be lost."
    );
    expect(onCancelExistingMemory).toHaveBeenCalledTimes(1);
    expect(setPage).not.toHaveBeenCalled();
    confirm.mockRestore();
  }
);

test("Back to Timeline preserves the complete Add Memory draft without discarding it", () => {
  const onBackToTimeline = jest.fn();
  const discardDraft = jest.fn();
  const images = [{ id: "staged-photo", isDraft: true, storedBytes: 42 }];
  renderPage({
    title: "Unfinished title",
    description: "Unfinished story",
    date: "2026-08-15",
    draftInitialDate: "2026-08-17",
    categories: ["Travel"],
    images,
    onBackToTimeline,
    discardDraft,
  });

  fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" }));

  expect(onBackToTimeline).toHaveBeenCalledWith({
    initialDate: "2026-08-17",
    form: {
      title: "Unfinished title",
      description: "Unfinished story",
      date: "2026-08-15",
      categories: ["Travel"],
    },
    draftImages: images,
  });
  expect(discardDraft).not.toHaveBeenCalled();
});

test("every editable Add Memory field is sent to durable draft persistence", () => {
  const persistDraft = jest.fn();
  const { rerender } = renderPage({ persistDraft });

  fireEvent.change(screen.getByPlaceholderText("Memory title..."), { target: { value: "Title" } });
  expect(persistDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    form: expect.objectContaining({ title: "Title" }),
  }));

  rerender(<NewMemoryPage
    title="Title" setTitle={jest.fn()} description="" setDescription={jest.fn()}
    date="2026-08-17" setDate={jest.fn()} categories={[]} setCategories={jest.fn()}
    images={[]} setImages={jest.fn()} saveMemory={jest.fn()} setPage={jest.fn()}
    editingIndex={null} setEditingIndex={jest.fn()} persistDraft={persistDraft}
  />);
  fireEvent.change(screen.getByPlaceholderText("Tell your story..."), { target: { value: "Story" } });
  expect(persistDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    form: expect.objectContaining({ title: "Title", description: "Story" }),
  }));
  fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: "2026-08-16" } });
  expect(persistDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    form: expect.objectContaining({ date: "2026-08-16" }),
  }));
  fireEvent.click(screen.getByRole("button", { name: "Travel" }));
  expect(persistDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    form: expect.objectContaining({ categories: ["Travel"] }),
  }));
});

test("restored drafts are announced and edit mode does not expose Add Memory back navigation", () => {
  const first = renderPage({ draftRecovered: true });
  expect(screen.getByRole("status")).toHaveTextContent("unfinished Memory draft was restored");
  first.unmount();
  renderPage({ editingIndex: "saved-memory", title: "Saved" });
  expect(screen.queryByRole("button", { name: "Back to Timeline" })).not.toBeInTheDocument();
});

test("confirmed discard clears the draft while canceling confirmation preserves everything", async () => {
  const discardDraft = jest.fn(async () => {});
  const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  renderPage({ title: "Meaningful", discardDraft });

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(discardDraft).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText("Memory title...")).toHaveValue("Meaningful");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(discardDraft).toHaveBeenCalledTimes(1));
  confirm.mockRestore();
});

test("removing a staged Add photo delegates durable deletion before updating the draft", async () => {
  const staged = { id: "draft-photo", isDraft: true, storedBytes: 99 };
  const removeDraftPhoto = jest.fn(async () => []);
  const setImages = jest.fn();
  renderPage({ images: [staged], removeDraftPhoto, setImages });

  fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));

  await waitFor(() => expect(removeDraftPhoto).toHaveBeenCalledWith(
    staged,
    expect.objectContaining({ draftImages: [staged] })
  ));
  expect(setImages).toHaveBeenCalledWith([]);
});

test("keeps editor photo wrappers stable with an accessible touch-target removal control", () => {
  renderPage({ images: [{ id: "styled-photo", url: "blob:styled-photo" }] });
  expect(screen.getByAltText("Memory 1")).toHaveClass(
    "trace-memory-editor__photo-image"
  );
  expect(screen.getByRole("button", { name: "Remove photo 1" })).toHaveClass(
    "trace-memory-editor__photo-remove"
  );
});

test("loads every stored photo when editing while preserving photo IDs", async () => {
  const images = [
    { id: "edit-photo-1" },
    { id: "edit-photo-2" },
    { id: "edit-photo-3" },
    { id: "edit-photo-4" },
  ];
  const photoLoader = {
    load: jest.fn(async (id) => ({ id, unavailable: false, url: `blob:${id}` })),
  };
  renderPage({ images, photoLoader });

  expect(await screen.findByAltText("Memory 4")).toHaveAttribute(
    "src",
    "blob:edit-photo-4"
  );
  expect(photoLoader.load).toHaveBeenCalledTimes(4);
  expect(images.map(({ id }) => id)).toEqual([
    "edit-photo-1",
    "edit-photo-2",
    "edit-photo-3",
    "edit-photo-4",
  ]);
});

test("appends each photo selection from the latest image state", async () => {
  const setImages = jest.fn();
  renderPage({ setImages });
  const input = screen.getByLabelText("Choose Photos");
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.jpg", { type: "image/jpeg" });
  const third = new File(["third"], "third.jpg", { type: "image/jpeg" });

  fireEvent.change(input, { target: { files: [first] } });
  await waitFor(() => expect(setImages).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { files: [second] } });
  await waitFor(() => expect(setImages).toHaveBeenCalledTimes(2));
  fireEvent.change(input, { target: { files: [third] } });
  await waitFor(() => expect(setImages).toHaveBeenCalledTimes(3));
  const images = setImages.mock.calls.reduce(
    (current, [update]) => update(current),
    []
  );
  expect(images.map(({ blob }) => blob)).toEqual([first, second, third]);
});

test("routes Edit Memory selection through the adapter while preserving existing photos and file order", async () => {
  const existing = { id: "stored-photo" };
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.png", { type: "image/png" });
  const photoSelectionAdapter = {
    acquireImages: jest.fn(() => ({
      status: PHOTO_SELECTION_RESULT_STATUS.SUCCESS,
      files: [second, first],
    })),
  };
  const setImages = jest.fn();
  renderPage({
    editingIndex: "memory-edit",
    images: [existing],
    photoSelectionAdapter,
    setImages,
  });
  const input = screen.getByLabelText("Add More Photos");

  fireEvent.change(input, { target: { files: [first, second] } });

  expect(photoSelectionAdapter.acquireImages).toHaveBeenCalledWith({
    input,
    accept: "image/*",
    multiple: true,
    limit: 11,
  });
  await waitFor(() => expect(setImages).toHaveBeenCalledTimes(1));
  const updated = setImages.mock.calls[0][0]([existing]);
  expect(updated[0]).toBe(existing);
  expect(updated.slice(1).map(({ blob }) => blob)).toEqual([second, first]);
  expect(URL.createObjectURL.mock.calls.map(([file]) => file)).toEqual([second, first]);
  expect(input).toHaveValue("");
});

test.each([
  PHOTO_SELECTION_RESULT_STATUS.CANCELED,
  PHOTO_SELECTION_RESULT_STATUS.FAILURE,
  PHOTO_SELECTION_RESULT_STATUS.UNSUPPORTED,
])("a %s adapter result leaves Memory photos unchanged", (status) => {
  const photoSelectionAdapter = {
    acquireImages: jest.fn(() => ({ status, files: [], error: new Error("selection unavailable") })),
  };
  const setImages = jest.fn();
  renderPage({ photoSelectionAdapter, setImages });
  const input = screen.getByLabelText("Choose Photos");

  fireEvent.change(input, { target: { files: [] } });

  expect(setImages).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(input).toHaveValue("");
});

test("clears the file control after accepting photos so the same photo can be selected again", async () => {
  renderPage();
  const input = screen.getByLabelText("Choose Photos");
  const photo = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

  fireEvent.change(input, { target: { files: [photo] } });

  expect(input).toHaveValue("");
  expect(await screen.findByText(/Original file was preserved/)).toBeInTheDocument();
});

test("shows a count-limit error without changing existing photos", async () => {
  const existing = Array.from({ length: 12 }, (_, index) => ({ id: `stored-${index}` }));
  const photoSelectionAdapter = {
    acquireImages: jest.fn(() => ({
      status: PHOTO_SELECTION_RESULT_STATUS.FAILURE,
      files: [],
      error: new Error("This entry already has the maximum number of photos. Remove one first."),
    })),
  };
  const setImages = jest.fn();
  renderPage({ images: existing, photoSelectionAdapter, setImages });
  const input = screen.getByLabelText("Add More Photos");

  fireEvent.change(input, { target: { files: [new File(["extra"], "extra.jpg", { type: "image/jpeg" })] } });

  expect(photoSelectionAdapter.acquireImages).toHaveBeenCalledWith(expect.objectContaining({ limit: 0 }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/maximum number of photos/i);
  expect(setImages).not.toHaveBeenCalled();
});

test("the same file can be selected again after a preparation error", async () => {
  const file = new File(["retry"], "retry.jpg", { type: "image/jpeg" });
  const photoSelectionAdapter = {
    acquireImages: jest.fn()
      .mockReturnValueOnce({
        status: PHOTO_SELECTION_RESULT_STATUS.FAILURE,
        files: [],
        error: new Error("Temporary selection error. Try again."),
      })
      .mockReturnValue({ status: PHOTO_SELECTION_RESULT_STATUS.SUCCESS, files: [file] }),
  };
  const setImages = jest.fn();
  renderPage({ photoSelectionAdapter, setImages });
  const input = screen.getByLabelText("Choose Photos");

  fireEvent.change(input, { target: { files: [file] } });
  expect(await screen.findByRole("alert")).toHaveTextContent(/Try again/);
  expect(input).toHaveValue("");
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(setImages).toHaveBeenCalledTimes(1));
  expect(input).toHaveValue("");
  expect(URL.createObjectURL).toHaveBeenCalledWith(file);
});
