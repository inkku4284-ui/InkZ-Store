"use client";

import { useState } from "react";
import { SystemDiagram } from "./system-diagram";

const stages = [
  { id:"intent", label:"Intent", copy:"You press M1, F, R or Q. Your client plays the move at once (prediction) and sends the action to the server." },
  { id:"rules", label:"Rules", copy:"The server checks it (stun, cooldowns, equip) and runs the hitbox between the animation's HitStart and HitStop: block, parry, trade, perfect dodge or hit." },
  { id:"state", label:"State", copy:"Health, posture, stun and air-combo state change on the server only; every client gets the result and animates it, with hit-stop, VFX and sound." },
] as const;

export function ConceptDiagram() {
  const [active, setActive] = useState(0);
  return <div className="concept-diagram" data-stage={stages[active].id}>
    <div className="concept-heading mono"><span>CF—001 / One exchange</span><span>Server-authoritative</span></div>
    <SystemDiagram/>
    <div className="concept-explorer"><p className="mono">Step through a hit</p><div className="concept-controls" role="group" aria-label="Stages of a hit">{stages.map((stage,index) => <button key={stage.id} type="button" aria-pressed={active === index} aria-controls="concept-description" onClick={() => setActive(index)}><span className="mono">0{index+1}</span>{stage.label}</button>)}</div><p id="concept-description" className="concept-description" aria-live="polite">{stages[active].copy}</p></div>
  </div>;
}
