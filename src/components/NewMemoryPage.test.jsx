import { fireEvent, render, screen } from "@testing-library/react";
import NewMemoryPage from "./NewMemoryPage";

let originalCreateObjectURL;

beforeEach(() => {
  originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = jest.fn((file) => `blob:${file.name}`);
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
});

function renderPage({
  editingIndex = null,
  images = [],
  onCancelExistingMemory,
  photoLoader,
  setEditingIndex = jest.fn(),
  setImages = jest.fn(),
  setPage = jest.fn(),
  title = "",
} = {}) {
  return render(
    <NewMemoryPage
      title={title}
      setTitle={jest.fn()}
      description=""
      setDescription={jest.fn()}
      date="2026-08-17"
      setDate={jest.fn()}
      categories={[]}
      setCategories={jest.fn()}
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

test("appends each photo selection from the latest image state", () => {
  const setImages = jest.fn();
  renderPage({ setImages });
  const input = screen.getByLabelText("Choose Photos");
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.jpg", { type: "image/jpeg" });
  const third = new File(["third"], "third.jpg", { type: "image/jpeg" });

  fireEvent.change(input, { target: { files: [first] } });
  fireEvent.change(input, { target: { files: [second] } });
  fireEvent.change(input, { target: { files: [third] } });

  expect(setImages).toHaveBeenCalledTimes(3);
  const images = setImages.mock.calls.reduce(
    (current, [update]) => update(current),
    []
  );
  expect(images.map(({ blob }) => blob)).toEqual([first, second, third]);
});

test("clears the file control after accepting photos so the same photo can be selected again", () => {
  renderPage();
  const input = screen.getByLabelText("Choose Photos");
  const photo = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

  fireEvent.change(input, { target: { files: [photo] } });

  expect(input).toHaveValue("");
});
