// smithers-source: authored
// smithers-display-name: Errand Runner (real-world CLIs)
/** @jsxImportSource smthrs */
//
// HACK: "Build custom CLIs (Printing Press) so agents run real-world errands —
//        preheat the Tesla, order groceries, book a thing." The catch the
//        article glosses: real-world actions have *side effects you can't undo*.
//        "Become the signal" means you approve the irreversible step — you don't
//        type the command, you bless it. So this is: plan the errand → pause at an
//        <Approval> gate → only then let the agent shell out to your CLI.
//
// The agent uses its sandboxed `bash` tool to invoke whatever CLI you've wired up
// (`tesla`, `instacart`, `atmos`, …). The Approval is the difference between an
// assistant and a loose cannon.
//
//   smithers up errand-runner.tsx --input '{
//     "errand":"preheat the car to 72F and start grocery order for the usual",
//     "cli":"tesla climate on --temp 72" }'

import { createSmithers } from "smthrs";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  /** Plain-language errand. */
  errand: z.string().default("Describe the errand."),
  /** Hint at the CLI(s) available; the agent figures out exact invocation. */
  cli: z.string().default(""),
});

const planSchema = z.looseObject({
  intent: z.string(),
  command: z.string(),
  reversible: z.boolean(),
  cost: z.string().default("none"),
});

const approvalSchema = z.object({ approved: z.boolean() });

const resultSchema = z.looseObject({
  ran: z.boolean(),
  output: z.string().default(""),
});

const { Workflow, Task, Sequence, Approval, smithers } = createSmithers({
  input: inputSchema,
  plan: planSchema,
  approval: approvalSchema,
  result: resultSchema,
});

export default smithers((ctx) => {
  const { errand, cli } = ctx.input;
  const plan = ctx.outputMaybe("plan", { nodeId: "plan" });
  const approval = ctx.outputMaybe("approval", { nodeId: "gate" });

  return (
    <Workflow name="errand-runner">
      <Sequence>
        {/* 1. Decide exactly what to run — but DON'T run it yet. */}
        <Task id="plan" output={planSchema} agent={agents.smartTool}>
          {`Figure out the exact shell command to accomplish this errand. Inspect
available CLIs with --help if unsure. Do NOT execute anything that causes a
real-world side effect yet — only read/inspect. Return the command, whether it
is reversible, and any cost/charge it incurs.

ERRAND: ${errand}
${cli ? `CLI HINT: ${cli}` : ""}`}
        </Task>

        {/* 2. You are the signal: bless the irreversible step. */}
        <Approval
          id="gate"
          output={approvalSchema}
          request={{
            title: `Run real-world errand?`,
            summary: plan
              ? `Intent: ${plan.intent}\nCommand: ${plan.command}\nReversible: ${plan.reversible}\nCost: ${plan.cost}`
              : "Planning…",
          }}
          onDeny="skip"
        />

        {/* 3. Only on approval does the side effect happen. */}
        {approval?.approved && plan ? (
          <Task id="execute" output={resultSchema} agent={agents.smart}>
            {`The human approved this exact command. Run it via bash, capture
output, and confirm the real-world effect took. Run ONLY this:

${plan.command}

Return { ran, output }.`}
          </Task>
        ) : null}
      </Sequence>
    </Workflow>
  );
});
