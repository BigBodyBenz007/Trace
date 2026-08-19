let activeLocks = [];
let baseStyles = null;
let nextLockId = 1;

function captureStyles() {
  const body = document.body;
  const root = document.documentElement;
  return {
    body: {
      left: body.style.left,
      overflow: body.style.overflow,
      position: body.style.position,
      right: body.style.right,
      top: body.style.top,
      width: body.style.width,
    },
    root: {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    },
  };
}

function restoreStyles(styles) {
  if (!styles) return;
  Object.assign(document.body.style, styles.body);
  Object.assign(document.documentElement.style, styles.root);
}

function applyActiveLocks() {
  restoreStyles(baseStyles);
  activeLocks.forEach((lock) => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (lock.mode !== "fixed") return;
    document.body.style.left = `-${lock.scrollX}px`;
    document.body.style.position = "fixed";
    document.body.style.right = "0";
    document.body.style.top = `-${lock.scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overscrollBehavior = "none";
  });
}

export function acquireDocumentScrollLock({
  mode = "overflow",
  scrollX = 0,
  scrollY = 0,
} = {}) {
  if (activeLocks.length === 0) baseStyles = captureStyles();
  const lock = { id: nextLockId, mode, scrollX, scrollY };
  nextLockId += 1;
  activeLocks.push(lock);
  applyActiveLocks();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = activeLocks.filter(({ id }) => id !== lock.id);
    if (activeLocks.length > 0) {
      applyActiveLocks();
      return;
    }
    restoreStyles(baseStyles);
    baseStyles = null;
  };
}
