// smithers-source: authored
// smithers-display-name: Meeting → Tickets
/** @jsxImportSource smithers-orchestrator */
//
// HACK: "Granola captures the meeting; the agent processes the transcript." The
//        manual version: read the transcript, find the commitments, open a
//        ticket for each. The fan-out here isn't over a fixed list (that's
//        fan-out-tabs) — the list is *extracted* from the transcript first, then
//        each action item becomes its own parallel ticket-drafting task.
//
//   smithers up meeting-to-tickets.tsx --input '{"transcript":"notes/standup-2026-06-03.md"}'

import { createSmithers } from "smithers-orchestrator";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** Path to the Granola/transcript file, or paste the text directly. */
  transcript: z.string().default(""),
  /** Where ticket markdown files land. */
  ticketDir: z.string().default(".smithers/tickets/inbox"),
});

const extractSchema = z.looseObject({
  actionItems: z
    .array(
      z.object({
        title: z.string(),
        owner: z.string().default("unassigned"),
        context: z.string().default(""),
      }),
    )
    .default([]),
});

const ticketSchema = z.looseObject({
  title: z.string(),
  path: z.string(),
});

const { Workflow, Task, Sequence, Parallel, smithers } = createSmithers({
  input: inputSchema,
  extract: extractSchema,
  ticket: ticketSchema,
});

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

export default smithers((ctx) => {
  const { transcript, ticketDir } = ctx.input;
  const extracted = ctx.outputMaybe("extract", { nodeId: "extract" });
  const items = extracted?.actionItems ?? [];

  return (
    <Workflow name="meeting-to-tickets">
      <Sequence>
        <Task id="extract" output={extractSchema} agent={agents.smartTool}>
          {`Read the meeting transcript ${
            transcript ? `at "${transcript}"` : "below"
          } and extract only the concrete action items — decisions that imply work,
commitments someone made, follow-ups. Ignore chit-chat. For each, capture a
crisp title, the owner if stated, and one line of context. Do NOT invent work.

${transcript ? "" : `TRANSCRIPT:\n"""${ctx.input.transcript}"""`}`}
        </Task>

        {/* One parallel task per extracted item — the fan-out width is data-driven. */}
        <Parallel maxConcurrency={5}>
          {items.map((item, i) => (
            <Task
              key={i}
              id={`ticket:${i}:${slug(item.title)}`}
              output={ticketSchema}
              agent={agents.cheapFast}
            >
              {`Draft a self-contained ticket as Markdown and write it to
"${ticketDir}/${slug(item.title)}.md".

Title: ${item.title}
Owner: ${item.owner}
Context from the meeting: ${item.context}

The ticket must include: a one-paragraph problem statement, acceptance
criteria as a checklist, and any relevant links inferable from context.
Return { title, path }.`}
            </Task>
          ))}
        </Parallel>
      </Sequence>
    </Workflow>
  );
});
