import { useState } from "react";

function WorkoutPhotos({ photos = [], label = "Workout photos" }) {
  const [selected, setSelected] = useState(null);
  if (photos.length === 0) return null;
  return (
    <section aria-label={label} style={{ marginTop: "14px" }}>
      <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
        {photos.map((photo, index) => photo?.url && (
          <button key={photo.id || index} type="button" aria-label={`View workout photo ${index + 1}`} onClick={() => setSelected(photo.url)} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
            <img src={photo.url} alt={`Workout ${index + 1}`} style={{ borderRadius: "8px", height: "110px", objectFit: "cover", width: "100%" }} />
          </button>
        ))}
      </div>
      {selected && (
        <div role="dialog" aria-modal="true" aria-label="Workout photo viewer" onClick={() => setSelected(null)} style={{ alignItems: "center", background: "rgba(0,0,0,.9)", cursor: "pointer", display: "flex", inset: 0, justifyContent: "center", position: "fixed", zIndex: 9999 }}>
          <img src={selected} alt="Full size workout" style={{ borderRadius: "12px", maxHeight: "95%", maxWidth: "95%" }} />
        </div>
      )}
    </section>
  );
}

export default WorkoutPhotos;
