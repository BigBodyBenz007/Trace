import fs from "fs";
import path from "path";

const source = (file) => fs.readFileSync(path.join(process.cwd(), "src", file), "utf8");

test("defines the full-app semantic and shared-component contracts for both shell themes", () => {
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
  const modernBlock = css.slice(0, css.indexOf(':root[data-trace-shell-theme="to-kingdoms-ahead"]'));

  expect(modernBlock).toContain("--trace-button-hover-transform: none");
  expect(modernBlock).toContain("--trace-control-shadow: none");
  expect(modernBlock).toContain("--trace-identity-divider-display: none");
  expect(modernBlock).toContain("--trace-toast-radius: 10px");
  expect(modernBlock).toContain("--trace-trophy-dialog-radius: 14px");
  expect(modernBlock).toContain("--trace-stat-card-background: #0d2030");
  expect(modernBlock).toContain("--trace-dialog-hardware-display: none");
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
  expect(kingdomBlock).not.toContain("--trace-water-stat-background: var(--trace-material-iron)");
  expect(kingdomBlock).toContain("--trace-dialog-hardware-display: block");
});
