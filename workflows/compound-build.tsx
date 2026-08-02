// smithers-source: authored
// smithers-display-name: Compound Build (trust the plan)
/** @jsxImportSource smthrs */
//
// HACK: "Trust the plan — don't read it, just /ce-work it." Compound engineering:
//        the agent builds, *something checks the build*, and on failure it loops
//        with the feedback. "Trust the plan" is only safe because the loop has a
//        gate — it can't declare victory until the work is validated AND reviewed.
//
// Pair it with brain-dump-to-plan: that writes plan.md, this executes it.
//
//   smithers up compound-build.tsx --input '{"plan":"plan.md"}'
//   smithers up compound-build.tsx -d            # background; check `smithers ps`

import { createSmithers } from "smthrs";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** Path to the plan written by brain-dump-to-plan (or any plan.md). */
  plan: z.string().default("plan.md"),
  /** Verification command the implementation must make pass. */
  verify: z.string().default("pnpm typecheck && bun test"),
  maxIterations: z.number().int().default(4),
});

const implementSchema = z.looseObject({
  summary: z.string(),
  filesTouched: z.array(z.string()).default([]),
});

const validateSchema = z.looseObject({
  allPassed: z.boolean(),
  failingSummary: z.string().default(""),
});

const reviewSchema = z.looseObject({
  approved: z.boolean(),
  feedback: z.string().default(""),
});

const learningSchema = z.looseObject({ note: z.string() });

const { Workflow, Task, Sequence, Loop, smithers } = createSmithers({
  input: inputSchema,
  implement: implementSchema,
  validate: validateSchema,
  review: reviewSchema,
  learning: learningSchema,
});

export default smithers((ctx) => {
  const { plan, verify, maxIterations } = ctx.input;

  const validate = ctx.outputMaybe("validate", { nodeId: "validate" });
  const review = ctx.outputMaybe("review", { nodeId: "review" });
  const done = validate?.allPassed === true && review?.approved === true;

  // The only thing the human-equivalent would carry between iterations: the
  // last failure. Trusting the plan means trusting *this feedback channel*.
  const feedback = [
    validate && !validate.allPassed ? `VALIDATION FAILED:\n${validate.failingSummary}` : null,
    review && !review.approved ? `REVIEW REJECTED:\n${review.feedback}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Workflow name="compound-build">
      <Sequence>
        <Loop until={done} maxIterations={maxIterations}>
          <Sequence>
            <Task id="implement" output={implementSchema} agent={agents.smart}>
              {`Read the plan at "${plan}" and implement the next incomplete step(s).
Do not ask questions — the plan is the source of truth. Make focused, atomic edits.
${feedback ? `\nThe previous attempt was rejected. Fix this first:\n${feedback}` : ""}`}
            </Task>
            <Task id="validate" output={validateSchema} agent={agents.cheapFast}>
              {`Run: ${verify}
Report allPassed (boolean) and, if anything failed, a failingSummary an
implementer can act on. Do not fix anything — just report.`}
            </Task>
            <Task id="review" output={reviewSchema} agent={agents.smart}>
              {`Review the diff against the plan at "${plan}". Approve only if it
faithfully implements the plan, is correct, and ships nothing half-done.
Return approved (boolean) and feedback. Validation result this round:
${validate ? JSON.stringify(validate) : "(pending)"}`}
            </Task>
          </Sequence>
        </Loop>
        {/* Compounding: write down what made this build hard, for next time. */}
        <Task
          id="learning"
          output={learningSchema}
          agent={agents.cheapFast}
          memory={{ remember: { namespace: "global", key: "build-learnings" } }}
        >
          {`In one or two sentences, capture the most reusable lesson from this
build — a gotcha, a convention, a command that mattered. This is saved to
cross-run memory so future builds recall it.`}
        </Task>
      </Sequence>
    </Workflow>
  );
});
