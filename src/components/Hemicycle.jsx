import { FACTION_DATA } from "../data/factions.js";

export default function Hemicycle({ factions, label }) {
  const left = factions.filter(f => f.party === "DEM").sort((a, b) =>
    FACTION_DATA.DEM.findIndex(x => x.id === a.id) - FACTION_DATA.DEM.findIndex(x => x.id === b.id)
  );
  const right = factions.filter(f => f.party === "REP").sort((a, b) =>
    FACTION_DATA.REP.findIndex(x => x.id === a.id) - FACTION_DATA.REP.findIndex(x => x.id === b.id)
  );
  const ordered = [...left, ...right];
  const seatKey = label === "Senate" ? "senateSeats" : "houseSeats";

  const totalSeats = ordered.reduce((s, f) => s + f[seatKey], 0);

  const isSenate = label === "Senate";
  const rows = isSenate ? 5 : 12;
  const cx = 200, cy = isSenate ? 165 : 175;
  const minR = isSenate ? 50 : 28;
  const maxR = isSenate ? 130 : 168;
  const rowGap = (maxR - minR) / (rows - 1);
  const dotR = isSenate ? 5.5 : 2.3;
  const dotGap = isSenate ? 2 : 0.6;

  const dots = [];
  let angleOffset = 0;

  ordered.forEach(f => {
    const fAngle = (f[seatKey] / totalSeats) * Math.PI;
    let seatsPlaced = 0;
    const targetSeats = f[seatKey];

    const rowSeats = [];
    let totalFits = 0;
    for (let r = 0; r < rows; r++) {
      const radius = minR + r * rowGap;
      const arcLen = fAngle * radius;
      const fits = Math.max(1, Math.floor(arcLen / (dotR * 2 + dotGap)));
      rowSeats.push(fits);
      totalFits += fits;
    }

    const scale = targetSeats / totalFits;
    const actualRowSeats = rowSeats.map(c => Math.round(c * scale));

    let diff2 = targetSeats - actualRowSeats.reduce((s, c) => s + c, 0);
    let safety = rows * 4;
    for (let r = rows - 1; diff2 !== 0 && safety-- > 0; r = (r - 1 + rows) % rows) {
      if (diff2 > 0) { actualRowSeats[r]++; diff2--; }
      else if (diff2 < 0 && actualRowSeats[r] > 0) { actualRowSeats[r]--; diff2++; }
    }

    for (let r = 0; r < rows; r++) {
      const radius = minR + r * rowGap;
      const count = actualRowSeats[r];
      if (count <= 0) continue;
      const startAngle = Math.PI - angleOffset;
      const endAngle = Math.PI - (angleOffset + fAngle);
      for (let s = 0; s < count && seatsPlaced < targetSeats; s++) {
        const t = count === 1 ? 0.5 : s / (count - 1);
        const angle = startAngle + (endAngle - startAngle) * t;
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);
        dots.push(<circle key={`${f.id}-${r}-${s}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={dotR} fill={f.color} />);
        seatsPlaced++;
      }
    }
    angleOffset += fAngle;
  });

  const svgH = cy + 12;
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox={`0 0 400 ${svgH}`} style={{ width: "100%", maxWidth: isSenate ? 240 : 360 }}>
        {dots}
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 12, fill: "var(--color-text-primary)", fontWeight: 500 }}>{label}</text>
      </svg>
    </div>
  );
}
