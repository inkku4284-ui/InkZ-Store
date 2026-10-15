import "server-only";
import { SandboxMemory } from "./core";
export { sandboxConfig } from "./config";
export { stripeClient, verifiedPrice } from "./core";

const processState = globalThis as typeof globalThis & { inkzSandboxMemory?: SandboxMemory };
export const sandboxMemory = processState.inkzSandboxMemory ??= new SandboxMemory();
