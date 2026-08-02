// smithers-source: authored
// smithers-display-name: Inbox Agent (email-triggered)
/** @jsxImportSource smthrs */
//
// HACK: "AgentMail — email triggers a session." The deep version of "become the
//        signal": the work doesn't start when you sit down, it starts when an
//        email arrives, and it suspends for *free* the whole time it's waiting.
//        That's <WaitForEvent>: a suspended run is a row in a table, not a
//        process burning a tab. When AgentMail POSTs the inbound email to the
//        Gateway, the run wakes, triages it, does the work, and gates the reply
//        behind your approval so nothing goes out in your name unblessed.
//
//   # start it waiting (detached); it costs nothing until the email lands:
//   smithers up inbox-agent.tsx -d --input '{"mailbox":"me@agentmail.to"}'
//   # AgentMail webhook → Gateway delivers the event:
//   smithers signal <run-id> inbound-email --payload '{"from":"...","subject":"...","body":"..."}'

import { createSmithers, WaitForEvent } from "smthrs";
import { z } from "zod/v4";
import { agents } from "../agents";

const inputSchema = z.object({
  mailbox: z.string().default("me@agentmail.to"),
  /** Idle timeout — fail the run if no mail in this window. 24h default. */
  timeoutMs: z.number().int().default(86_400_000),
});

const emailSchema = z.object({
  from: z.string(),
  subject: z.string(),
  body: z.string(),
});

const triageSchema = z.looseObject({
  category: z.enum(["reply", "task", "ignore"]),
  reason: z.string(),
});

const draftSchema = z.looseObject({ subject: z.string(), body: z.string() });
const approvalSchema = z.object({ approved: z.boolean() });
const sendSchema = z.looseObject({ sent: z.boolean() });

const { Workflow, Task, Sequence, Branch, Approval, smithers } = createSmithers({
  input: inputSchema,
  email: emailSchema,
  triage: triageSchema,
  draft: draftSchema,
  approval: approvalSchema,
  send: sendSchema,
});

export default smithers((ctx) => {
  const { mailbox, timeoutMs } = ctx.input;
  const email = ctx.outputMaybe("email", { nodeId: "inbound" });
  const triage = ctx.outputMaybe("triage", { nodeId: "triage" });
  const draft = ctx.outputMaybe("draft", { nodeId: "draft" });
  const approval = ctx.outputMaybe("approval", { nodeId: "gate" });

  return (
    <Workflow name="inbox-agent">
      <Sequence>
        {/* Durable suspension: zero cost until AgentMail delivers the event. */}
        <WaitForEvent
          id="inbound"
          event="inbound-email"
          output={emailSchema}
          timeoutMs={timeoutMs}
          onTimeout="fail"
        />

        {email ? (
          <Task id="triage" output={triageSchema} agent={agents.cheapFast}>
            {`Triage this email to ${mailbox}. Is it something to reply to, work
to do, or noise? Return category ("reply" | "task" | "ignore") and reason.

From: ${email.from}
Subject: ${email.subject}

${email.body}`}
          </Task>
        ) : null}

        {/* Reply path: draft → you approve → send. The agent never sends unblessed. */}
        <Branch if={triage?.category === "reply"}>
          <Sequence>
            <Task id="draft" output={draftSchema} agent={agents.smart}>
              {`Draft a reply to ${email?.from} re "${email?.subject}". Match a
professional but human tone. Return { subject, body }.\n\nOriginal:\n${email?.body}`}
            </Task>
            <Approval
              id="gate"
              output={approvalSchema}
              request={{
                title: `Send reply to ${email?.from}?`,
                summary: draft ? `Subject: ${draft.subject}\n\n${draft.body}` : "Drafting…",
              }}
              onDeny="skip"
            />
            {approval?.approved && draft ? (
              <Task id="send" output={sendSchema} agent={agents.smart}>
                {`Send this reply via the agentmail CLI (bash). Return { sent }.
To: ${email?.from}
Subject: ${draft.subject}

${draft.body}`}
              </Task>
            ) : null}
          </Sequence>
        </Branch>

        {/* Task path: hand it to the build loop instead of replying. */}
        <Branch if={triage?.category === "task"}>
          <Task id="dispatch" output={triageSchema} agent={agents.smart}>
            {`This email is a work request. Summarize it as a one-line task title
and note that it should be handed to the compound-build workflow. (Wire a
Subflow here to actually run it.)\n\n${email?.body}`}
          </Task>
        </Branch>
      </Sequence>
    </Workflow>
  );
});
