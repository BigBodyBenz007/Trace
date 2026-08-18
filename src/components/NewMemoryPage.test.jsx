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

function renderPage({ images = [], photoLoader, setImages = jest.fn() } = {}) {
  render(
    <NewMemoryPage
      title=""
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
      setPage={jest.fn()}
      editingIndex={null}
      setEditingIndex={jest.fn()}
    />
  );
}

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
