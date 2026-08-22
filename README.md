# Hackthon # 

A real-time ArchViz competition platform built with modular vanilla web technologies, split-flap flip countdowns, modal pipelines, and a retro-brutalist design system. Design Loud, Render Honest

The production backend uses Supabase for registrations, private model assets, design briefs, and project archives. The app sends instant registration and submission receipts through Resend, syncs participants into Resend Segments, and lets organizers design and schedule the task-drop and reminder Broadcasts in Resend. See [SUPABASE_EMAIL_SETUP.md](SUPABASE_EMAIL_SETUP.md) for the launch checklist.

---

## Features & Challenge Flow

The site operates across **4 dynamic challenge phases**:

1. **Phase 0: Pre-Registration**
   - Hero displays *"Register Now"* and *"FAQ & Details"*.
   - Interactive Registration modal with server validation, secure participant links, confirmation email, and celebration confetti.
2. **Phase 1: Awaiting Drop**
   - Hero switches to a split-flap countdown: `[ TASK DROPS IN ]`.
3. **Phase 2: Live Challenge**
   - Hero displays `[ CHALLENGE IS LIVE — SUBMISSIONS CLOSE IN ]` countdown synchronized to the event schedule.
   - Action row unlocks:
     - **Download Base Model** (.fbx, .obj, .glb)
     - **Design Brief** modal (word count indicator & creative proposal submission)
     - **Submit Entry** (2-step modal: Guidelines confirmation → direct private Supabase Storage upload)
   - Rules section becomes visible.
4. **Phase 3: Closed & Jury Evaluation**
   - Submission window closes and displays the jury evaluation banner.

---

## Running Locally

Run with any local static web server (required for ES6 module loading):

```bash
# Option 1: Using npx serve
npx serve .

# Option 2: Using Python 3
python -m http.server 3000
```

Open `http://localhost:3000` in your browser.


<p align="center">
  Built with 💙 Made by <a href="https://venusapp.in/">Veil</a>
</p>
