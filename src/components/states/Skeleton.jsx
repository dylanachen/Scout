export default function Skeleton({ height = 14, width = '100%', style }) {
  return (
    <div
      className="scout-skeleton"
      aria-hidden
      style={{
        height,
        width,
        borderRadius: 8,
        ...style,
      }}
    />
  );
}
