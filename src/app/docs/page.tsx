import Link from "next/link";
import { DocumentLayout, ArticleSection } from "@/components/document-layout";
import { SectionLabel, Notice } from "@/components/ui";
import { business } from "@/lib/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Install guide", "Install Combat Framework in Roblox Studio step by step: insert the .rbxm, run the one-line installer, test, upload the animations, publish. Plus configuration, UI, weapons and the scripting API.", "/docs");
const links = [["install","Install (3 steps)"],["animations","Upload animations"],["configure","Configure"],["ui","Edit the UI"],["weapons","Add a weapon"],["api","Scripting API"],["troubleshooting","Troubleshooting"]] as const;

const INSTALL = `require(workspace["INKZ_CombatFramework"].INSTALL)()`;
const CHECK = `require(game.ServerStorage.CombatFramework.CheckSetup)()`;
const ANIMATIONS = [
  ["WalkRework","Walk"],["RunRework","Run"],["RollRework","Roll"],["Fist Equip Upper","FistEquip"],["Fist Idle","FistIdle"],["Fist Walk","FistWalk"],["Fist Run","FistRun"],
  ["Swing1","Swing1"],["Swing2","Swing2"],["Swing3","Swing3"],["Swing4","Swing4"],["Crit","Crit"],["UpperCut","Uppercut"],["Aerial Attack","AerialAttack"],["Running Attack","RunningAttack"],
  ["Block","Block"],["BlockHit1","BlockHit1"],["BlockHit2","BlockHit2"],["Parry1","Parry1"],["Parry2","Parry2"],["Parryed","Parried"],["GuardBreak","GuardBreak"],["HitReaction1","HitReaction1"],["HitReaction2","HitReaction2"],
] as const;
const API = `local Core = require(game.ServerScriptService.CombatFramework.CombatCore)

Core.setEquipped(model, true)          -- raise the weapon
Core.attack(model)                     -- next M1 of the string
Core.critical(model)  Core.uppercut(model)  Core.aerial(model)  Core.running(model)
Core.feint(model)     Core.setBlocking(model, true)
Core.ragdoll(model, 1.5)               -- seconds, optional push Vector3

Core.Event:Connect(function(kind, data)
  -- kind: Swing, Hit, Blocked, Parry, Parried, GuardBreak, StunParry, PerfectDodge, Block, Equip
  -- data.character = who it happened to, data.attacker = who did it
end)`;

export default function Docs() {
  return <><header className="docs-top shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/products/combat-framework">Combat Framework</Link><span aria-hidden="true">/</span><span>Install guide</span></nav><SectionLabel number="DOC / 001">From download to live game</SectionLabel><h1>Combat Framework.<br/>The install guide.</h1><p>Three steps to play it in Studio, one more before real players join. The same guide ships inside the package (README_EN, and README_TH in Thai).</p></header>
  <DocumentLayout links={links} variant="guide">
    <Notice title="Before you start." marker="Read first"><p>You need Roblox Studio and a place: a new Baseplate, or your own game. Installing into an existing game? Save a backup first (File → Save to File As…). The framework is R6 only.</p></Notice>

    <ArticleSection id="install" title="Install in 3 steps.">
      <h3>1 · Put the file in Studio</h3>
      <ol><li>Open your place in Roblox Studio.</li><li>Drag <code>INKZ_CombatFramework.rbxm</code> into the Studio window (or right-click Workspace in the Explorer → Insert from File…).</li><li>A folder <code>INKZ_CombatFramework</code> appears in Workspace. That&apos;s expected: every script inside is switched off until you install.</li></ol>
      <h3>2 · Run the installer</h3>
      <ol><li>Top bar: View → <strong>Command Bar</strong> and View → <strong>Output</strong>.</li><li>Paste this line into the Command Bar and press Enter:</li></ol>
      <code className="code-block" tabIndex={0} aria-label="Installer command">{INSTALL}</code>
      <p>Every part moves to its service. Anything of yours with the same name (an old <code>Health</code> script, say) is moved to <code>ServerStorage._ReplacedByCombatFramework</code>, never deleted. Then a setup check prints what your place still needs: <strong>[ OK ]</strong> fine, <strong>[TODO]</strong> before real players join, <strong>[FIX!]</strong> broken.</p>
      <h3>3 · Press Play</h3>
      <p>Everything works in Studio now, animations included (until you upload your own, Studio plays the bundled rig&apos;s).</p>
      <p><strong>R6 is automatic.</strong> The package includes an R6 <code>StarterPlayer.StarterCharacter</code>, so players always spawn R6 whatever your Game Settings say, and the <code>PlayerAvatar</code> script dresses that body in each player&apos;s own avatar. Don&apos;t delete StarterCharacter: R15 breaks the animations and ragdoll.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Default controls"><table className="guide-table"><caption className="sr-only">Default controls</caption><thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead><tbody>
        {[["1","Raise / lower the fists"],["M1","4-hit string (the 4th knocks back)"],["Ctrl + M1","Uppercut → air combo; keep pressing M1 in the air, the last hit slams"],["M1 in the air","Aerial attack"],["M1 while running","Running attack (double-tap W and hold to run)"],["R","Critical: breaks a guard, ragdolls on a clean hit"],["M2","Feint"],["F","Block; the first moments parry. F in your wind-up = cancel into parry. F in a combo = parry out of the stun. F after being parried = parry trade"],["Q","Roll; early through a hit = perfect dodge"]].map(([key, action]) => <tr key={key}><td><code>{key}</code></td><td>{action}</td></tr>)}
      </tbody></table></div>
    </ArticleSection>

    <ArticleSection id="animations" title="Upload the animations (before real players join).">
      <p>Roblox only plays an animation in games owned by whoever uploaded it. In Studio everything plays; in your published game, animations you didn&apos;t upload don&apos;t play at all. You do this once, about 15 minutes.</p>
      <ol>
        <li>Publish the place: File → Publish to Roblox. Note who owns the game: you, or a group. Upload the animations as that same owner.</li>
        <li>Drag <code>ServerStorage → CombatFramework → AnimationRig</code> into Workspace (the Animation Editor only opens rigs in Workspace).</li>
        <li>For each of the 24 animations in <code>AnimationRig → AnimSaves</code>: Avatar tab → Animation Editor → click the rig → “…” → Load → pick it → “…” → Publish to Roblox → set the Creator to the game&apos;s owner → copy the id.</li>
        <li>Paste the id into <code>ReplicatedStorage → CombatFramework → Config → Animations</code>, on the line whose StudioFallback is that animation&apos;s name, e.g. <code>Swing1 = {"{"} Id = &quot;rbxassetid://1234567890&quot;, StudioFallback = &quot;Swing1&quot; {"}"}</code></li>
        <li>Drag the AnimationRig back into <code>ServerStorage → CombatFramework</code>. Keep it: the server reads the HitStart / HitStop hit timings from it.</li>
        <li>Check, then publish again and test from the Roblox website. The check must say <strong>“24 animation ids are yours”</strong>:</li>
      </ol>
      <code className="code-block" tabIndex={0} aria-label="Setup check command">{CHECK}</code>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Animation names"><table className="guide-table"><caption className="sr-only">Animation names and their Config line</caption><thead><tr><th scope="col">In AnimSaves</th><th scope="col">Line in Config.Animations</th></tr></thead><tbody>{ANIMATIONS.map(([save, key]) => <tr key={save}><td>{save}</td><td><code>{key}</code></td></tr>)}</tbody></table></div>
      <p>The <code>Dash</code> line stays empty: it is only used with <code>Config.Dash.Style = &quot;Dash&quot;</code>.</p>
    </ArticleSection>

    <ArticleSection id="configure" title="Configure everything.">
      <p>Every number lives in <code>ReplicatedStorage → CombatFramework → Config</code>, one commented module per topic. Change a value, press Play, feel it.</p>
      <ul><li><strong>Combat</strong>: parry windows, posture, stun, air combo, ragdoll, hit-stop, camera shake, effects, controls.</li><li><strong>Weapons → Fist</strong>: each swing&apos;s damage, posture, stun, knockback, hitbox, cooldowns, sounds.</li><li><strong>Movement</strong>, <strong>Dash</strong>: walk / run speed, roll distance and cooldown.</li><li><strong>Player</strong>: own-avatar look on or off, max health, regeneration (off).</li><li><strong>HUD</strong>: what the UI shows; recording mode hides Roblox&apos;s UI for trailers.</li><li><strong>NPCs → Vesper</strong>: difficulty (Easy, Normal, Hard, Nightmare) and every dialogue line. <strong>NPCs → ParryTrade</strong>. Set <code>Enabled = false</code> to remove one.</li></ul>
    </ArticleSection>

    <ArticleSection id="ui" title="Edit the UI.">
      <p>The UI is real instances in <code>StarterGui → CombatUI</code>: move, resize, recolour, change fonts or images in the Properties window, no code. The <code>UIController</code> inside only fills the bars and plays the motion, and finds pieces by name, so keep the names. Whole size: <code>Vitals → UIScale → Scale</code>. Extra colours are Attributes (e.g. Health → LowHealthColor). To show a new move in the cooldown bars, duplicate a row in <code>Vitals → Cooldowns</code> and set its <code>Action</code> attribute.</p>
    </ArticleSection>

    <ArticleSection id="weapons" title="Add a weapon.">
      <ol><li>Config → Weapons: duplicate <code>Fist</code> and rename it, e.g. <code>Katana</code> (the module name is the weapon&apos;s key).</li><li>Add the katana clips to Config → Animations and use their names in the module. Put “HitStart” / “HitStop” events in every attack clip. Remove a move to not have it.</li><li>Optional model: a Model named <code>Katana</code> in <code>ReplicatedStorage → CombatFramework → Weapons</code> with a part <code>Handle</code> (+ Attachments TrailA / TrailB for the trail); set Model, Grip and Holster in the module.</li><li>Give it from a server script: <code>character:SetAttribute(&quot;Weapon&quot;, &quot;Katana&quot;)</code>, or make it the default in Config → Combat → DefaultWeapon.</li></ol>
    </ArticleSection>

    <ArticleSection id="api" title="Scripting API.">
      <p>Server scripts can drive any R6 model with the same rules as players (that is how Vesper fights) and react to every result:</p>
      <code className="code-block" tabIndex={0} aria-label="Scripting API example">{API}</code>
      <p>Read-only character attributes for your own UI: Equipped, Attacking, Blocking, Stunned, StunKind, Posture, Combo, Weapon, Airborne, Dashing, Ragdolled, Running. Any NPC can talk: set its attribute <code>CF_Say</code> to <code>&quot;1|Hello&quot;</code>.</p>
    </ArticleSection>

    <ArticleSection id="troubleshooting" title="Troubleshooting.">
      <dl className="spec-table">{[
        ["No animations in the live game","Step “Upload the animations” not done, or uploaded by a different owner than the game (group game → upload to the group). Run the check."],
        ["Players are R15 / poses look wrong","StarterPlayer.StarterCharacter is missing: put it back from the package."],
        ["Play does nothing","The installer wasn't run: the folder is still in Workspace."],
        ["“animation has no Id” in Output","That Id is empty and the rig has no KeyframeSequence of that name."],
        ["Players heal / don't heal","Config → Player → Regen."],
        ["R15?","Not supported: the rig, ragdoll and animations are R6."],
      ].map(([problem, fix]) => <div key={problem}><dt>{problem}</dt><dd>{fix}</dd></div>)}</dl>
      <p className="mt-5">Still stuck? Add <strong>{business.supportDiscord}</strong> on Discord (see <Link href="/contact">support</Link>).</p>
    </ArticleSection>
  </DocumentLayout></>;
}
