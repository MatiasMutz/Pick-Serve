// Subtle background texture — no tennis balls, just a clean dark gradient
export default function TennisBg() {
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 20% 0%, rgba(249,115,22,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(249,115,22,0.03) 0%, transparent 50%)',
    }} />
  );
}
