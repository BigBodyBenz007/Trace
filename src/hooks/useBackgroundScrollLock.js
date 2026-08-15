import { useEffect } from "react";

let lockCount = 0;
let scrollY = 0;
let previous = null;

function lock() {
  if (lockCount++ > 0) return;
  scrollY = window.scrollY || window.pageYOffset || 0;
  previous = {
    body: { overflow: document.body.style.overflow, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width },
    htmlOverscroll: document.documentElement.style.overscrollBehavior,
  };
  Object.assign(document.body.style, { overflow: "hidden", position: "fixed", top: `-${scrollY}px`, width: "100%" });
  document.documentElement.style.overscrollBehavior = "none";
}

function unlock() {
  if (lockCount === 0 || --lockCount > 0) return;
  Object.assign(document.body.style, previous.body);
  document.documentElement.style.overscrollBehavior = previous.htmlOverscroll;
  previous = null;
  window.scrollTo({ left: 0, top: scrollY, behavior: "auto" });
}

export default function useBackgroundScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lock();
    return unlock;
  }, [active]);
}
