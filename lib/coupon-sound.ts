// Son du coupon qu'on détache : un papier perforé qui se déchire, puis le « tchac » du tampon.
// Le son est synthétisé dans le navigateur avec la Web Audio API : aucun fichier audio,
// donc aucune licence à créditer (création originale Koupi). Il ne joue qu'après un clic
// (règle d'autoplay des navigateurs) et le visiteur peut le couper (préférence gardée en local).

const STORAGE_KEY = 'koupi-sound';
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function isSoundEnabled(): boolean {
  try { return window.localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

export function setSoundEnabled(enabled: boolean): void {
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* stockage indisponible : on garde le réglage par défaut */ }
  window.dispatchEvent(new CustomEvent('koupi-sound-change', { detail: enabled }));
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = Math.floor(ctx.sampleRate * 0.6);
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

// Un grain : une micro-rafale de bruit filtré, comme une fibre de papier qui cède.
function grain(ctx: AudioContext, out: AudioNode, at: number, duration: number, frequency: number, level: number, q = 1.2) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + Math.min(0.004, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(gain).connect(out);
  source.start(at, Math.random() * 0.4, duration + 0.02);
}

/** Prépare le son pendant un geste de l'utilisateur (clic, Entrée), pour pouvoir le jouer un peu plus tard. */
export function primeSound(): void {
  if (isSoundEnabled()) audio();
}

/** Déchirure d'un talon perforé (~0,32 s) suivie du coup de tampon (sans tampon : { stamp: false }). */
export function playCouponTear({ stamp = true }: { stamp?: boolean } = {}): void {
  if (!isSoundEnabled()) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // 1. La déchirure : des grains de plus en plus serrés, perforation après perforation.
  const tearLength = 0.3;
  let t = 0;
  while (t < tearLength) {
    const progress = t / tearLength;
    grain(ctx, master, now + t, 0.006 + Math.random() * 0.014, 1800 + Math.random() * 3600, 0.25 + progress * 0.45);
    t += 0.004 + Math.random() * (0.022 - progress * 0.014);
  }
  // Le « corps » grave du papier qui se plie.
  grain(ctx, master, now, tearLength, 650, 0.18, 0.7);
  // 2. Le dernier point de perforation qui lâche.
  grain(ctx, master, now + tearLength, 0.04, 2600, 0.9, 0.9);

  if (!stamp) return;
  // 3. Le tampon « COPIÉ » : un coup sourd et un petit claquement.
  const stampAt = now + tearLength + 0.11;
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(150, stampAt);
  thump.frequency.exponentialRampToValueAtTime(55, stampAt + 0.12);
  thumpGain.gain.setValueAtTime(0.0001, stampAt);
  thumpGain.gain.exponentialRampToValueAtTime(0.8, stampAt + 0.005);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, stampAt + 0.16);
  thump.connect(thumpGain).connect(master);
  thump.start(stampAt);
  thump.stop(stampAt + 0.2);
  grain(ctx, master, stampAt, 0.03, 3200, 0.5, 2);
}

/** Petit son pour les copies rapides (liste de codes) : une déchirure courte. */
export function playCouponSnip(): void {
  if (!isSoundEnabled()) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  let t = 0;
  while (t < 0.14) {
    grain(ctx, master, now + t, 0.006 + Math.random() * 0.01, 2200 + Math.random() * 3000, 0.3 + (t / 0.14) * 0.4);
    t += 0.005 + Math.random() * 0.012;
  }
  grain(ctx, master, now + 0.14, 0.035, 2600, 0.8, 0.9);
}
