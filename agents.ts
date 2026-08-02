// The agent roster every workflow imports.
//
// These four roles (smart, smartTool, cheapFast, claude) are just *names* — here
// they all point at one local Claude Code agent. Swap in different models or
// providers per role (AnthropicAgent, CodexAgent, GeminiAgent, …) and every
// workflow picks up the change without edits. See `smithers agent add`.
import { type AgentLike, ClaudeCodeAgent } from "smthrs";

export const providers = {
  claude1: new ClaudeCodeAgent({ cwd: process.cwd(), yolo: true }),
} as const;

export const agents = {
  claude: [providers.claude1],
  cheapFast: [providers.claude1],
  smart: [providers.claude1],
  smartTool: [providers.claude1],
} as const satisfies Record<string, AgentLike[]>;
