import { useEffect, useRef, useState } from "react";

// Measures the container so the SVG is drawn at its real pixel width (text stays 11-12px)
function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Small single-series SVG charts for the dashboard (one maroon hue, no legend needed).
// Marks follow the chart spec: <=24px bars, 4px rounded data end, square baseline,
// 1px solid recessive gridlines, a hover tooltip on every mark, sparing direct labels.

// Rounded only at the data end: top for columns, right for horizontal bars
const columnPath = (x, y, w, h) => {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
};
const barPath = (x, y, w, h) => {
  const r = Math.min(4, w, h / 2);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
};

// Rounds the axis maximum up to a friendly number (1, 2, 5, 10, 20, ...)
const niceMax = (value) => {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * pow >= value / 1) * pow;
  return step;
};

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
      <strong>{tip.title}</strong>
      <span>{tip.value}</span>
    </div>
  );
}

// Columns over time, e.g. tickets reserved per day. data = [{ label, value, title }]
export function ColumnChart({ data, height = 220, valueLabel = "tickets" }) {
  const [tip, setTip] = useState(null);
  const [ref, width] = useWidth();
  const pad = { top: 20, right: 8, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot - 6);
  const ticks = [0, max / 2, max];
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${valueLabel} per day`}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="chart-grid" />
              <text x={pad.left - 8} y={y + 4} className="chart-axis" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          // Thin out date labels when columns are narrow; always label the latest day
          const every = slot < 44 ? 3 : slot < 70 ? 2 : 1;
          const showTick = (data.length - 1 - i) % every === 0;
          return (
            <g key={d.label}>
              {/* Full-height hit area, bigger than the mark */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() =>
                  setTip({
                    x: ((x + barW / 2) / width) * 100 + "%",
                    y: ((y - 6) / height) * 100 + "%",
                    title: d.title,
                    value: `${d.value} ${valueLabel}`,
                  })
                }
              />
              {h > 0 && <path d={columnPath(x, y, barW, h)} className="chart-mark" pointerEvents="none" />}
              {i === peak && d.value > 0 && (
                <text x={x + barW / 2} y={y - 6} className="chart-value" textAnchor="middle">
                  {d.value}
                </text>
              )}
              {showTick && (
                <text x={x + barW / 2} y={height - 8} className="chart-axis" textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

// Horizontal bars for a percentage per item. rows = [{ id, label, value (0-100), detail }]
export function PercentBars({ rows }) {
  const [tip, setTip] = useState(null);
  const [ref, width] = useWidth();
  const rowH = 38;
  const labelW = Math.min(170, Math.round(width * 0.36));
  const valueW = 52;
  const innerW = width - labelW - valueW;
  const height = rows.length * rowH + 22;
  const barH = 16;

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Percentage per event">
        {[0, 50, 100].map((t) => {
          const x = labelW + (t / 100) * innerW;
          return (
            <g key={t}>
              <line x1={x} x2={x} y1={0} y2={height - 22} className="chart-grid" />
              <text x={x} y={height - 6} className="chart-axis" textAnchor="middle">
                {t}%
              </text>
            </g>
          );
        })}

        {rows.map((r, i) => {
          const y = i * rowH + (rowH - barH) / 2;
          const w = (Math.min(100, r.value) / 100) * innerW;
          const maxChars = Math.floor(labelW / 7);
          const label = r.label.length > maxChars ? `${r.label.slice(0, maxChars - 1)}…` : r.label;
          return (
            <g key={r.id}>
              <rect
                x={0}
                y={i * rowH}
                width={width}
                height={rowH}
                fill="transparent"
                onMouseEnter={() =>
                  setTip({
                    x: ((labelW + w) / width) * 100 + "%",
                    y: ((y - 4) / height) * 100 + "%",
                    title: r.label,
                    value: r.detail,
                  })
                }
              />
              <text x={0} y={y + barH - 3} className="chart-label" pointerEvents="none">
                {label}
              </text>
              <rect x={labelW} y={y} width={innerW} height={barH} rx="4" className="chart-track" pointerEvents="none" />
              {w > 0 && <path d={barPath(labelW, y, w, barH)} className="chart-mark" pointerEvents="none" />}
              <text x={width} y={y + barH - 3} className="chart-value" textAnchor="end" pointerEvents="none">
                {Math.round(r.value)}%
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}
