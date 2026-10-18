import type { Visual } from "../lib/generators/types";

export function VisualView({ visual }: { visual?: Visual }) {
  if (!visual) return null;
  if (visual.type === "count") {
    return (
      <div className="viz-count" aria-hidden="true">
        {Array.from({ length: visual.count }, (_, i) => (
          <span key={i}>{visual.emoji}</span>
        ))}
      </div>
    );
  }
  if (visual.type === "groups") {
    return (
      <div className="viz-groups">
        {visual.groups.map((group) => (
          <div key={group.label ?? group.emoji} className="viz-group">
            <div className="viz-count">
              {Array.from({ length: group.count }, (_, i) => (
                <span key={i}>{group.emoji}</span>
              ))}
            </div>
            {group.label ? <p>{group.label}</p> : null}
          </div>
        ))}
      </div>
    );
  }
  if (visual.type === "clock") return <Clock hour={visual.hour} minute={visual.minute} />;
  if (visual.type === "shape") return <Shape name={visual.name} />;
  if (visual.type === "fraction") return <Fraction parts={visual.parts} filled={visual.filled} />;
  if (visual.type === "coins") {
    return (
      <div className="viz-coins" aria-hidden="true">
        {visual.values.map((value, index) => (
          <span key={`${value}-${index}`} className="coin">
            {value}
          </span>
        ))}
      </div>
    );
  }
  if (visual.type === "place") {
    return (
      <div className="viz-place" aria-hidden="true">
        {Array.from({ length: visual.hundreds }, (_, i) => (
          <span key={`h${i}`} className="flat hundred">
            100
          </span>
        ))}
        {Array.from({ length: visual.tens }, (_, i) => (
          <span key={`t${i}`} className="rod">
            10
          </span>
        ))}
        {Array.from({ length: visual.ones }, (_, i) => (
          <span key={`o${i}`} className="cube" />
        ))}
      </div>
    );
  }
  if (visual.type === "bars") {
    const max = Math.max(...visual.bars.map((bar) => bar.value), 1);
    return (
      <div className="viz-bars" aria-hidden="true">
        {visual.bars.map((bar) => (
          <div key={bar.label} className="bar-col">
            <div className="bar" style={{ height: `${(bar.value / max) * 120}px` }} />
            <span>{bar.label}</span>
          </div>
        ))}
      </div>
    );
  }
  return <p className="viz-equation">{visual.text}</p>;
}

function Clock({ hour, minute }: { hour: number; minute: number }) {
  const minuteAngle = minute * 6;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  return (
    <svg className="viz-clock" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="#fffaf4" stroke="#3b2418" strokeWidth="4" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line
          key={angle}
          x1="60"
          y1="14"
          x2="60"
          y2="22"
          stroke="#3b2418"
          strokeWidth="3"
          transform={`rotate(${angle} 60 60)`}
        />
      ))}
      <line x1="60" y1="60" x2="60" y2="28" stroke="#1f8a70" strokeWidth="4" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} />
      <line x1="60" y1="64" x2="60" y2="38" stroke="#ef5d3c" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} />
      <circle cx="60" cy="60" r="4" fill="#3b2418" />
    </svg>
  );
}

function Shape({ name }: { name: string }) {
  const common = { fill: "#f0b429", stroke: "#3b2418", strokeWidth: 4 };
  return (
    <svg className="viz-shape" viewBox="0 0 140 120" aria-hidden="true">
      {name === "circle" ? <circle cx="70" cy="60" r="40" {...common} /> : null}
      {name === "triangle" ? <polygon points="70,16 112,100 28,100" {...common} /> : null}
      {name === "square" ? <rect x="32" y="22" width="76" height="76" rx="6" {...common} /> : null}
      {name === "rectangle" ? <rect x="18" y="34" width="104" height="56" rx="6" {...common} /> : null}
      {name === "pentagon" ? <polygon points="70,12 114,48 98,104 42,104 26,48" {...common} /> : null}
      {name === "hexagon" ? <polygon points="70,12 110,36 110,84 70,108 30,84 30,36" {...common} /> : null}
    </svg>
  );
}

function Fraction({ parts, filled }: { parts: number; filled: number }) {
  const slices = Array.from({ length: parts }, (_, index) => {
    const start = (index / parts) * Math.PI * 2 - Math.PI / 2;
    const end = ((index + 1) / parts) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = 70 + Math.cos(start) * 46;
    const y1 = 60 + Math.sin(start) * 46;
    const x2 = 70 + Math.cos(end) * 46;
    const y2 = 60 + Math.sin(end) * 46;
    return `M70 60 L${x1} ${y1} A46 46 0 ${large} 1 ${x2} ${y2} Z`;
  });
  return (
    <svg className="viz-shape" viewBox="0 0 140 120" aria-hidden="true">
      {slices.map((d, index) => (
        <path key={d} d={d} fill={index < filled ? "#ef5d3c" : "#fff"} stroke="#3b2418" strokeWidth="3" />
      ))}
    </svg>
  );
}
