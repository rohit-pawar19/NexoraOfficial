import { gsap } from 'gsap';

export const SERVICE_TIMING = Object.freeze({ revealStart: .2, revealEnd: .8, assemblyEnd: 2.5, exit: .55 });

export function createServiceEntrance(card, state, onComplete) {
  const sequence = gsap.timeline({ paused: true, onComplete });
  // Card elevation is owned by its interaction wrapper, independently of the
  // unchanged 3D-object reveal and assembly timing below.
  sequence.fromTo(state.visual, { autoAlpha: 0, scale: .96 }, {
    autoAlpha: 1, scale: 1, duration: .6, ease: 'power2.inOut',
  }, SERVICE_TIMING.revealStart);
  sequence.to(state.motion, { hover: 1, reveal: 1, duration: .6, ease: 'power2.inOut' }, SERVICE_TIMING.revealStart);
  sequence.to(state.motion, { assembly: 1, duration: 1.7, ease: 'power3.inOut' }, SERVICE_TIMING.revealEnd);
  sequence.fromTo(state.visual, { '--mini-sweep': '-30%', '--mini-sweep-opacity': 0 }, {
    '--mini-sweep': '130%', '--mini-sweep-opacity': .06, duration: 1.25, ease: 'sine.inOut',
  }, 1.05);
  sequence.to(state.visual, { '--mini-sweep-opacity': 0, duration: .2 }, 2.3);
  return sequence;
}
