import { ReactNode, useRef, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";

export interface VirtualColumn<T> {
  key: string;
  header: string;
  width?: string;        // e.g. "120px" or "1fr"
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  rows: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  /** Container height. Defaults to 560. */
  height?: number;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void;
  empty?: ReactNode;
}

/**
 * High-performance virtualized table for 1000+ rows.
 * Only the visible window is rendered.
 */
export function VirtualTable<T>({
  rows, columns, rowHeight = 52, height = 560, rowKey, onRowClick, onRowContextMenu, empty,
}: Props<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const gridTemplate = columns.map(c => c.width || "1fr").join(" ");

  return (
    <div ref={wrapRef} className="rounded-[16px] overflow-hidden"
      style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.12)" }}>
      {/* Header */}
      <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-3"
        style={{
          gridTemplateColumns: gridTemplate,
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(200,149,46,0.12)",
          color: "rgba(255,255,255,0.3)",
        }}>
        {columns.map(c => (
          <div key={c.key} style={{ textAlign: c.align || "left" }}>{c.header}</div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-white/55">
          {empty || "No data"}
        </div>
      ) : width > 0 ? (
        <List
          height={Math.min(height, rows.length * rowHeight + 4)}
          itemCount={rows.length}
          itemSize={rowHeight}
          width={width}
        >
          {({ index, style }) => {
            const row = rows[index];
            return (
              <div
                key={rowKey(row)}
                style={{ ...style, gridTemplateColumns: gridTemplate }}
                className="grid items-center px-4 text-xs cursor-pointer transition-colors hover:bg-white/[0.02]"
                onClick={() => onRowClick?.(row)}
                onContextMenu={e => onRowContextMenu?.(row, e)}
              >
                {columns.map(c => (
                  <div key={c.key} style={{ textAlign: c.align || "left" }} className="truncate">
                    {c.render(row)}
                  </div>
                ))}
              </div>
            );
          }}
        </List>
      ) : (
        <div className="h-40" />
      )}

      {/* Footer count */}
      {rows.length > 0 && (
        <div className="px-4 py-2 text-[10px] text-white/40"
          style={{ borderTop: "1px solid rgba(200,149,46,0.08)" }}>
          {rows.length.toLocaleString("en-IN")} rows · virtualized rendering
        </div>
      )}
    </div>
  );
}

export default VirtualTable;
