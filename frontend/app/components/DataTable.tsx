"use client";

import styles from "./DataTable.module.css";

type Props = {
  columns: string[];
  columnLabels?: Record<string, string>;
  rows: Record<string, string>[];
  renderCell?: (col: string, value: string, row: Record<string, string>) => React.ReactNode;
};

/**
 * A plain, dependency-free scrollable table. For the assignment's realistic
 * CSV sizes (hundreds to a few thousand rows) a native table with sticky
 * headers and max-height scroll performs fine; if you need to support
 * very large files, swap the <tbody> map below for react-window/
 * react-virtual without changing the component's props.
 */
export default function DataTable({ columns, columnLabels, rows }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rowIndex}>#</th>
              {columns.map((col) => (
                <th key={col}>{columnLabels?.[col] ?? col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className={styles.rowIndex}>{i + 1}</td>
                {columns.map((col) => (
                  <td key={col} title={row[col] ?? ""}>
                    {renderStatusAwareCell(col, row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderStatusAwareCell(col: string, value: string) {
  if (col === "crm_status") {
    if (!value) return <span className={styles.statusEmpty}>—</span>;
    const cls =
      value === "GOOD_LEAD_FOLLOW_UP" || value === "SALE_DONE"
        ? styles.statusGood
        : value === "BAD_LEAD"
        ? styles.statusBad
        : styles.statusNeutral;
    return <span className={`${styles.statusPill} ${cls}`}>{value.replaceAll("_", " ")}</span>;
  }
  return value || <span className={styles.statusEmpty}>—</span>;
}
