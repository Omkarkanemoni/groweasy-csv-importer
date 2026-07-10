"use client";

import styles from "./StepRail.module.css";

export type Step = "upload" | "preview" | "processing" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "Confirm" },
  { key: "results", label: "Results" },
];

export default function StepRail({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className={styles.rail}>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <li key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <span className={`${styles.step} ${isActive ? styles.active : ""} ${isDone ? styles.done : ""}`}>
              <span className={styles.num}>{isDone ? "\u2713" : idx + 1}</span>
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <span className={`${styles.connector} ${isDone ? styles.connectorDone : ""}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
