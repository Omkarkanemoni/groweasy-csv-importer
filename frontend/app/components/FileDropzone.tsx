"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./FileDropzone.module.css";

type Props = {
  onFileSelected: (file: File) => void;
  error: string | null;
};

export default function FileDropzone({ onFileSelected, error }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        onFileSelected(file); // let parent validate + surface a proper error message
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={styles.title}>Drop a CSV, or click to browse</p>
        <p className={styles.hint}>Facebook Ads, Google Ads, Excel exports — any layout works.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className={styles.hiddenInput}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
