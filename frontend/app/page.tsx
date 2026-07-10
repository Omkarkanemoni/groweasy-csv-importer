"use client";

import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import styles from "./page.module.css";
import FileDropzone from "./components/FileDropzone";
import DataTable from "./components/DataTable";
import StepRail, { Step } from "./components/StepRail";
import { CRM_FIELD_LABELS, CrmRecord, ImportResponse, RawRow } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const CRM_COLUMNS = Object.keys(CRM_FIELD_LABELS) as (keyof CrmRecord)[];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const handleFileSelected = useCallback((selected: File) => {
    setUploadError(null);
    setResult(null);
    setImportError(null);

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only .csv files are supported. Please export your data as CSV and try again.");
      return;
    }

    Papa.parse<RawRow>(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data || res.data.length === 0) {
          setUploadError("This CSV doesn't have any data rows to preview.");
          return;
        }
        setFile(selected);
        setRawRows(res.data);
        setRawColumns(res.meta.fields ?? Object.keys(res.data[0]));
        setStep("preview");
      },
      error: (err) => {
        setUploadError(`Couldn't parse this CSV: ${err.message}`);
      },
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setStep("processing");
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/import`, {
        method: "POST",
        body: formData,
      });

      const data: ImportResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Import failed on the server.");
      }

      setResult(data);
      setStep("results");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong while importing.");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setRawRows([]);
    setRawColumns([]);
    setResult(null);
    setUploadError(null);
    setImportError(null);
    setStep("upload");
  }, []);

  const previewRowsCapped = useMemo(() => rawRows.slice(0, 500), [rawRows]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>GrowEasy · Lead Import</p>
          <h1 className={styles.title}>Any CSV in, clean leads out.</h1>
          <p className={styles.subtitle}>
            Drop a lead export from Facebook, Google Ads, or your CRM of choice. The mapper reads whatever
            columns you actually have and turns them into GrowEasy&apos;s standard record — no manual
            column matching required.
          </p>
          <StepRail current={step} />
        </header>

        {step === "upload" && (
          <section className={styles.card}>
            <FileDropzone onFileSelected={handleFileSelected} error={uploadError} />
          </section>
        )}

        {step === "preview" && (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Raw preview</h2>
            <p className={styles.sectionMeta}>
              {file?.name} · {rawRows.length} row{rawRows.length === 1 ? "" : "s"} detected
              {rawRows.length > 500 ? " (showing first 500)" : ""}
            </p>

            {importError && <div className={styles.errorBanner}>{importError}</div>}

            <DataTable columns={rawColumns} rows={previewRowsCapped} />

            <div className={styles.actionsRow}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReset}>
                Choose a different file
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleConfirm}>
                Confirm &amp; map with AI →
              </button>
            </div>
          </section>
        )}

        {step === "processing" && (
          <section className={styles.card}>
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>
                Mapping {rawRows.length} row{rawRows.length === 1 ? "" : "s"} into the CRM schema…
              </p>
            </div>
          </section>
        )}

        {step === "results" && result && (
          <section>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{result.totalInput}</div>
                <div className={styles.statLabel}>Rows read</div>
              </div>
              <div className={`${styles.statCard} ${styles.statImported}`}>
                <div className={styles.statValue}>{result.totalImported}</div>
                <div className={styles.statLabel}>Imported</div>
              </div>
              <div className={`${styles.statCard} ${styles.statSkipped}`}>
                <div className={styles.statValue}>{result.totalSkipped}</div>
                <div className={styles.statLabel}>Skipped</div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Mapped CRM records</h2>
              <p className={styles.sectionMeta}>Ready to import into GrowEasy</p>

              <DataTable columns={CRM_COLUMNS} columnLabels={CRM_FIELD_LABELS} rows={result.records} />

              {result.skipped.length > 0 && (
                <div className={styles.skippedList}>
                  {result.skipped.map((s) => (
                    <div key={s.index} className={styles.skippedRow}>
                      <span className={styles.skippedIndex}>row {s.index + 1}</span>
                      <span>{s.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.actionsRow}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReset}>
                  Import another file
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className={styles.footer}>groweasy-csv-importer</footer>
      </div>
    </main>
  );
}
