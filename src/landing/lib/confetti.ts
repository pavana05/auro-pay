import confetti from "canvas-confetti";

export function fireGoldConfetti() {
  const defaults = {
    spread: 70,
    ticks: 90,
    gravity: 0.9,
    decay: 0.94,
    startVelocity: 35,
    colors: ["#c8952e", "#e6b347", "#ffd97a", "#fff4d6", "#8c6620"],
  };
  confetti({ ...defaults, particleCount: 60, origin: { y: 0.7, x: 0.5 } });
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 40,
        angle: 60,
        origin: { x: 0, y: 0.8 },
      }),
    180,
  );
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 40,
        angle: 120,
        origin: { x: 1, y: 0.8 },
      }),
    180,
  );
}
