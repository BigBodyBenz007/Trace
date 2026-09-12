import React from "react";
import { CLOSED_ENDPOINT, OPEN_ENDPOINT } from "../services/capsulePresentation";

const LABELS = {
  sealed: "Sealed Time Capsule vault",
  ready: "Time Capsule vault ready to open",
  opened: "Opened Time Capsule vault",
};
let preloadedVaultImages = null;
export function preloadTimeCapsuleVaultAssets() {
  if (preloadedVaultImages || typeof Image === "undefined") return preloadedVaultImages || [];
  preloadedVaultImages = [CLOSED_ENDPOINT, OPEN_ENDPOINT].map((source) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    return image;
  });
  return preloadedVaultImages;
}
export default function TimeCapsuleVault({ state = "sealed", variant = "detail" }) {
  return (
    <figure aria-label={LABELS[state] || LABELS.sealed}
      className={`trace-capsule-vault trace-capsule-vault--${variant} trace-capsule-vault--${state}`}
      data-capsule-vault-state={state} role="img">
      <img className="trace-capsule-vault__endpoint" src={state === "opened" ? OPEN_ENDPOINT : CLOSED_ENDPOINT} alt="" draggable="false" width="960" height="840" />
    </figure>
  );
}
