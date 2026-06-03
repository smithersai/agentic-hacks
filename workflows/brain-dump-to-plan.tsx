// smithers-source: authored
// smithers-display-name: Brain Dump → Plan
/** @jsxImportSource smithers-orchestrator */
//
// HACK: "The moment you have an idea, make a plan.md. The thinking goes in the
//        plan; the execution is mechanical." — and the same method works for
//        non-code work ("a plan for the plan").
//
// You dictate a messy brain dump (gooseneck mic, Wispr, iOS dictation — pick
// your input device). The workflow does the two things you'd do by hand before
// writing the plan: (1) ground itself in the current repo / prior art, then
// (2) turn the dump into a structured plan file on disk. You never write the
// plan yourself — you write the *idea*, the workflow writes the plan.
//
//   smithers up brain-dump-to-plan.tsx --input '{"prompt":"add per-org rate limits"}'
//   smithers up brain-dump-to-plan.tsx --input '{"prompt":"Q3 GTM strategy","mode":"prose"}'

import { createSmithers } from "smithers-orchestrator";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** The raw, dictated idea. Grammar optional. */
  prompt: z.string().default("Describe what you want to plan."),
  /** "code" grounds in the repo; "prose" grounds in notes/web for non-code work. */
  mode: z.enum(["code", "prose"]).default("code"),
  /** Where the plan gets written. */
  out: z.string().default("plan.md"),
});

const researchSchema = z.looseObject({
  summary: z.string(),
  priorArt: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
});

const planSchema = z.looseObject({
  summary: z.string(),
  path: z.string(),
  steps: z.array(z.string()).default([]),
});

const { Workflow, Task, Sequence, smithers } = createSmithers({
  input: inputSchema,
  research: researchSchema,
  plan: planSchema,
});

export default smithers((ctx) => {
  const { prompt, mode, out } = ctx.input;
  const research = ctx.outputMaybe("research", { nodeId: "research" });

  const groundIn =
    mode === "code"
      ? "the current codebase: read the relevant files, conventions, and recent git history"
      : "prior art: existing notes, docs, and the public web";

  const researchPrompt = `A teammate dictated this idea — it may be rough:

"""${prompt}"""

Before anyone plans, ground the idea in ${groundIn}. Summarize what already
exists, list concrete prior art (files, docs, products), and surface the open
questions a good plan must answer. Do not propose a solution yet.`;

  const planPrompt = `Turn this idea into a plan that an agent can execute with
no further questions. Write it to "${out}" as Markdown.

IDEA:
"""${prompt}"""

${
  research
    ? `WHAT EXISTS (from research):\n${research.summary}\n\nPrior art:\n${research.priorArt
        .map((p) => `- ${p}`)
        .join("\n")}\n\nResolve these open questions in the plan:\n${research.openQuestions
        .map((q) => `- ${q}`)
        .join("\n")}`
    : ""
}

The plan is for an agent, not a human — be explicit, ordered, and verifiable.
Each step states what to do and how to confirm it's done. ${
    mode === "code"
      ? "End with a Verification section listing the exact commands to run."
      : "End with a Success Criteria section listing observable outcomes."
  }
After writing the file, return its path and the ordered steps.`;

  return (
    <Workflow name="brain-dump-to-plan">
      <Sequence>
        <Task id="research" output={researchSchema} agent={agents.smartTool}>
          {researchPrompt}
        </Task>
        <Task id="plan" output={planSchema} agent={agents.smart}>
          {planPrompt}
        </Task>
      </Sequence>
    </Workflow>
  );
});
