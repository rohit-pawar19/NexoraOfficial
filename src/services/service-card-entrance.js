import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const directions = new Map([
  ['Branding & Creative', [-1, 0]],
  ['Photography & Videography', [0, -1]],
  ['Real Estate & Builder Marketing', [1, 0]],
  ['Jewellery Brand Marketing', [0, 1]],
  ['Printing & Production', [-1, -1]],
  ['Digital Marketing', [1, -1]],
  ['Website Services', [-1, 1]],
  ['Event & Launch Marketing', [1, 1]],
]);

function getVisualRows(cards) {
  const rows = [];
  for (const card of cards) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].shell.offsetTop - card.shell.offsetTop) < 2) row.push(card);
    else rows.push([card]);
  }
  return rows;
}

export function initServiceCardEntrance(layers) {
  const cards = [...layers].map(([card, { shell }]) => ({
    card, shell, direction: directions.get(card.dataset.service),
  }));
  const grid = cards[0]?.shell.parentElement;
  const section = grid?.closest('#services');
  if (!section || cards.some(({ direction }) => !direction)) return () => {};

  const media = gsap.matchMedia();
  const played = new Set();
  section.classList.add('service-assembly');

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const active = new Set();
    const waiting = new Map();
    let layout = '';
    let frame = 0;
    const rowSignature = rows => rows.map(row => row.length).join(',');

    function clear({ shell }) {
      shell.classList.remove('is-service-entering');
      gsap.set(shell, { clearProps: 'transform,opacity' });
      shell.style.removeProperty('--service-flight-shadow');
    }

    function settle(row) {
      row.trigger?.kill();
      row.timeline?.kill();
      active.delete(row);
      for (const card of row.cards) {
        waiting.delete(card.card);
        played.add(card);
        clear(card);
      }
    }

    function animate(row) {
      row.trigger.kill();
      active.add(row);
      const width = document.documentElement.clientWidth;
      const compact = width < 768;
      const travel = compact ? 32 : 78;
      const tilt = compact ? .45 : 1;
      const gridLeft = grid.getBoundingClientRect().left;
      row.timeline = gsap.timeline({ onComplete: () => settle(row) });

      row.cards.forEach((card, index) => {
        waiting.delete(card.card);
        played.add(card);
        const { shell, direction: [horizontal, vertical] } = card;
        const left = gridLeft + shell.offsetLeft;
        const room = horizontal < 0 ? left : width - left - shell.offsetWidth;
        const x = horizontal * Math.min(travel, Math.max(0, room - 6));
        const y = vertical * (compact ? 30 : 62);
        const launch = index * .1;
        shell.classList.add('is-service-entering');
        row.timeline.fromTo(shell, {
          x, y, z: compact ? -38 : -82, scale: compact ? .96 : .91,
          rotationX: (vertical * 9 + horizontal * 2) * tilt,
          rotationY: (-horizontal * 12 + vertical * 2) * tilt,
          transformPerspective: 1100, opacity: 0, '--service-flight-shadow': .65,
        }, {
          x: x * .08, y: y * .08, z: -8, scale: .99,
          rotationX: vertical * tilt, rotationY: -horizontal * 1.5 * tilt,
          opacity: 1, '--service-flight-shadow': .2, duration: 1.12, ease: 'power3.out',
        }, launch);
        row.timeline.to(shell, {
          x: 0, y: 0, z: 0, scale: 1, rotationX: 0, rotationY: 0,
          '--service-flight-shadow': 0, duration: .23, ease: 'sine.out',
          clearProps: 'transform,opacity',
        }, launch + 1.12);
      });
    }

    function register(visualRow) {
      const pending = visualRow.filter(card => !played.has(card));
      if (!pending.length) return;
      const anchor = visualRow[0].shell;
      const row = { cards: pending };
      // The trigger uses layout coordinates so the flight transform cannot move the threshold.
      const top = () => grid.getBoundingClientRect().top + window.scrollY + anchor.offsetTop;
      try {
        row.trigger = ScrollTrigger.create({
          trigger: anchor,
          start: () => top() - window.innerHeight * .8,
          end: () => top() + anchor.offsetHeight,
          invalidateOnRefresh: true,
          onEnter(self) {
            if (!row.trigger || ScrollTrigger.isRefreshing || rowSignature(getVisualRows(cards)) !== layout) return;
            try {
              if (self.progress === 1) settle(row);
              else animate(row);
            } catch (error) {
              settle(row);
              console.warn('Services row entrance skipped.', error);
            }
          },
          onRefresh(self) {
            if (row.trigger && self.scroll() >= self.start
              && rowSignature(getVisualRows(cards)) === layout) settle(row);
          },
        });
        if (row.trigger.scroll() >= row.trigger.start
          || pending.some(({ shell }) => shell.contains(document.activeElement))) {
          settle(row);
          return;
        }
        for (const card of pending) {
          waiting.set(card.card, row);
          gsap.set(card.shell, { opacity: 0 });
        }
      } catch (error) {
        settle(row);
        console.warn('Services row entrance skipped.', error);
      }
    }

    function rebuild() {
      frame = 0;
      const rows = getVisualRows(cards);
      const signature = rowSignature(rows);
      if (signature !== layout) {
        layout = signature;
        for (const row of active) settle(row);
        for (const row of new Set(waiting.values())) row.trigger?.kill();
        waiting.clear();
        rows.forEach(register);
      } else {
        for (const row of new Set(waiting.values())) row.trigger?.refresh();
      }
    }

    function resize() {
      if (!frame) frame = requestAnimationFrame(rebuild);
    }

    function showForFocus(event) {
      if (!event.target.matches(':focus-visible')) return;
      const card = event.target.closest('.service-card');
      const row = waiting.get(card) ?? [...active].find(row => row.cards.some(item => item.card === card));
      if (row) settle(row);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(grid);
    cards.forEach(({ shell }) => observer.observe(shell));
    grid.addEventListener('focusin', showForFocus);
    rebuild();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      grid.removeEventListener('focusin', showForFocus);
      for (const row of new Set(waiting.values())) row.trigger?.kill();
      for (const row of active) settle(row);
      cards.forEach(clear);
    };
  });

  return () => {
    media.revert();
    section.classList.remove('service-assembly');
  };
}
