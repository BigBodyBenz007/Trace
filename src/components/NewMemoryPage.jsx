import { useRef, useState } from "react";
import { CATEGORY_OPTIONS } from "../constants/categories";
import {
  PHOTO_SELECTION_ACCEPT,
  PHOTO_SELECTION_RESULT_STATUS,
  webPhotoSelectionAdapter,
} from "../services/photoSelectionAdapter";
import { PHOTO_LOAD_PRIORITY } from "../services/photoUrlLoader";
import {
  ingestPhotoFiles,
  PHOTO_INGESTION_POLICY,
  photoSelectionSuccessMessage,
} from "../services/photoIngestion";
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
  draftRecovered = false,
  draftInitialDate,
  persistDraft = () => {},
  stageDraftPhotos,
  removeDraftPhoto,
  discardDraft,
  onBackToTimeline,
  folioRef = null,
  photoSelectionAdapter = webPhotoSelectionAdapter,
}) {
  const initialDateRef = useRef(draftInitialDate || date);
  const photoSelectionInFlightRef = useRef(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photosProcessing, setPhotosProcessing] = useState(false);

  function releaseDraftPhoto(image) {
    if (image?.isDraft && image.url) URL.revokeObjectURL(image.url);
  }

  function draftSnapshot({
    nextTitle = title,
    nextDescription = description,
    nextDate = date,
    nextCategories = categories,
    nextImages = images,
  } = {}) {
    return {
      initialDate: initialDateRef.current,
      form: {
        title: nextTitle,
        description: nextDescription,
        date: nextDate,
        categories: nextCategories,
      },
      draftImages: nextImages,
    };
  }

  function persistAddDraft(snapshot) {
    if (editingIndex !== null) return true;
    try {
      persistDraft(snapshot);
      return true;
    } catch (error) {
      setPhotoError("Trace could not save the latest unfinished Memory draft. Keep this page open and retry.");
      return false;
    }
  }

  function changeTitle(value) {
    setTitle(value);
    persistAddDraft(draftSnapshot({ nextTitle: value }));
  }

  function changeDescription(value) {
    setDescription(value);
    persistAddDraft(draftSnapshot({ nextDescription: value }));
  }

  function changeDate(value) {
    setDate(value);
    persistAddDraft(draftSnapshot({ nextDate: value }));
  }

  function changeCategories(value) {
    setCategories(value);
    persistAddDraft(draftSnapshot({ nextCategories: value }));
  }

  async function selectPhotos(event) {
    if (photoSelectionInFlightRef.current) return;
    const input = event.currentTarget;
    const selection = photoSelectionAdapter.acquireImages({
      input,
      accept: input.accept,
      multiple: input.multiple,
      limit: Math.max(0, PHOTO_INGESTION_POLICY.maxPhotosPerEntry - images.length),
    });
    input.value = "";

    if (selection.status === PHOTO_SELECTION_RESULT_STATUS.CANCELED) return;
    if (selection.status !== PHOTO_SELECTION_RESULT_STATUS.SUCCESS) {
      setPhotoStatus("");
      setPhotoError(selection.error?.message || "Trace could not read those photos. Choose them again.");
      return;
    }

    photoSelectionInFlightRef.current = true;
    setPhotosProcessing(true);
    setPhotoError("");
    setPhotoStatus("Preparing photos…");
    try {
      const result = await ingestPhotoFiles(selection.files, {
        existingCount: images.length,
        existingDraftBytes: images.reduce(
          (total, image) => total + (image?.isDraft
            ? Number(image.storedBytes) || Number(image.blob?.size) || 0
            : 0),
          0
        ),
      });
      let newImages;
      if (editingIndex === null && stageDraftPhotos) {
        newImages = await stageDraftPhotos(result.photos, draftSnapshot());
      } else {
        newImages = result.photos.map((photo) => ({
          ...photo,
          isDraft: true,
          url: URL.createObjectURL(photo.blob),
        }));
      }
      setImages((current) => [...current, ...newImages]);
      setPhotoStatus(photoSelectionSuccessMessage(result));
    } catch (error) {
      setPhotoStatus("");
      setPhotoError(error.message || "Trace could not safely prepare those photos. Choose them again.");
    } finally {
      photoSelectionInFlightRef.current = false;
      setPhotosProcessing(false);
    }
  }

  async function cancelMemory() {
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

    if (!wasEditingExistingMemory && discardDraft) {
      setPhotosProcessing(true);
      setPhotoError("");
      try {
        await discardDraft();
      } catch (error) {
        setPhotoError("Trace could not safely discard this Memory draft. Nothing else was changed; try again.");
      } finally {
        setPhotosProcessing(false);
      }
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

  function backToTimeline() {
    if (editingIndex !== null) return;
    setPhotoError("");
    const snapshot = draftSnapshot();
    try {
      const result = onBackToTimeline?.(snapshot);
      if (result && typeof result.then === "function") {
        result.catch(() => setPhotoError(
          "Trace could not save the latest unfinished Memory draft. Keep this page open and retry."
        ));
      }
    } catch (error) {
      setPhotoError("Trace could not save the latest unfinished Memory draft. Keep this page open and retry.");
    }
  }

  async function removePhoto(image, index) {
    if (photosProcessing) return;
    if (editingIndex === null && image?.isDraft && removeDraftPhoto) {
      setPhotosProcessing(true);
      setPhotoError("");
      try {
        const nextImages = await removeDraftPhoto(image, draftSnapshot());
        setImages(nextImages);
      } catch (error) {
        setPhotoError("Trace could not safely remove that staged photo. It remains in your draft; try again.");
      } finally {
        setPhotosProcessing(false);
      }
      return;
    }
    releaseDraftPhoto(image);
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
        {editingIndex === null && (
          <nav className="trace-memory-editor__navigation" aria-label="Add Memory navigation">
            <button
              className="trace-memory-editor__action trace-memory-editor__action--secondary"
              type="button"
              disabled={photosProcessing}
              onClick={backToTimeline}
            >
              Back to Timeline
            </button>
          </nav>
        )}
        <header className="trace-memory-editor__header">
          <button
            aria-label={`Close ${editingIndex !== null ? "Edit Memory" : "Add Memory"}`}
            className="trace-memory-editor__close"
            type="button"
            disabled={photosProcessing}
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

        {draftRecovered && editingIndex === null && (
          <p className="trace-memory-editor__recovery" role="status">
            Your unfinished Memory draft was restored.
          </p>
        )}

        <div className="trace-memory-editor__primary-fields">
          <input
            className="trace-memory-editor__field trace-memory-editor__field--title"
            placeholder="Memory title..."
            value={title}
            disabled={photosProcessing}
            onChange={(event) => changeTitle(event.target.value)}
          />

          <label className="trace-memory-editor__date-field">
            <span className="trace-memory-editor__field-label">Date</span>
            <span className="trace-memory-editor__date-control">
              <input
                className="trace-memory-editor__field trace-memory-editor__field--date"
                type="date"
                value={date}
                disabled={photosProcessing}
                onChange={(event) => changeDate(event.target.value)}
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
            disabled={photosProcessing}
            onChange={(event) => changeDescription(event.target.value)}
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
                  disabled={photosProcessing}
                  onClick={() => {
                    changeCategories(isSelected
                      ? categories.filter((item) => item !== category)
                      : [...categories, category]);
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
              {photosProcessing ? "Preparing Photos…" : images.length ? "Add More Photos" : "Choose Photos"}
              <input
                type="file"
                accept={PHOTO_SELECTION_ACCEPT}
                multiple
                disabled={photosProcessing}
                onChange={selectPhotos}
              />
            </label>
          </div>

          {photoStatus && <p className="trace-photo-feedback" role="status">{photoStatus}</p>}
          {photoError && <p className="trace-photo-feedback trace-photo-feedback--error" role="alert">{photoError}</p>}

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
                    disabled={photosProcessing}
                    onClick={() => removePhoto(image, index)}
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
            disabled={photosProcessing}
            onClick={saveMemory}
          >
            {photosProcessing ? "Preparing Photos…" : editingIndex !== null ? "Save Changes" : "Save Memory"}
          </button>
          <button
            className="trace-memory-editor__action trace-memory-editor__action--secondary"
            disabled={photosProcessing}
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
