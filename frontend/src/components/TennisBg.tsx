// Decorative tennis balls background – pure CSS, no images
const balls = [
  { size: 180, top: '5%', left: '-5%', opacity: 0.07 },
  { size: 90, top: '15%', right: '8%', opacity: 0.05 },
  { size: 260, top: '40%', right: '-10%', opacity: 0.04 },
  { size: 120, top: '65%', left: '10%', opacity: 0.06 },
  { size: 60, top: '80%', right: '20%', opacity: 0.08 },
  { size: 200, top: '85%', left: '-8%', opacity: 0.04 },
  { size: 50, top: '30%', left: '45%', opacity: 0.05 },
  { size: 140, top: '55%', left: '60%', opacity: 0.035 },
];

export default function TennisBg() {
  return (
    <div className="tennis-bg" aria-hidden>
      {balls.map((b, i) => (
        <div
          key={i}
          className="tennis-ball"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: (b as any).left,
            right: (b as any).right,
            opacity: b.opacity,
          }}
        />
      ))}
    </div>
  );
}
