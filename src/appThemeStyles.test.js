import fs from "fs";
import path from "path";

const source = (file) => fs.readFileSync(path.join(process.cwd(), "src", file), "utf8");

test("defines the full-app semantic and shared-component contracts for every active shell theme", () => {
  const css = source("appThemes.css");
  const requiredTokens = [
    "--trace-app-background",
    "--trace-surface-primary",
    "--trace-surface-secondary",
    "--trace-surface-elevated",
    "--trace-dialog-surface",
    "--trace-text-primary",
    "--trace-text-secondary",
    "--trace-border-default",
    "--trace-accent-primary",
    "--trace-accent-secondary",
    "--trace-button-primary-bg",
    "--trace-button-secondary-bg",
    "--trace-button-danger-bg",
    "--trace-input-bg",
    "--trace-focus-ring",
    "--trace-header-background",
    "--trace-toast-bg",
    "--trace-overlay",
    "--trace-progress-track",
    "--trace-progress-fill",
    "--trace-app-decoration",
    "--trace-panel-background",
    "--trace-card-background",
    "--trace-button-primary-shadow",
    "--trace-control-shadow",
    "--trace-option-selected-background",
    "--trace-segment-selected-background",
    "--trace-toggle-selected",
    "--trace-divider-decoration",
    "--trace-dialog-background",
    "--trace-toast-shadow",
    "--trace-progress-fill-background",
    "--trace-water-background",
    "--trace-material-timber",
    "--trace-material-iron",
    "--trace-material-stone",
    "--trace-material-passive-stone",
    "--trace-material-parchment",
    "--trace-material-leather",
    "--trace-document-dialog-background",
    "--trace-dialog-hardware-background",
  ];

  requiredTokens.forEach((token) => expect(css).toContain(token));
  expect(css).toContain(':root[data-trace-shell-theme="modern-heirloom"]');
  expect(css).toContain(':root[data-trace-shell-theme="river"]');
  expect(css).toContain(':root[data-trace-shell-theme="haunted-forest"]');
  expect(css).toContain(':root[data-trace-shell-theme="gnome-village"]');
  expect(css).toContain(':root[data-trace-shell-theme="to-kingdoms-ahead"]');
});

test("shared controls, surfaces, feedback, and nutrition progress consume component tokens", () => {
  const css = source("index.css");
  const appCss = source("App.css");

  expect(css).toMatch(/\.trace-feature-page \.trace-action--primary[\s\S]*--trace-button-primary-bg/);
  expect(css).toMatch(/\.trace-feature-page input:not[\s\S]*--trace-input-bg/);
  expect(css).toMatch(/\.trace-feature-surface[\s\S]*--trace-panel-background/);
  expect(css).toMatch(/\.trace-data-card,[\s\S]*--trace-card-background/);
  expect(css).toMatch(/\.trace-home-visibility-option[\s\S]*--trace-option-background/);
  expect(css).toMatch(/\.trace-home-visibility-option__track[\s\S]*--trace-toggle-track/);
  expect(css).toMatch(/gnome-village[\s\S]*trace-feature-page--journal[\s\S]*trace-action--brass[\s\S]*--trace-material-carved-wood/);
  expect(css).toMatch(/\.journal-privacy-dialog-backdrop[\s\S]*--trace-overlay/);
  expect(css).toMatch(/\.journal-privacy-dialog[\s\S]*--trace-dialog-background/);
  expect(css).toMatch(/progress"\][\s\S]*--trace-progress-track/);
  expect(css).toMatch(/\.trace-water[\s\S]*--trace-water-background/);
  expect(css).toMatch(/\.trace-water__stats article[\s\S]*--trace-water-stat-shadow/);
  expect(css).toMatch(/\.journal-privacy-dialog[\s\S]*--trace-document-dialog-background/);
  expect(css).toMatch(/\.trace-feature-surface[\s\S]*--trace-panel-outline/);
  expect(css).toMatch(/\.trace-app-shell\[data-motion="reduced"\][\s\S]*transition: none/);
  expect(appCss).toMatch(/\.trace-save-confirmation[\s\S]*--trace-toast-bg/);
  expect(appCss).toMatch(/\.trace-save-confirmation[\s\S]*--trace-toast-shadow/);
});

test("Modern Heirloom keeps its established component geometry and motion defaults", () => {
  const css = source("appThemes.css");
  const modernBlock = css.slice(0, css.indexOf(':root[data-trace-shell-theme="river"]'));

  expect(modernBlock).toContain("--trace-button-hover-transform: none");
  expect(modernBlock).toContain("--trace-control-shadow: none");
  expect(modernBlock).toContain("--trace-identity-divider-display: none");
  expect(modernBlock).toContain("--trace-toast-radius: 10px");
  expect(modernBlock).toContain("--trace-trophy-dialog-radius: 14px");
  expect(modernBlock).toContain("--trace-stat-card-background: #0d2030");
  expect(modernBlock).toContain("--trace-dialog-hardware-display: none");
});

test("River defines distinct natural materials without Kingdom construction", () => {
  const css = source("appThemes.css");
  const riverStart = css.indexOf(':root[data-trace-shell-theme="river"]');
  const hauntedStart = css.indexOf(':root[data-trace-shell-theme="haunted-forest"]');
  const riverBlock = css.slice(riverStart, hauntedStart);

  expect(riverBlock).toMatch(/--trace-material-driftwood:[\s\S]*repeating-linear-gradient/);
  expect(riverBlock).toMatch(/--trace-material-wet-rock:[\s\S]*radial-gradient/);
  expect(riverBlock).toMatch(/--trace-material-river-stone:[\s\S]*radial-gradient/);
  expect(riverBlock).toMatch(/--trace-material-river-glass:[\s\S]*repeating-radial-gradient/);
  expect(riverBlock).toContain("--trace-material-timber: var(--trace-material-driftwood)");
  expect(riverBlock).toContain("--trace-material-iron: var(--trace-material-wet-rock)");
  expect(riverBlock).toContain("--trace-material-stone: var(--trace-material-river-stone)");
  expect(riverBlock).toContain("--trace-material-parchment: var(--trace-material-river-glass)");
  expect(riverBlock).toContain("--trace-button-primary-bg: var(--trace-material-driftwood)");
  expect(riverBlock).toContain("--trace-button-secondary-bg: var(--trace-material-wet-rock)");
  expect(riverBlock).toContain("--trace-input-bg: var(--trace-material-river-glass)");
  expect(riverBlock).toContain("--trace-stat-card-background: var(--trace-material-river-stone-passive)");
  expect(riverBlock).toContain('url("./assets/app-themes/river/riverbed-environment.jpg")');
  expect(riverBlock).toContain('url("./assets/app-themes/river/water-caustics.jpg")');
  expect(riverBlock).toContain("--trace-app-background-blend-mode: normal, normal, normal, screen, normal");
  expect(riverBlock).toContain("--trace-dialog-hardware-display: none");
  expect(riverBlock).not.toMatch(/rivet|forged|parchment-gradient|brass corner/i);
});

test("Haunted Forest defines an environmental shell and its own organic material hierarchy", () => {
  const css = source("appThemes.css");
  const hauntedStart = css.indexOf(':root[data-trace-shell-theme="haunted-forest"]');
  const kingdomStart = css.indexOf(':root[data-trace-shell-theme="to-kingdoms-ahead"]');
  const hauntedBlock = css.slice(hauntedStart, kingdomStart);

  expect(hauntedBlock).toContain('url("./assets/app-themes/haunted-forest/ancient-forest-environment.jpg")');
  expect(hauntedBlock).toMatch(/--trace-material-aged-wood:[\s\S]*repeating-linear-gradient/);
  expect(hauntedBlock).toMatch(/--trace-material-bark:[\s\S]*repeating-linear-gradient/);
  expect(hauntedBlock).toMatch(/--trace-material-mossy-stone:[\s\S]*radial-gradient/);
  expect(hauntedBlock).toMatch(/--trace-material-misted-glass:[\s\S]*repeating-radial-gradient/);
  expect(hauntedBlock).toContain("--trace-button-primary-bg: var(--trace-material-aged-wood)");
  expect(hauntedBlock).toContain("--trace-button-secondary-bg: var(--trace-material-bark)");
  expect(hauntedBlock).toContain("--trace-input-bg: var(--trace-material-misted-glass)");
  expect(hauntedBlock).toContain("--trace-stat-card-background: var(--trace-material-passive-mossy-stone)");
  expect(hauntedBlock).toContain("--trace-water-stat-background: var(--trace-material-passive-mossy-stone)");
  expect(hauntedBlock).toContain("--trace-dialog-hardware-display: block");
  expect(hauntedBlock).not.toContain("--trace-material-driftwood");
  expect(hauntedBlock).not.toContain("--trace-material-iron: var(--trace-material-wet-rock)");
});

test("Gnome Village defines a bright environmental shell and playful material hierarchy", () => {
  const css = source("appThemes.css");
  const gnomeStart = css.indexOf(':root[data-trace-shell-theme="gnome-village"]');
  const kingdomStart = css.indexOf(':root[data-trace-shell-theme="to-kingdoms-ahead"]');
  const gnomeBlock = css.slice(gnomeStart, kingdomStart);

  expect(gnomeBlock).toContain('url("./assets/app-themes/gnome-village/gnome-village-environment.jpg")');
  expect(gnomeBlock).toMatch(/--trace-material-carved-wood:[\s\S]*repeating-linear-gradient/);
  expect(gnomeBlock).toMatch(/--trace-material-storybook-stone:[\s\S]*radial-gradient/);
  expect(gnomeBlock).toMatch(/--trace-material-passive-storybook-stone:[\s\S]*radial-gradient/);
  expect(gnomeBlock).toMatch(/--trace-material-storybook-glass:[\s\S]*repeating-radial-gradient/);
  expect(gnomeBlock).toContain("--trace-button-primary-bg: var(--trace-material-carved-wood)");
  expect(gnomeBlock).toContain("--trace-button-secondary-bg: var(--trace-material-storybook-stone)");
  expect(gnomeBlock).toContain("--trace-input-bg: var(--trace-material-storybook-glass)");
  expect(gnomeBlock).toContain("--trace-stat-card-background: var(--trace-material-passive-storybook-stone)");
  expect(gnomeBlock).toContain("--trace-water-stat-background: var(--trace-material-passive-storybook-stone)");
  expect(gnomeBlock).toContain("--trace-document-dialog-hardware-display: block");
  expect(gnomeBlock).toContain("--trace-progress-fill: #86b93e");
  expect(gnomeBlock).not.toContain("--trace-material-aged-wood");
  expect(gnomeBlock).not.toContain("--trace-material-driftwood");
});

test("To Kingdoms Ahead defines visibly distinct reusable physical materials", () => {
  const css = source("appThemes.css");
  const kingdomBlock = css.slice(css.indexOf(':root[data-trace-shell-theme="to-kingdoms-ahead"]'));

  expect(kingdomBlock).toMatch(/--trace-material-timber:[\s\S]*repeating-linear-gradient/);
  expect(kingdomBlock).toMatch(/--trace-material-iron:[\s\S]*radial-gradient/);
  expect(kingdomBlock).toMatch(/--trace-material-stone:[\s\S]*radial-gradient/);
  expect(kingdomBlock).toMatch(/--trace-material-passive-stone:[\s\S]*radial-gradient/);
  expect(kingdomBlock).toMatch(/--trace-material-parchment:[\s\S]*repeating-linear-gradient/);
  expect(kingdomBlock).toContain("--trace-button-primary-bg: var(--trace-material-timber)");
  expect(kingdomBlock).toContain("--trace-button-secondary-bg: var(--trace-material-iron)");
  expect(kingdomBlock).toContain("--trace-input-bg: var(--trace-material-parchment)");
  expect(kingdomBlock).toContain("--trace-stat-card-background: var(--trace-material-passive-stone)");
  expect(kingdomBlock).toContain("--trace-water-stat-background: var(--trace-material-passive-stone)");
  expect(kingdomBlock).toContain('url("./assets/app-themes/to-kingdoms-ahead/fortress-environment.jpg")');
  expect(kingdomBlock).toContain("--trace-panel-background: var(--trace-material-fortress-panel)");
  expect(kingdomBlock).toContain("--trace-water-background: var(--trace-material-fortress-panel)");
  expect(kingdomBlock).not.toContain("--trace-water-stat-background: var(--trace-material-iron)");
  expect(kingdomBlock).toContain("--trace-dialog-hardware-display: block");
});
