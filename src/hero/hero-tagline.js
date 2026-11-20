// The sculpture owns this timeline, including visibility pauses and cleanup.
export function addTaglineEntrance(sequence, host, duration) {
  const reveal = host.querySelector('.hero-tagline-reveal');
  if (!reveal) return;
  sequence.fromTo(reveal, {
    clipPath: 'inset(0 100% 0 0)', opacity: 0,
  }, {
    clipPath: 'inset(0 0% 0 0)', opacity: 1,
    duration, ease: 'power2.inOut',
  }, 0);
}
