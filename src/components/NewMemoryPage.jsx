import { useRef } from "react";
import { CATEGORY_OPTIONS } from "../constants/categories";
import {
  PHOTO_SELECTION_ACCEPT,
  PHOTO_SELECTION_RESULT_STATUS,
  webPhotoSelectionAdapter,
} from "../services/photoSelectionAdapter";
import { PHOTO_LOAD_PRIORITY } from "../services/photoUrlLoader";
import StoredPhoto from "./StoredPhoto";

function NewMemoryPage({
  title,
  setTitle,
  description,
  setDescription,
  date,
  setDate,
  categories,
  setCategories,
  images,
  setImages,
  photoLoader,
  saveMemory,
  setPage,
  editingIndex,
  setEditingIndex,
  onCancelExistingMemory,
  folioRef = null,
  photoSelectionAdapter = webPhotoSelectionAdapter,
}) {
  const initialDateRef = useRef(date);

  function releaseDraftPhoto(image) {
    if (image?.isDraft && image.url) URL.revokeObjectURL(image.url);
  }

  function selectPhotos(event) {
    const input = event.currentTarget;
    const selection = photoSelectionAdapter.acquireImages({
      input,
      accept: input.accept,
      multiple: input.multiple,
    });
    input.value = "";

    if (selection.status !== PHOTO_SELECTION_RESULT_STATUS.SUCCESS) return;

    const newImages = selection.files.map((file) => ({
      blob: file,
      isDraft: true,
      url: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...newImages]);
  }

  function cancelMemory() {
    const wasEditingExistingMemory = editingIndex !== null;
    const hasUnsavedContent =
      title !== "" ||
      description !== "" ||
      date !== initialDateRef.current ||
      categories.length > 0 ||
      images.length > 0;

    if (
      (editingIndex !== null || hasUnsavedContent) &&
      !window.confirm("Discard your changes? Your unsaved changes will be lost.")
    ) {
      return;
    }

    images.forEach(releaseDraftPhoto);
    setTitle("");
    setDescription("");
    setDate("");
    setCategories([]);
    setImages([]);
    setEditingIndex(null);
    if (wasEditingExistingMemory && onCancelExistingMemory) {
      onCancelExistingMemory();
    } else {
      setPage("home");
    }
  }

  return (
    <main
      className="trace-memory-editor"
      data-memory-editor-mode={editingIndex !== null ? "edit" : "add"}
    >
      <article
        className="trace-memory-editor__folio"
        data-testid="memory-editor-folio"
        ref={folioRef}
      >
        <header className="trace-memory-editor__header">
          <button
            aria-label={`Close ${editingIndex !== null ? "Edit Memory" : "Add Memory"}`}
            className="trace-memory-editor__close"
            type="button"
            onClick={cancelMemory}
          >
            ×
          </button>
          <p className="trace-memory-editor__kicker">Memory archive</p>
          <h1 className="trace-memory-editor__title">
            {editingIndex !== null ? "Edit Memory" : "Add Memory"}
          </h1>
          <p className="trace-memory-editor__supporting-copy">
            Capture a moment you'll want to remember.
          </p>
        </header>

        <div className="trace-memory-editor__primary-fields">
          <input
            className="trace-memory-editor__field trace-memory-editor__field--title"
            placeholder="Memory title..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <label className="trace-memory-editor__date-field">
            <span className="trace-memory-editor__field-label">Date</span>
            <span className="trace-memory-editor__date-control">
              <input
                className="trace-memory-editor__field trace-memory-editor__field--date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              {!date && (
                <span
                  aria-hidden="true"
                  className="trace-memory-editor__date-placeholder"
                >
                  Select a date
                </span>
              )}
            </span>
          </label>

          <textarea
            className="trace-memory-editor__field trace-memory-editor__field--story"
            placeholder="Tell your story..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <section
          className="trace-memory-editor__section"
          aria-labelledby="memory-categories-heading"
        >
          <h2 id="memory-categories-heading" className="trace-memory-editor__section-title">
            Categories
          </h2>
          <div aria-label="Memory categories" className="trace-memory-editor__categories">
            {CATEGORY_OPTIONS.map((category) => {
              const isSelected = categories.includes(category);

              return (
                <button
                  className="trace-memory-editor__category"
                  key={category}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setCategories(
                      isSelected
                        ? categories.filter((item) => item !== category)
                        : [...categories, category]
                    );
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="trace-memory-editor__section trace-memory-editor__photos"
          aria-labelledby="memory-photos-heading"
        >
          <div className="trace-memory-editor__photo-heading">
            <div>
              <h2 id="memory-photos-heading" className="trace-memory-editor__section-title">
                Photographs
              </h2>
              <p className="trace-memory-editor__section-note">
                {images.length > 0
                  ? `${images.length} selected`
                  : "Choose the images that belong with this Memory."}
              </p>
            </div>

            <label className="trace-memory-editor__photo-picker">
              {images.length ? "Add More Photos" : "Choose Photos"}
              <input
                type="file"
                accept={PHOTO_SELECTION_ACCEPT}
                multiple
                onChange={selectPhotos}
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="trace-memory-editor__photo-grid">
              {images.map((image, index) => (
                <div className="trace-memory-editor__photo" key={index}>
                  <StoredPhoto
                    alt={`Memory ${index + 1}`}
                    className="trace-memory-editor__photo-image"
                    enabled
                    loader={photoLoader}
                    photo={image}
                    placeholder={(
                      <span
                        aria-hidden="true"
                        className="trace-memory-editor__photo-image trace-memory-editor__photo-placeholder"
                        data-memory-edit-photo-placeholder="true"
                      />
                    )}
                    priority={PHOTO_LOAD_PRIORITY.detail}
                  />

                  <button
                    aria-label={`Remove photo ${index + 1}`}
                    className="trace-memory-editor__photo-remove"
                    type="button"
                    onClick={() => {
                      releaseDraftPhoto(image);
                      setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="trace-memory-editor__actions">
          <button
            className="trace-memory-editor__action trace-memory-editor__action--primary"
            onClick={saveMemory}
          >
            {editingIndex !== null ? "Save Changes" : "Save Memory"}
          </button>
          <button
            className="trace-memory-editor__action trace-memory-editor__action--secondary"
            onClick={cancelMemory}
          >
            Cancel
          </button>
        </div>
      </article>
    </main>
  );
}

export default NewMemoryPage;
