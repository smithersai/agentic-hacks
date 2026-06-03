// smithers-source: authored
// smithers-display-name: Fan Out (replace cmux tabs)
/** @jsxImportSource smithers-orchestrator */
//
// HACK: "Run 4–6 concurrent cmux tabs, each its own session." That's manual
//        fan-out: you, the human, are the scheduler — opening tabs, remembering
//        which is which, checking back on each. <Parallel maxConcurrency> *is*
//        that scheduler, except it's durable, capped, and reports back as one run.
//
// Give it a list of independent tasks; it runs up to `concurrency` at once and
// returns every result together. One `smithers ps` line instead of six tabs.
//
//   smithers up fan-out-tabs.tsx --input '{
//     "tasks":["upgrade eslint to v9","add OG tags to /blog","fix flaky auth test"],
//     "concurrency":3 }'

import { createSmithers } from "smithers-orchestrator";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** Independent units of work — one per "tab". */
  tasks: z.array(z.string()).default([]),
  /** Max running at once. The article's sweet spot is 4–6. */
  concurrency: z.number().int().default(5),
});

const taskResultSchema = z.looseObject({
  task: z.string(),
  summary: z.string(),
  succeeded: z.boolean(),
});

const { Workflow, Task, Parallel, smithers } = createSmithers({
  input: inputSchema,
  result: taskResultSchema,
});

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default smithers((ctx) => {
  const tasks = ctx.input.tasks ?? [];
  const concurrency = ctx.input.concurrency ?? 5;

  return (
    <Workflow name="fan-out-tabs">
      <Parallel maxConcurrency={concurrency}>
        {tasks.map((task, i) => (
          <Task
            key={i}
            id={`tab:${i}:${slug(task)}`}
            output={taskResultSchema}
            agent={agents.smart}
          >
            {`You own ONE independent task — treat it as its own session, blind to
the others. Complete it end to end, then report.

TASK: ${task}

Return { task, summary, succeeded }. Keep edits scoped to this task only.`}
          </Task>
        ))}
      </Parallel>
    </Workflow>
  );
});
