# agentic-hacks → Smithers workflows

A worked translation of [Matt Van Horn's](https://x.com/mvanhorn) *"Every Agentic
Engineering Hack I Know (June 2026)"* into **durable, repeatable** workflows built
on [Smithers](https://smithers.sh).

The article is a list of habits a human performs by hand — open six tabs, dictate
a plan, paste a transcript, run an errand CLI. Each habit is a *process*, and a
process you repeat is a workflow. Smithers is what you get when you stop
*performing* the process and start *declaring* it: the thinking goes in the plan,
the plan goes in a `.tsx` file, and the runtime executes it durably — surviving
crashes, suspending for free while it waits on a human or an email, and recording
what it learned for next time.

## Setup

```bash
git clone https://github.com/smithersai/agentic-hacks
cd agentic-hacks
bun install          # or pnpm / npm install
```

You'll need the Smithers CLI and a coding agent on your PATH:

```bash
bun add -g smithers-orchestrator   # provides the `smithers` command
```

Run any workflow by path:

```bash
smithers up workflows/brain-dump-to-plan.tsx --input '{"prompt":"add per-org rate limits"}'
smithers up workflows/fan-out-tabs.tsx -d     # detached/background — check `smithers ps`
smithers graph workflows/inbox-agent.tsx      # render the graph without executing
```

## The mapping

| # | Hack (from the article) | Workflow | Smithers primitive it leans on |
|---|---|---|---|
| 1 | Write a `plan.md` the moment you have an idea | [`brain-dump-to-plan`](./workflows/brain-dump-to-plan.tsx) | `Sequence` (research → plan), agent writes the file |
| 2 | *Plan for the plan* — same method for non-code work | [`brain-dump-to-plan`](./workflows/brain-dump-to-plan.tsx) (`mode:"prose"`) | one workflow, two prompts |
| 3 | Trust the plan — don't read it, just `/ce-work` it | [`compound-build`](./workflows/compound-build.tsx) | `Loop` until validated + reviewed |
| 4 | Run `/last30days` to research before planning | [`morning-research-digest`](./workflows/morning-research-digest.tsx) | `cron` + scheduled run |
| 5 | 4–6 concurrent cmux tabs | [`fan-out-tabs`](./workflows/fan-out-tabs.tsx) | `Parallel maxConcurrency` |
| 6 | Compound-engineering `/ce-work` builds | [`compound-build`](./workflows/compound-build.tsx) | plan → implement → validate → review → remember |
| 7 | Become *the signal* — steer, don't type | [`inbox-agent`](./workflows/inbox-agent.tsx), [`errand-runner`](./workflows/errand-runner.tsx) | `Approval` / `HumanTask` gates |
| 8 | AgentMail — email-triggered sessions | [`inbox-agent`](./workflows/inbox-agent.tsx) | `WaitForEvent` (durable suspension) |
| 9 | Printing-Press CLIs for real-world errands | [`errand-runner`](./workflows/errand-runner.tsx) | agent `bash` + `Approval` before side effects |
| 10 | Granola captures + processes meeting transcripts | [`meeting-to-tickets`](./workflows/meeting-to-tickets.tsx) | extract → `Parallel` ticket creation |
| 11 | Point agents at your Bear/Obsidian/Notion vault | [`knowledge-recall`](./workflows/knowledge-recall.tsx) | cross-run `memory` (recall + remember) |
| 12 | Skills: copy a good example, have the agent replicate it | [`skill-from-example`](./workflows/skill-from-example.tsx) | exemplar → generate → self-check `Loop` |

### Hacks that are *environment*, not workflow

Some of the article's hacks are hardware or shell ergonomics — there's nothing to
orchestrate, so they're intentionally **not** turned into workflows:

- Gooseneck microphone; Wispr Flow / Monologue / iOS dictation — *input devices*.
  They feed the `prompt` input of every workflow here (dictate the brain dump).
- New terminal tabs default into Claude Code; remote control for mobile —
  *shell + Gateway config*, not a graph. (Smithers' own `smithers ui` / Gateway
  already covers the "drive a live run from your phone" half of this.)
- "Beware AI psychosis" — a discipline, not a DAG. The closest Smithers analog is
  that every workflow here has a **terminal condition** (a `done`, a
  `maxIterations`, an `Approval`) so the loop *ends* instead of running forever.

## The shape they share

Read in order, the files go from synchronous-ish to fully event-driven:

1. **`brain-dump-to-plan`** — a straight `Sequence`. The simplest upgrade: idea in, `plan.md` out.
2. **`compound-build`** — a `Loop` with a quality gate. "Trust the plan" only works if something *checks* the work.
3. **`fan-out-tabs`** — `Parallel`. Six tabs become one cap'd fan-out.
4. **`meeting-to-tickets`** — fan-out driven by *extracted* data, not a fixed list.
5. **`knowledge-recall`** — adds `memory`, so runs compound across time.
6. **`errand-runner`** — adds `Approval`: the human is the signal on side effects.
7. **`inbox-agent`** — adds `WaitForEvent`: the run *starts from* an external event and costs zero while it waits.
8. **`skill-from-example`** — closes the loop: a workflow that writes new automation.

---

Built with [Smithers](https://smithers.sh) · source hack list by
[@mvanhorn](https://x.com/mvanhorn). PRs welcome — turn the env hacks into
Gateway recipes, or add your own.
