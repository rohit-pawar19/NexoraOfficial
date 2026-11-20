// A small deadband at the midpoint prevents scroll jitter from restarting scenes.
export function selectProcessStage(progress, current = -1) {
  const position = Math.max(0, Math.min(1, progress)) * 7;
  if (current < 0) return Math.min(7, Math.floor(position + .5));
  let stage = current;
  while (stage < 7 && position > stage + .58) stage++;
  while (stage > 0 && position < stage - .58) stage--;
  return stage;
}
