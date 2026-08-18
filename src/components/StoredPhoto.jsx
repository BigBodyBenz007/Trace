import { useEffect, useState } from "react";
import { PHOTO_LOAD_PRIORITY } from "../services/photoUrlLoader";

export function storedPhotoId(photo) {
  return typeof photo === "string" ? photo : photo?.id || "";
}

export function storedPhotoUrl(photo) {
  return typeof photo === "string" ? photo : photo?.url || "";
}

export function useStoredPhoto(photo, {
  enabled = true,
  loader = null,
  priority = PHOTO_LOAD_PRIORITY.visible,
} = {}) {
  const id = storedPhotoId(photo);
  const immediateUrl = storedPhotoUrl(photo);
  const [result, setResult] = useState(() => ({
    id,
    unavailable: false,
    url: immediateUrl,
  }));

  useEffect(() => {
    let active = true;
    if (immediateUrl) {
      setResult({ id, unavailable: false, url: immediateUrl });
      return () => { active = false; };
    }
    setResult({ id, unavailable: false, url: "" });
    if (!enabled || !loader || !id) return () => { active = false; };

    loader.load(id, priority).then((loaded) => {
      if (active) setResult(loaded);
    });
    return () => { active = false; };
  }, [enabled, id, immediateUrl, loader, priority]);

  return result;
}

export default function StoredPhoto({
  alt,
  enabled = true,
  loader,
  photo,
  priority,
  placeholder,
  ...imageProps
}) {
  const { url } = useStoredPhoto(photo, { enabled, loader, priority });
  return url ? <img {...imageProps} alt={alt} src={url} /> : placeholder;
}
