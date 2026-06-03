# Tweet thread

Source article: https://x.com/mvanhorn/status/2061877533885473181
Repo: https://github.com/smithersai/agentic-hacks

---

**1/**

Matt Van Horn listed every agentic engineering hack he knows. Most are manual processes. I turned 9 into Smithers workflows.

https://x.com/mvanhorn/status/2061877533885473181
https://github.com/smithersai/agentic-hacks

---

**2/** brain-dump-to-plan

Why: plan before you build.
What: takes a rough idea, researches the repo, writes plan.md.

---

**3/** compound-build

Why: trusting a plan only works if something checks the output.
What: loops implement, validate, review until both pass.

---

**4/** fan-out-tabs

Why: parallel work by hand means babysitting terminal tabs.
What: runs N independent tasks at once, with a concurrency cap.

---

**5/** meeting-to-tickets

Why: action items from meetings get lost.
What: reads a transcript, extracts the action items, files one ticket each.

---

**6/** knowledge-recall

Why: agents forget what you already decided.
What: reads your notes, recalls past decisions from memory, writes the new one back.

---

**7/** errand-runner

Why: real-world actions need a human OK.
What: plans the command, waits for approval, then runs it.

---

**8/** inbox-agent

Why: some work should start from an email, not a prompt.
What: suspends until an email arrives, triages it, drafts a reply for approval.

---

**9/** two more

morning-research-digest: a daily cron that researches recent changes.
skill-from-example: writes a new skill by copying one that works.

---

**10/**

All runnable:

git clone https://github.com/smithersai/agentic-hacks
smithers up workflows/<name>.tsx

https://github.com/smithersai/agentic-hacks
