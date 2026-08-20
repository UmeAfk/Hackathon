# ARCHVIZ HACKATHON — Design Loud, Render Honest

A real-time ArchViz competition platform built with modular vanilla web technologies, split-flap flip countdowns, modal pipelines, and a retro-brutalist design system.

---

## Project Structure


Hackathon/
├── index.html            # Main HTML document (~280 lines)
├── .gitignore            # Git ignore configuration
├── README.md             # Project documentation
├── public/               # Static assets & icons
│   ├── favicon.ico
│   ├── icon.png
│   └── icons.svg
├── css/                  # Modular CSS architecture (< 250 lines/file)
│   ├── style.css         # Master stylesheet importing all partials
│   ├── base.css          # Color tokens, resets, typography, wrap
│   ├── buttons.css       # Brutalist button styles, hover & press effects
│   ├── theme.css         # Dark/light theme definitions & floating toggle
│   ├── hero.css          # Hero typography, marquee ticker, closed banner
│   ├── countdown.css     # Split-flap flip clock digit animation
│   ├── sections.css      # FAQ accordion, rules grid, help card, footer
│   ├── modals.css        # Modal backdrops, fields, forms, success cards
│   ├── submission.css    # Model download cards, 2-step submit dropzone
│   ├── debug.css         # Floating phase switch pill & toast alerts
│   └── responsive.css    # Responsive breakpoints (<480px, <760px, <960px)
└── js/                   # Modular ES6 JavaScript architecture (< 270 lines/file)
    ├── main.js           # Bootstrap entry point coordinating modules
    ├── marquee.js        # Dynamic loop marquee banner
    ├── theme.js          # Dark / Light theme toggle & localStorage persistence
    ├── flipClock.js      # Split-flap digit animation engine
    ├── phaseEngine.js    # 4-Phase challenge lifecycle (0 to 3) & timers
    ├── modalCore.js      # Modal transition animations & confetti burst
    ├── modals.js         # Register, Model download, Brief & Help dialogs
    ├── submitModal.js    # 2-Step project archive submission & dropzone
    ├── scrollReveal.js   # IntersectionObserver scroll effects & FAQ accordion
    └── utils.js          # Toast notifications & file size formatters
```

---

## Features & Challenge Flow

The site operates across **4 dynamic challenge phases**:

1. **Phase 0: Pre-Registration**
   - Hero displays *"Register Now"* and *"FAQ & Details"*.
   - Interactive Registration modal with validation and celebration confetti.
2. **Phase 1: Awaiting Drop**
   - Hero switches to a split-flap countdown: `[ TASK DROPS IN ]`.
3. **Phase 2: Live Challenge**
   - Hero displays `[ CHALLENGE IS LIVE — SUBMISSIONS CLOSE IN ]` countdown.
   - Action row unlocks:
     - **Download Base Model** (.fbx, .obj, .gltf)
     - **Design Brief** modal (word count indicator & creative proposal submission)
     - **Submit Entry** (2-step modal: Guidelines confirmation → File upload dropzone)
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