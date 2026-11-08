/** Starts a cosmetic sparkle loop for one mounted title crystal. */
export function startCrystalSparks(layer: HTMLElement): () => void {
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
 let timer: number | undefined;
 let side = Math.random() < .5 ? -1 : 1;

 function spawn() {
  if (!layer.isConnected || reducedMotion.matches) return;

  const spark = document.createElement('i');
  spark.style.setProperty('--spark-x', `${side * randomBetween(40, 72)}px`);
  spark.style.setProperty('--spark-y', `${randomBetween(20, 160)}px`);
  spark.style.setProperty('--spark-size', `${randomBetween(7, 13)}px`);
  spark.style.setProperty('--spark-brightness', String(randomBetween(.65, 1)));
  spark.style.setProperty('--spark-duration', `${randomBetween(850, 1250)}ms`);
  spark.addEventListener('animationend', () => spark.remove(), { once: true });
  layer.append(spark);
  side *= -1;
  timer = window.setTimeout(spawn, randomBetween(650, 1550));
 }

 function syncMotion() {
  window.clearTimeout(timer);
  layer.replaceChildren();
  if (!reducedMotion.matches) timer = window.setTimeout(spawn, randomBetween(150, 450));
 }

 reducedMotion.addEventListener('change', syncMotion);
 syncMotion();
 return () => {
  window.clearTimeout(timer);
  reducedMotion.removeEventListener('change', syncMotion);
  layer.replaceChildren();
 };
}
