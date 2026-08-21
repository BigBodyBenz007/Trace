const ASSET_ROOT = "../../river-image-pack/";

const SECTIONS = Object.freeze([
  {
    id: "quiet-narrow",
    label: "Quiet narrow",
    file: "Quiet Narrow River Through Mossy Rocks.png",
    width: 680,
    mobileWidth: 560,
    imageHeight: "111%",
    imageTop: "-5%",
    imageX: "44%",
  },
  {
    id: "gentle-rise",
    label: "Gentle rise",
    file: "Gentle River Rise.png",
    width: 960,
    mobileWidth: 720,
    imageHeight: "111%",
    imageTop: "-8%",
    imageX: "50%",
  },
  {
    id: "high-calm",
    label: "High calm",
    file: "High-Calm River Through Fresh Wild Terrain.png",
    width: 760,
    mobileWidth: 600,
    imageHeight: "139%",
    imageTop: "-40%",
    imageX: "48%",
  },
  {
    id: "broad-living",
    label: "Broad living",
    file: "Broad river through living landscape.png",
    width: 980,
    mobileWidth: 680,
    imageHeight: "122%",
    imageTop: "-32%",
    imageX: "48%",
  },
  {
    id: "lively-current",
    label: "Lively current",
    file: "Lively white-capped river current.png",
    width: 820,
    mobileWidth: 620,
    imageHeight: "122%",
    imageTop: "-32%",
    imageX: "52%",
  },
  {
    id: "gradual-descent",
    label: "Gradual descent",
    file: "Gradual River Descent Through Natural Terrain.png",
    width: 900,
    mobileWidth: 700,
    imageHeight: "122%",
    imageTop: "-28%",
    imageX: "50%",
  },
]);

const MEMORIES = Object.freeze([
  [0.05, "A quiet beginning", "2007-04-17", "Family"],
  [0.15, "A new direction", "2010-09-08", "Milestone"],
  [0.26, "Moving upward", "2013-06-21", "Growth"],
  [0.37, "A steadier season", "2016-01-11", "Reflection"],
  [0.49, "Finding the current", "2018-08-30", "Travel"],
  [0.60, "Room to breathe", "2020-05-19", "Health"],
  [0.71, "Momentum", "2022-11-04", "Achievement"],
  [0.81, "White water", "2024-07-16", "Adventure"],
  [0.90, "A gradual turn", "2025-12-02", "Change"],
  [0.97, "Today", "2026-08-20", "Present"],
]);

const sectionsNode = document.querySelector("#river-sections");
const memoryNode = document.querySelector("#memory-track");
const viewport = document.querySelector("#river-viewport");
const jump = document.querySelector("#section-jump");
const position = document.querySelector("#proof-position");
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const captureMode = new URLSearchParams(window.location.search).get("capture");
if (captureMode) document.documentElement.dataset.captureMode = captureMode;

function assetUrl(filename) {
  return `${ASSET_ROOT}${encodeURIComponent(filename)}`;
}

function renderSections() {
  SECTIONS.forEach((section, index) => {
    const node = document.createElement("section");
    node.className = "river-section";
    node.dataset.riverSection = section.id;
    node.dataset.sectionIndex = String(index);
    node.style.setProperty("--section-width", `${section.width}px`);
    node.style.setProperty("--section-width-mobile", `${section.mobileWidth}px`);
    node.style.setProperty("--image-height", section.imageHeight);
    node.style.setProperty("--image-top", section.imageTop);
    node.style.setProperty("--image-x", section.imageX);

    const image = document.createElement("img");
    image.alt = "";
    image.ariaHidden = "true";
    image.decoding = captureMode ? "sync" : "async";
    image.draggable = false;
    image.height = section.file.startsWith("Gradual") ? 887 : 724;
    image.src = assetUrl(section.file);
    image.width = section.file.startsWith("Gradual") ? 1774 : 2172;
    node.append(image);
    sectionsNode.append(node);

    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = `${index + 1}. ${section.label}`;
    jump.append(option);
  });
}

function renderMemories() {
  const trackWidth = sectionsNode.scrollWidth;

  MEMORIES.forEach(([x, title, date, category]) => {
    const item = document.createElement("li");
    item.className = "memory-fixture";
    item.style.setProperty("--memory-x", `${Math.round(x * trackWidth)}px`);
    const button = document.createElement("button");
    button.className = "memory-card";
    button.type = "button";
    button.setAttribute("aria-label", `Open memory ${title}`);
    button.innerHTML = `<strong>${title}</strong><time datetime="${date}">${date}</time><span>${category}</span>`;
    item.append(button);
    memoryNode.append(item);
  });
}

function sectionNodes() {
  return [...document.querySelectorAll("[data-river-section]")];
}

function nearestSectionIndex() {
  const center = viewport.scrollLeft + viewport.clientWidth / 2;
  const nodes = sectionNodes();
  let closest = 0;
  let distance = Number.POSITIVE_INFINITY;
  nodes.forEach((node, index) => {
    const nextDistance = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
    if (nextDistance < distance) {
      closest = index;
      distance = nextDistance;
    }
  });
  return closest;
}

function updatePosition() {
  const index = nearestSectionIndex();
  jump.value = SECTIONS[index].id;
  position.textContent = `Section ${index + 1} of ${SECTIONS.length}: ${SECTIONS[index].label}`;
}

function scrollToSection(id, behavior = "smooth") {
  const node = document.querySelector(`[data-river-section="${id}"]`);
  if (!node) return;
  viewport.scrollTo({
    behavior: prefersReducedMotion?.matches ? "auto" : behavior,
    left: Math.max(0, node.offsetLeft - (viewport.clientWidth - node.offsetWidth) / 2),
  });
}

let updateFrame = null;
viewport.addEventListener("scroll", () => {
  if (updateFrame !== null) return;
  updateFrame = requestAnimationFrame(() => {
    updateFrame = null;
    updatePosition();
  });
}, { passive: true });

document.querySelectorAll("[data-scroll-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = Number(button.dataset.scrollDirection);
    const current = nearestSectionIndex();
    const target = Math.max(0, Math.min(SECTIONS.length - 1, current + direction));
    scrollToSection(SECTIONS[target].id);
  });
});

jump.addEventListener("change", () => scrollToSection(jump.value));

renderSections();
renderMemories();

if (captureMode === "desktop") scrollToSection("gentle-rise", "auto");
if (captureMode === "mobile") scrollToSection("broad-living", "auto");

Promise.all([...document.images].map((image) => image.decode?.().catch(() => undefined)))
  .then(() => {
    if (captureMode === "desktop") scrollToSection("gentle-rise", "auto");
    if (captureMode === "mobile") scrollToSection("broad-living", "auto");
    updatePosition();
    document.documentElement.dataset.proofReady = "true";
  });
