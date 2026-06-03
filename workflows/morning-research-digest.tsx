// smithers-source: authored
// smithers-display-name: Morning Research Digest (/last30days, scheduled)
/** @jsxImportSource smithers-orchestrator */
//
// HACK: "Run /last30days before planning to research current community knowledge."
//        Done by hand, you remember to do it... sometimes. The repeatable version
//        is a cron: research the moving topics every morning and leave a digest
//        on disk, so by the time you plan anything the homework is already done.
//        This is the same research stage as brain-dump-to-plan, detached from a
//        single idea and put on a schedule.
//
// Run once on demand:
//   smithers up morning-research-digest.tsx --input '{"topics":["smithers","ai agents"]}'
//
// Or schedule it for 9am daily (the /last30days habit, automated):
//   smithers cron add "0 9 * * *" .smithers/workflows/agentic-hacks/morning-research-digest.tsx
//   smithers cron list

import { createSmithers } from "smithers-orchestrator";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** Topics to sweep for the last ~30 days of movement. */
  topics: z.array(z.string()).default(["ai agents"]),
  /** Digest output path; date-stamp it yourself in the cron if you want history. */
  out: z.string().default("research/digest-latest.md"),
});

const digestSchema = z.looseObject({
  path: z.string(),
  highlights: z.array(z.string()).default([]),
});

const { Workflow, Task, smithers } = createSmithers({
  input: inputSchema,
  digest: digestSchema,
});

export default smithers((ctx) => {
  const topics = ctx.input.topics ?? ["ai agents"];
  const out = ctx.input.out ?? "research/digest-latest.md";

  return (
    <Workflow name="morning-research-digest">
      <Task id="digest" output={digestSchema} agent={agents.smartTool}>
        {`Research what moved in the last ~30 days across these topics, then write
a concise digest to "${out}" as Markdown.

TOPICS:
${topics.map((t) => `- ${t}`).join("\n")}

For each topic: 3–6 bullets of genuinely new developments (releases, notable
posts, shifts in consensus) with links. Lead the file with a 5-bullet "what
changed that affects how I'd plan this week" summary. Skip evergreen background.
Return { path, highlights } where highlights is that 5-bullet summary.`}
      </Task>
    </Workflow>
  );
});
