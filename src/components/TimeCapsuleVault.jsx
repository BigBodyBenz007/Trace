import React from "react";
import BODY_ASSET from "../assets/time-capsule/vault-body.png";
import LID_ASSET from "../assets/time-capsule/vault-lid.png";

const LABELS = {
  sealed: "Sealed Time Capsule vault",
  ready: "Time Capsule vault ready to open",
  opened: "Opened Time Capsule vault",
  opening: "Time Capsule vault opening",
  sealing: "Time Capsule vault sealing",
};

export default function TimeCapsuleVault({
  state = "sealed",
  variant = "detail",
  reducedMotion = false,
  statusText = "",
}) {
  return (
    <figure
      aria-label={LABELS[state] || LABELS.sealed}
      className={`trace-capsule-vault trace-capsule-vault--${variant} trace-capsule-vault--${state}${reducedMotion ? " trace-capsule-vault--reduced" : ""}`}
      data-capsule-vault-state={state}
      role="img"
    >
      <span aria-hidden="true" className="trace-capsule-vault__stage">
        <span className="trace-capsule-vault__aura" />
        <img alt="" className="trace-capsule-vault__lid" draggable="false" src={LID_ASSET} />
        <span className="trace-capsule-vault__vapor trace-capsule-vault__vapor--one" />
        <span className="trace-capsule-vault__vapor trace-capsule-vault__vapor--two" />
        <span className="trace-capsule-vault__vapor trace-capsule-vault__vapor--three" />
        <img alt="" className="trace-capsule-vault__body" draggable="false" src={BODY_ASSET} />
        <span className="trace-capsule-vault__seam" />
        <span className="trace-capsule-vault__latch trace-capsule-vault__latch--left" />
        <span className="trace-capsule-vault__latch trace-capsule-vault__latch--right" />
        <span className="trace-capsule-vault__lock"><span /></span>
      </span>
      {statusText && <figcaption className="trace-capsule-vault__caption">{statusText}</figcaption>}
    </figure>
  );
}
