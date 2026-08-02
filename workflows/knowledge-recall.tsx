// smithers-source: authored
// smithers-display-name: Knowledge Recall (your second brain)
/** @jsxImportSource smthrs */
//
// HACK: "Point agents at your Bear/Obsidian/Notion vault — accumulated context
//        compounds, improving every decision." The vault is two things: a
//        *corpus* you read from, and a *log* you write decisions back to. The
//        article's compounding only happens if both halves run. Smithers'
//        cross-run `memory` is the durable half — recall pulls relevant past
//        decisions in, remember writes this decision out, so run N+1 is smarter
//        than run N without you re-explaining anything.
//
//   smithers up knowledge-recall.tsx --input '{
//     "question":"should we adopt tRPC or stick with REST for the new service?",
//     "vault":"~/notes" }'

import { createSmithers } from "smthrs";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** The decision/question to reason about. */
  question: z.string().default("What should we do?"),
  /** Path to your notes vault (Obsidian/Bear export/Notion export). */
  vault: z.string().default("~/notes"),
});

const recallSchema = z.looseObject({
  relevantNotes: z.array(z.string()).default([]),
  priorDecisions: z.array(z.string()).default([]),
});

const decisionSchema = z.looseObject({
  decision: z.string(),
  rationale: z.string(),
  /** Distilled to one line — this is what gets written to memory for next time. */
  memoryNote: z.string(),
});

const { Workflow, Task, Sequence, smithers } = createSmithers({
  input: inputSchema,
  recall: recallSchema,
  decision: decisionSchema,
});

export default smithers((ctx) => {
  const { question, vault } = ctx.input;
  const recall = ctx.outputMaybe("recall", { nodeId: "recall" });

  return (
    <Workflow name="knowledge-recall">
      <Sequence>
        {/* Read side of the vault: grep the notes for prior thinking. */}
        <Task id="recall" output={recallSchema} agent={agents.smartTool}>
          {`Search the notes vault at "${vault}" for anything bearing on this
question. Quote the relevant passages and list any prior decisions we already
made on the topic.

QUESTION: ${question}`}
        </Task>

        {/* Decide, recalling cross-run memory AND writing this decision back. */}
        <Task
          id="decision"
          output={decisionSchema}
          agent={agents.smart}
          memory={{
            recall: { namespace: "global", query: question, topK: 8 },
            remember: { namespace: "global", key: "decisions" },
          }}
        >
          {`Make a recommendation on the question, grounded in our actual history —
both the notes below and anything surfaced from cross-run memory. Don't
contradict a past decision without saying why it should change.

QUESTION: ${question}

FROM THE VAULT:
${
  recall
    ? `Relevant notes:\n${recall.relevantNotes.map((n) => `- ${n}`).join("\n")}\n\nPrior decisions:\n${recall.priorDecisions
        .map((d) => `- ${d}`)
        .join("\n")}`
    : "(none found)"
}

Return decision, rationale, and memoryNote (one line capturing the decision so
future runs recall it).`}
        </Task>
      </Sequence>
    </Workflow>
  );
});
