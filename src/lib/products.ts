export type ProductMediaAsset = {
  src: string;
  poster?: string;
  caption: string;
  captionsSrc: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  platform: string;
  language: string;
  version: string;
  availability: string;
  /** Display price. The server only sells at the amount in src/lib/store/config.ts (COMBAT_SALE). */
  price: string;
  delivery: string;
  description: string;
  media: ProductMediaAsset | null;
};

export const combat: Product = {
  id: "001",
  slug: "combat-framework",
  name: "Combat Framework",
  category: "Combat System",
  platform: "Roblox Studio · R6",
  language: "Luau",
  version: "1.0",
  availability: "Launching soon",
  price: "349 THB",
  delivery: "Instant .rbxm download right after payment, on your order page.",
  description: "A server-authoritative R6 fist combat framework: M1 strings, parries and parry trades, air combos, posture and guard breaks, ragdolls, a full UI and two AI sparring NPCs. Installs with one line.",
  media: null,
};

export const features = [
  ["Combat", "4-hit M1 strings with true stun, criticals that break guards, uppercut launchers into air combos with a slam finisher, aerial and running attacks, feints."],
  ["Defence", "Block with a parry window, parry out of a combo, cancel a wind-up into a parry, and parry trades: both players trading parries until one misses."],
  ["Feel", "Hit-stop, camera shake, hit VFX and SFX, fist trails, danger telegraph on criticals, rolls with perfect dodge, smooth ragdolls that get back up cleanly."],
  ["Server authority", "The server decides every hit, block, parry and posture change; clients predict their own moves for instant feel. Hitboxes follow the animations' HitStart / HitStop events."],
  ["UI", "Health, posture, weapon slot and cooldown bars, overhead bars and NPC speech bubbles: real instances in StarterGui you restyle in the Properties window."],
  ["NPCs", "Vesper, a sparring AI that plays by the same rules (reads habits, parries, trades, combos, trash-talks), and ParryTrade, a practice partner for defence tech."],
] as const;

export const included = [
  "INKZ_CombatFramework.rbxm with a one-line installer and a setup checker",
  "Full source (Luau), every value in a commented Config",
  "24 animations as KeyframeSequences + the R6 rig, ready to upload as yours",
  "VFX, sounds, pixel-art UI, Vesper and ParryTrade NPCs, training dummies",
  "Step-by-step guide in English and Thai (README_EN / README_TH)",
] as const;

export const requirements = [
  ["Engine", "Roblox Studio (current version)"],
  ["Avatar", "R6 (shipped: players are R6 automatically and keep their own avatar look)"],
  ["Input", "Keyboard + mouse, controller, mobile buttons"],
  ["Animations", "Upload the included animations once under your account / group (guide step 4)"],
  ["Not supported", "R15 rigs"],
] as const;

export const products: readonly Product[] = [combat];
