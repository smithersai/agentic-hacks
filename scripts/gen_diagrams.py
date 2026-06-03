#!/usr/bin/env python3
"""Render each workflow as an animated GIF: nodes go gray (pending) -> blue
(running, with a loading bar) -> green (done). One GIF per workflow, named by
its tweet number, e.g. assets/2_brain-dump-to-plan.gif.

Pure Pillow, no external binaries. Run: python3 scripts/gen_diagrams.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)

# ── geometry ──────────────────────────────────────────────────────────────
MX, TITLE_H = 46, 92
ROW0 = TITLE_H + 48
COLW, ROWH = 290, 116
NW, NH = 234, 74
LEGEND_H = 52

# ── palette ───────────────────────────────────────────────────────────────
BG = (255, 255, 255)
TITLE_C = (17, 24, 39)
SUB_C = (107, 114, 128)
PEND_F, PEND_B, PEND_T = (237, 239, 243), (183, 189, 197), (124, 132, 142)
RUN_F, RUN_F2, RUN_B = (59, 130, 246), (96, 165, 250), (29, 78, 216)
DONE_F, DONE_B = (34, 197, 94), (21, 128, 61)
GATE_F, GATE_F2, GATE_B = (245, 158, 11), (251, 191, 36), (180, 83, 9)
SRC_F, SRC_B = (55, 65, 81), (31, 41, 55)
WHITE = (255, 255, 255)
EDGE_PEND, EDGE_DONE = (176, 182, 191), (134, 199, 155)

def font(sz, bold=False):
    path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else \
           "/System/Library/Fonts/Supplemental/Arial.ttf"
    try:
        return ImageFont.truetype(path, sz)
    except Exception:
        return ImageFont.load_default()

F_TITLE, F_SUB, F_NODE, F_SMALL, F_TAG = font(30, True), font(18), font(18, True), font(14), font(13, True)

# ── shapes ────────────────────────────────────────────────────────────────
def box_of(n):
    x = MX + n["col"] * COLW
    y = ROW0 + n["row"] * ROWH
    return (x, y, x + NW, y + NH)

def center(b):
    return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

def anchor(b, toward):
    cx, cy = center(b)
    dx, dy = toward[0] - cx, toward[1] - cy
    hw, hh = (b[2] - b[0]) / 2, (b[3] - b[1]) / 2
    if dx == 0 and dy == 0:
        return (cx, cy)
    sx = hw / abs(dx) if dx else 1e9
    sy = hh / abs(dy) if dy else 1e9
    s = min(sx, sy)
    return (cx + dx * s, cy + dy * s)

def dashed(d, p1, p2, color, w=3, dash=11, gap=7):
    import math
    x1, y1 = p1; x2, y2 = p2
    dist = math.hypot(x2 - x1, y2 - y1)
    if dist == 0:
        return
    ux, uy = (x2 - x1) / dist, (y2 - y1) / dist
    n = int(dist // (dash + gap)) + 1
    for i in range(n):
        s = i * (dash + gap)
        e = min(s + dash, dist)
        d.line([(x1 + ux * s, y1 + uy * s), (x1 + ux * e, y1 + uy * e)], fill=color, width=w)

def arrowhead(d, tip, frm, color, size=11):
    import math
    ang = math.atan2(tip[1] - frm[1], tip[0] - frm[0])
    a = math.radians(26)
    p1 = (tip[0] - size * math.cos(ang - a), tip[1] - size * math.sin(ang - a))
    p2 = (tip[0] - size * math.cos(ang + a), tip[1] - size * math.sin(ang + a))
    d.polygon([tip, p1, p2], fill=color)

def draw_text_center(d, b, lines, color, fnt):
    cx, cy = center(b)
    lh = fnt.size + 4
    total = lh * len(lines)
    y = cy - total / 2
    for ln in lines:
        w = d.textlength(ln, font=fnt)
        d.text((cx - w / 2, y), ln, fill=color, font=fnt)
        y += lh

def cylinder(d, b, fill, outline):
    x0, y0, x1, y1 = b
    ee = 16
    d.rectangle([x0, y0 + ee // 2, x1, y1 - ee // 2], fill=fill)
    d.ellipse([x0, y1 - ee, x1, y1], fill=fill, outline=outline, width=3)
    d.ellipse([x0, y0, x1, y0 + ee], fill=fill, outline=outline, width=3)
    d.line([x0, y0 + ee // 2, x0, y1 - ee // 2], fill=outline, width=3)
    d.line([x1, y0 + ee // 2, x1, y1 - ee // 2], fill=outline, width=3)

def diamond(d, b, fill, outline):
    cx, cy = center(b)
    hw, hh = (b[2] - b[0]) / 2, (b[3] - b[1]) / 2
    d.polygon([(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)],
              fill=fill, outline=outline, width=3)

# ── node render ───────────────────────────────────────────────────────────
def node_colors(n, state, frac, pulse):
    """state: pending|running|done -> (fill, border, text, tag)"""
    kind = n.get("kind", "task")
    if kind == "source":  # inputs stay neutral, never "run"
        return SRC_F, SRC_B, WHITE, None
    if state == "done":
        return DONE_F, DONE_B, WHITE, "done"
    if state == "running":
        if kind in ("gate", "wait"):
            f = GATE_F if pulse else GATE_F2
            return f, GATE_B, WHITE, ("waiting" if kind == "wait" else None)
        f = RUN_F if pulse else RUN_F2
        return f, RUN_B, WHITE, "running"
    return PEND_F, PEND_B, PEND_T, None

def draw_node(d, n, state, frac, pulse):
    b = box_of(n)
    fill, border, txt, tag = node_colors(n, state, frac, pulse)
    kind = n.get("kind", "task")
    if kind == "store":
        cylinder(d, b, fill, border)
    elif kind == "gate":
        diamond(d, b, fill, border)
    else:
        d.rounded_rectangle(b, radius=14, fill=fill, outline=border, width=3)
    if kind == "gate":
        tag = None
    draw_text_center(d, (b[0], b[1] - 6, b[2], b[3] - 6), n["label"], txt, F_NODE)
    # loading bar while running (skip shapes where a full-width bar wouldn't fit / read right)
    if state == "running" and kind not in ("gate", "wait"):
        bx0, bx1 = b[0] + 18, b[2] - 18
        by = b[3] - 16
        d.rounded_rectangle([bx0, by, bx1, by + 7], radius=3, fill=(255, 255, 255, 0),
                            outline=(255, 255, 255), width=1)
        d.rectangle([bx0 + 1, by + 1, bx0 + 1 + (bx1 - bx0 - 2) * frac, by + 6], fill=WHITE)
    # status tag
    if tag:
        tw = d.textlength(tag, font=F_TAG)
        tx, ty = b[2] - tw - 12, b[1] + 8
        c = {"done": DONE_B, "running": RUN_B}.get(tag, GATE_B)
        d.text((tx, ty), tag, fill=WHITE, font=F_TAG)

# ── edges ─────────────────────────────────────────────────────────────────
def draw_edge(d, nodes, e, done):
    a, b = nodes[e[0]], nodes[e[1]]
    style = e[2] if len(e) > 2 else "normal"
    ba, bb = box_of(a), box_of(b)
    col = EDGE_DONE if e[0] in done else EDGE_PEND
    if style == "loop":
        # dashed arc above the row, source-top -> target-top
        sx = (ba[0] + ba[2]) / 2; tx = (bb[0] + bb[2]) / 2
        top = min(ba[1], bb[1]) - 34
        pts = [(sx, ba[1]), (sx, top), (tx, top), (tx, bb[1])]
        for i in range(len(pts) - 1):
            dashed(d, pts[i], pts[i + 1], col, 3)
        arrowhead(d, (tx, bb[1]), (tx, top), col)
        lw = d.textlength("loop", font=F_SMALL)
        d.text(((sx + tx) / 2 - lw / 2, top - 18), "loop", fill=SUB_C, font=F_SMALL)
        return
    if style == "bidir":
        p1 = anchor(ba, center(bb)); p2 = anchor(bb, center(ba))
        dashed(d, p1, p2, col, 3)
        arrowhead(d, p2, p1, col); arrowhead(d, p1, p2, col)
        mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
        lab = e[3] if len(e) > 3 else ""
        if lab:
            lw = d.textlength(lab, font=F_SMALL)
            d.text((mid[0] - lw / 2 + 8, mid[1] - 8), lab, fill=SUB_C, font=F_SMALL)
        return
    p1 = anchor(ba, center(bb)); p2 = anchor(bb, center(ba))
    d.line([p1, p2], fill=col, width=3)
    arrowhead(d, p2, p1, col)

# ── frame + animation ─────────────────────────────────────────────────────
def render_frame(wf, states, frac, pulse, done):
    nodes = wf["nodes"]
    maxc = max(n["col"] for n in nodes.values())
    maxr = max(n["row"] for n in nodes.values())
    W = MX + maxc * COLW + NW + MX
    H = ROW0 + maxr * ROWH + NH + LEGEND_H
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # title
    d.text((MX, 24), wf["title"], fill=TITLE_C, font=F_TITLE)
    d.text((MX, 62), wf["subtitle"], fill=SUB_C, font=F_SUB)
    # edges then nodes
    for e in wf["edges"]:
        draw_edge(d, nodes, e, done)
    for nid, n in nodes.items():
        draw_node(d, n, states.get(nid, "pending"), frac, pulse)
    # legend
    ly = H - LEGEND_H + 16
    lx = MX
    for label, fill, border in [("pending", PEND_F, PEND_B), ("running", RUN_F, RUN_B), ("done", DONE_F, DONE_B)]:
        d.rounded_rectangle([lx, ly, lx + 22, ly + 16], radius=4, fill=fill, outline=border, width=2)
        d.text((lx + 30, ly - 1), label, fill=SUB_C, font=F_SMALL)
        lx += 30 + d.textlength(label, font=F_SMALL) + 26
    return img

def build_gif(wf, path):
    frames, durs = [], []
    nodes = wf["nodes"]
    states = {nid: "pending" for nid in nodes}
    done = set()
    for nid, n in nodes.items():
        if n.get("kind") == "source":
            states[nid] = "done"; done.add(nid)
    # opening hold
    frames.append(render_frame(wf, states, 0, True, set(done))); durs.append(700)
    RUN = 4
    for group in wf["steps"]:
        for nid in group:
            states[nid] = "running"
        for k in range(RUN):
            frac = (k + 1) / RUN
            frames.append(render_frame(wf, states, frac, k % 2 == 0, set(done)))
            durs.append(300)
        for nid in group:
            states[nid] = "done"; done.add(nid)
        frames.append(render_frame(wf, states, 1, True, set(done))); durs.append(260)
    # closing hold
    frames.append(render_frame(wf, states, 1, True, set(done))); durs.append(1600)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durs,
                   loop=0, disposal=2, optimize=True)
    print("wrote", os.path.relpath(path, ROOT), f"({os.path.getsize(path)//1024} KB, {len(frames)} frames)")

# ── workflow definitions ──────────────────────────────────────────────────
def N(label, col, row, kind="task"):
    return {"label": label if isinstance(label, list) else [label], "col": col, "row": row, "kind": kind}

WORKFLOWS = {
"2_brain-dump-to-plan": {
    "title": "brain-dump-to-plan",
    "subtitle": "rough idea in, plan.md out",
    "nodes": {
        "idea": N(["idea", "(voice)"], 0, 0, "source"),
        "research": N(["research", "ground in repo"], 1, 0),
        "plan": N(["plan", "write plan.md"], 2, 0),
    },
    "edges": [("idea", "research"), ("research", "plan")],
    "steps": [["research"], ["plan"]],
},
"3_compound-build": {
    "title": "compound-build",
    "subtitle": "implement, validate, review. loop until both pass",
    "nodes": {
        "impl": N(["implement"], 0, 0),
        "val": N(["validate"], 1, 0),
        "rev": N(["review"], 2, 0),
        "mem": N(["learning", "to memory"], 3, 0),
    },
    "edges": [("impl", "val"), ("val", "rev"), ("rev", "mem"), ("rev", "impl", "loop")],
    "steps": [["impl"], ["val"], ["rev"], ["impl"], ["val"], ["rev"], ["mem"]],
},
"4_fan-out-tabs": {
    "title": "fan-out-tabs",
    "subtitle": "N independent tasks at once, capped",
    "nodes": {
        "tasks": N(["tasks[ ]"], 0, 1, "source"),
        "split": N(["Parallel", "(cap N)"], 1, 1),
        "t0": N(["task 0"], 2, 0),
        "t1": N(["task 1"], 2, 1),
        "t2": N(["task 2"], 2, 2),
    },
    "edges": [("tasks", "split"), ("split", "t0"), ("split", "t1"), ("split", "t2")],
    "steps": [["split"], ["t0", "t1", "t2"]],
},
"5_meeting-to-tickets": {
    "title": "meeting-to-tickets",
    "subtitle": "transcript, action items, one ticket each",
    "nodes": {
        "tx": N(["transcript"], 0, 1, "source"),
        "ex": N(["extract", "action items"], 1, 1),
        "k0": N(["ticket 0"], 2, 0),
        "k1": N(["ticket 1"], 2, 1),
        "k2": N(["ticket 2"], 2, 2),
    },
    "edges": [("tx", "ex"), ("ex", "k0"), ("ex", "k1"), ("ex", "k2")],
    "steps": [["ex"], ["k0", "k1", "k2"]],
},
"6_knowledge-recall": {
    "title": "knowledge-recall",
    "subtitle": "read notes, recall past decisions, write the new one back",
    "nodes": {
        "vault": N(["vault", "notes"], 0, 0, "source"),
        "recall": N(["recall", "search notes"], 1, 0),
        "decide": N(["decision"], 2, 0),
        "mem": N(["memory", "cross-run"], 2, 1, "store"),
    },
    "edges": [("vault", "recall"), ("recall", "decide"),
              ("decide", "mem", "bidir", "recall + remember")],
    "steps": [["recall"], ["decide"], ["mem"]],
},
"7_errand-runner": {
    "title": "errand-runner",
    "subtitle": "plan, wait for approval, then run",
    "nodes": {
        "plan": N(["plan", "the command"], 0, 0),
        "gate": N(["approval"], 1, 0, "gate"),
        "run": N(["execute", "(bash)"], 2, 0),
    },
    "edges": [("plan", "gate"), ("gate", "run")],
    "steps": [["plan"], ["gate"], ["run"]],
},
"8_inbox-agent": {
    "title": "inbox-agent",
    "subtitle": "starts on an email: triage, draft, approve, send",
    "nodes": {
        "wait": N(["wait: email", "(suspended)"], 0, 0, "wait"),
        "triage": N(["triage"], 1, 0),
        "draft": N(["draft reply"], 2, 0),
        "gate": N(["approval"], 3, 0, "gate"),
        "send": N(["send"], 4, 0),
    },
    "edges": [("wait", "triage"), ("triage", "draft"), ("draft", "gate"), ("gate", "send")],
    "steps": [["wait"], ["triage"], ["draft"], ["gate"], ["send"]],
},
"9_morning-research-digest": {
    "title": "morning-research-digest",
    "subtitle": "daily cron researches recent changes",
    "nodes": {
        "cron": N(["cron 9am", "(daily)"], 0, 0, "source"),
        "digest": N(["research", "write digest.md"], 1, 0),
    },
    "edges": [("cron", "digest")],
    "steps": [["digest"]],
},
"9_skill-from-example": {
    "title": "skill-from-example",
    "subtitle": "copy a working skill, build, self-check until it conforms",
    "nodes": {
        "study": N(["study", "exemplar"], 0, 0),
        "build": N(["build", "new skill"], 1, 0),
        "check": N(["check", "conforms?"], 2, 0),
    },
    "edges": [("study", "build"), ("build", "check"), ("check", "build", "loop")],
    "steps": [["study"], ["build"], ["check"], ["build"], ["check"]],
},
}

if __name__ == "__main__":
    for name, wf in WORKFLOWS.items():
        build_gif(wf, os.path.join(OUT, name + ".gif"))
