"use client";

import { useState } from "react";
import { SystemDiagram } from "./system-diagram";

const stages = [
  { id:"intent", label:"Intent", copy:"The action a builder wants to express. This is a conceptual input, not a documented API or a verified product module." },
  { id:"rules", label:"Rules", copy:"The decisions that determine an outcome. The product’s actual validation logic and authority boundaries still require source review." },
  { id:"state", label:"State", copy:"The resulting condition of an interaction. Actual state ownership, synchronization, and replication are not yet verified." },
] as const;

export function ConceptDiagram() {
  const [active, setActive] = useState(0);
  return <div className="concept-diagram" data-stage={stages[active].id}>
    <div className="concept-heading mono"><span>CF—001 / Interaction study</span><span>Conceptual</span></div>
    <SystemDiagram/>
    <div className="concept-explorer"><p className="mono">Explore the idea / not a product demonstration</p><div className="concept-controls" role="group" aria-label="Conceptual interaction stages">{stages.map((stage,index) => <button key={stage.id} type="button" aria-pressed={active === index} aria-controls="concept-description" onClick={() => setActive(index)}><span className="mono">0{index+1}</span>{stage.label}</button>)}</div><p id="concept-description" className="concept-description" aria-live="polite">{stages[active].copy}</p></div>
  </div>;
}
