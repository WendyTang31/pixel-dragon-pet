<img width="227" height="202" alt="image" src="https://github.com/user-attachments/assets/311adfe1-aa59-4462-b616-39965fec3ec9" />
<img width="457" height="404" alt="image" src="https://github.com/user-attachments/assets/0e21838b-37c4-4205-8b81-ca5c453fec61" />
<img width="235" height="192" alt="image" src="https://github.com/user-attachments/assets/e9eeff76-fb81-48b0-a138-ce6f3d2e37bb" />

# 🐉 Pixel Dragon — a desktop pet with a life of its own

A tiny pixel-art dragon that lives on your desktop. It flies around, breathes fire,
evolves into new colors, does its own little activities, notices what app you're using —
and can even become a chat companion powered by Claude.

Everything (the dragon, the fire, the props) is **drawn procedurally in code** — there are
no image assets. Built with Electron.

> Made as a creative + AI experiment by a designer. It's a work in progress and meant to be played with, forked, and extended.

---

## ✨ What it does

- **Free-roams** slowly around your screen, staying out of your way (hugs the edges, avoids your cursor).
- **Breathes fire, flies a lap around the screen, and evolves** into new dragon forms (~every 5 min) — including chameleon-patterned variants.
- **Personality drift** — each evolution subtly changes how it flies and behaves, so your dragon slowly becomes *yours*.
- **Its own random life** — it naps, reads a book, works out, taps on a tiny laptop, watches an old TV, or reads a newspaper on the toilet. Like a Tabikaeru frog, it just does things.
- **A persistent "soul"** — mood, hoard of coins, a flower that grows over real time, and personality are saved between sessions.
- **Reacts to you** — lands and rests quietly when you're typing/clicking/scrolling (so you can focus), naps when you're away, greets you when you come back.
- **Knows what you're using** — shows a small icon on its tail for the current app (Google, Claude, VS Code, YouTube, LinkedIn, Figma, Photoshop, Blender, and more).
- **Chameleon mode** — turn it on, then drag the dragon onto your wallpaper or a work window and it soaks up those colors for ~20s before flying off and fading back.
- **A visiting friend** 💕 — a companion dragon flies in for a wholesome little sequence (gift → hug → courtship dance) and leaves.
- **Do-Not-Disturb** — a quiet sleep mode that ignores the mouse entirely.

## 🧠 Chat with your dragon (Claude)

The dragon can embody an AI assistant that answers questions and searches the web.

- **Right-click → Chat with dragon** opens a chat window (with history), or
- **Shift + click the dragon** pops a comic speech bubble above its head for a quick question.
- Languages: **English / 中文 / Español** (switch from the menu or the chat window).

This uses the **Anthropic Claude API** and needs your own API key:

1. Get a key at [console.anthropic.com](https://console.anthropic.com) (add a little billing — it's pay-per-use, a few dollars lasts a long time; it's separate from a Claude.ai subscription).
2. Paste the key (starts with `sk-ant-`) into the chat once — it's saved locally on your machine only.

## 🎮 Controls

| Action | What it does |
|---|---|
| **Left-click** | Breathe fire 🔥 |
| **Drag** | Move it around |
| **Double-click** | Land on all fours & rest / take off again |
| **Shift + click** | Quick chat speech bubble |
| **Right-click** | Menu: chat, language, fly a lap, invite a friend, camouflage, do-not-disturb, evolve, quit |
| *(just leave it alone)* | It roams, does random activities, and evolves on its own |

---

## 💻 Requirements

- **Windows 10 / 11** (for now — see roadmap for Mac).
- **[Node.js](https://nodejs.org)** (LTS) to run from source.

## ▶️ How to run

```bash
npm install
npm start
```

The first `npm install` downloads Electron (~100 MB), so give it a minute.

> **Windows note:** if PowerShell blocks `npm` with a script-execution error, either run `npm.cmd install` / `npm.cmd start`, or once run:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### Build a standalone .exe (optional)

```bash
npm run dist
```

Produces a portable `PixelDragon.exe` in `dist/` that runs with **no Node/Electron needed** — double-click it, or share it with a friend. (Unsigned, so Windows SmartScreen will ask you to confirm "Run anyway".)

---

## 🚧 What I'm working on / where this could go

This started as a cute pet and is turning into an experiment in **giving an AI agent a body and a life on your desktop**. Directions I'm exploring:

- **A screen-aware companion** — the dragon reacts to *what you're doing* (mellow while you watch a video, focused while you model in Blender), not just to clicks. Per-app personas.
- **Agent embodiment** — instead of a chat window, an assistant that lives as a character: watches your context, offers help with body language, and can eventually use tools / take actions on your behalf.
- **"Walk into the desktop"** — recognizing your wallpaper's content and doing scene-appropriate things inside it.
- **Same soul, two bodies** — syncing this on-screen dragon's state (mood, memory, form) with a **future physical dragon robot**, so the pet can hop between your screen and the real world.
- **macOS support** — the app is cross-platform Electron; a Mac build just needs to be packaged on a Mac (`npm run dist`).

Ideas, forks, and PRs welcome — take it somewhere weird. 🐣

## 📄 License

MIT — do what you like, have fun.
