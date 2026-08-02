// smithers-source: authored
// smithers-display-name: Skill From Example
/** @jsxImportSource smthrs */
//
// HACK: "To build a new skill, point the agent at a skill that already works and
//        have it replicate the structure for the new use case." This is the most
//        agentic hack of all — automation that writes automation. The repeatable
//        form: read an exemplar, generate the new skill, then *check it against
//        the exemplar's shape* in a loop until it actually conforms. A generated
//        skill that doesn't match the working pattern is worse than none.
//
//   smithers up skill-from-example.tsx --input '{
//     "exemplar":".claude/skills/ship",
//     "goal":"a /retro skill that summarizes the week from git log",
//     "out":".claude/skills/retro" }'

import { createSmithers } from "smthrs";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** A skill (or workflow) that already works, to mimic. */
  exemplar: z.string().default(".claude/skills/ship"),
  /** What the new skill should do. */
  goal: z.string().default("Describe the new skill."),
  /** Where to write it. */
  out: z.string().default(".claude/skills/new-skill"),
  maxIterations: z.number().int().default(3),
});

const studySchema = z.looseObject({
  structure: z.string(),
  conventions: z.array(z.string()).default([]),
});

const buildSchema = z.looseObject({
  path: z.string(),
  summary: z.string(),
});

const checkSchema = z.looseObject({
  conforms: z.boolean(),
  gaps: z.string().default(""),
});

const { Workflow, Task, Sequence, Loop, smithers } = createSmithers({
  input: inputSchema,
  study: studySchema,
  build: buildSchema,
  check: checkSchema,
});

export default smithers((ctx) => {
  const { exemplar, goal, out, maxIterations } = ctx.input;
  const study = ctx.outputMaybe("study", { nodeId: "study" });
  const check = ctx.outputMaybe("check", { nodeId: "check" });
  const done = check?.conforms === true;

  return (
    <Workflow name="skill-from-example">
      <Sequence>
        {/* Learn the working pattern before copying it. */}
        <Task id="study" output={studySchema} agent={agents.smartTool}>
          {`Read the exemplar skill at "${exemplar}" — every file. Describe its
structure (files, frontmatter, sections, how it's invoked) and list the
conventions a sibling skill must follow to look native.`}
        </Task>

        {/* Generate, then self-check against the exemplar's shape, looping on gaps. */}
        <Loop until={done} maxIterations={maxIterations}>
          <Sequence>
            <Task id="build" output={buildSchema} agent={agents.smart}>
              {`Create a new skill at "${out}" that achieves the goal below, built
in the SAME structure and conventions as the exemplar.

GOAL: ${goal}

EXEMPLAR STRUCTURE:
${study?.structure ?? "(study pending)"}
CONVENTIONS:
${(study?.conventions ?? []).map((c) => `- ${c}`).join("\n")}
${check && !check.conforms ? `\nFix these gaps from the last attempt:\n${check.gaps}` : ""}`}
            </Task>
            <Task id="check" output={checkSchema} agent={agents.cheapFast}>
              {`Compare the new skill at "${out}" against the exemplar at
"${exemplar}". Does it conform to the same structure and conventions, and does
it plausibly achieve: "${goal}"? Return conforms (boolean) and gaps.`}
            </Task>
          </Sequence>
        </Loop>
      </Sequence>
    </Workflow>
  );
});
