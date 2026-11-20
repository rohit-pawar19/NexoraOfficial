export function useConstrainedGraphics() {
  return matchMedia('(max-width: 767px), (pointer: coarse)').matches
    || navigator.connection?.saveData === true
    || (navigator.deviceMemory ?? Infinity) <= 4
    || (navigator.hardwareConcurrency ?? Infinity) <= 4;
}
