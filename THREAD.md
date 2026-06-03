# Tweet thread

Source article: https://x.com/mvanhorn/status/2061877533885473181
Repo: https://github.com/smithersai/agentic-hacks

---

**1/**

@mvanhorn just dropped "Every Agentic Engineering Hack I Know."

Most of them are processes you run by hand: open six tabs, dictate a plan, paste a transcript, run an errand CLI.

A process you repeat is a workflow. So I turned 9 of them into durable Smithers workflows you can run 🧵

https://x.com/mvanhorn/status/2061877533885473181

---

**2/**

The shift: stop performing the process, start declaring it.

The thinking goes in the plan. The plan goes in a .tsx file. The runtime executes it durably: crash-safe, resumable, and it suspends for free while it waits.

https://github.com/smithersai/agentic-hacks

---

**3/**

"Write a plan.md the moment you have an idea."

→ brain-dump-to-plan: dictate a messy idea, it researches the repo first, then writes the plan to disk.

You write the idea. It writes the plan.

---

**4/**

"Trust the plan, don't read it, just /ce-work it."

→ compound-build: a Loop that implements, validates, reviews, and won't declare done until both pass.

Trusting the plan is only safe because something checks the work.

---

**5/**

"Run 4 to 6 concurrent cmux tabs."

→ fan-out-tabs: one <Parallel maxConcurrency> instead of six tabs you babysit.

The runtime is the scheduler now. One `smithers ps` line, not six tabs.

---

**6/**

"AgentMail: email triggers a session."

→ inbox-agent: <WaitForEvent> suspends the run for FREE until an email lands, then triages and drafts a reply behind your approval.

A suspended run is a row in a table, not a process burning a tab.

---

**7/**

"Custom CLIs for real-world errands."

→ errand-runner: plans the command, pauses at an <Approval> gate, THEN shells out.

"Become the signal" means you bless the irreversible step. You don't type it.

---

**8/**

Also in the repo:

• Granola transcript to tickets (fan-out)
• Obsidian/Notion vault to cross-run memory (recall + remember)
• /last30days as a morning cron
• a workflow that writes new skills by copying one that works

---

**9/**

All 9 are runnable today:

git clone https://github.com/smithersai/agentic-hacks
smithers up workflows/<name>.tsx

Built on Smithers (https://smithers.sh). Original hack list by @mvanhorn 🙏

https://github.com/smithersai/agentic-hacks
