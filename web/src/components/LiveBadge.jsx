// Small pulsing dot that tells users the page updates by itself
export default function LiveBadge() {
  return (
    <span className="live-badge" title="This page updates automatically every few seconds">
      <i /> Live
    </span>
  );
}
