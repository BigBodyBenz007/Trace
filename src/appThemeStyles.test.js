import fs from "fs";
import path from "path";

const source = (file) => fs.readFileSync(path.join(process.cwd(), "src", file), "utf8");

test("defines the full-app semantic token contract for both Phase 1 shell themes", () => {
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
  ];

  requiredTokens.forEach((token) => expect(css).toContain(token));
  expect(css).toContain(':root[data-trace-shell-theme="modern-heirloom"]');
  expect(css).toContain(':root[data-trace-shell-theme="to-kingdoms-ahead"]');
});

test("shared forms, actions, surfaces, dialogs, toasts, and progress consume semantic tokens", () => {
  const css = source("index.css");
  const appCss = source("App.css");

  expect(css).toMatch(/\.trace-feature-page \.trace-action--primary[\s\S]*--trace-button-primary-bg/);
  expect(css).toMatch(/\.trace-feature-page input:not[\s\S]*--trace-input-bg/);
  expect(css).toMatch(/\.trace-feature-surface[\s\S]*--trace-surface-primary/);
  expect(css).toMatch(/\.journal-privacy-dialog-backdrop[\s\S]*--trace-overlay/);
  expect(css).toMatch(/\.journal-privacy-dialog[\s\S]*--trace-dialog-surface/);
  expect(css).toMatch(/progress"\][\s\S]*--trace-progress-track/);
  expect(css).toMatch(/\.trace-app-shell\[data-motion="reduced"\][\s\S]*transition: none/);
  expect(appCss).toMatch(/\.trace-save-confirmation[\s\S]*--trace-toast-bg/);
});
