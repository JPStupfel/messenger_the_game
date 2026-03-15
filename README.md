# 🧠 Memory Match — Kids Browser Game

A colorful, fun memory card matching game built with React + Vite + Tailwind CSS, designed for kids!

## Features

- 3 difficulty levels: Easy (4 pairs), Medium (6 pairs), Hard (8 pairs)
- Animated card flips with CSS 3D transforms
- Matched cards glow green with a bounce animation
- Celebration stars spray across the screen on winning
- Move counter to track performance
- Fully responsive — works on phones, tablets, and desktops
- Bright, accessible kid-friendly UI

## Tech Stack

| Tool | Version |
|------|---------|
| React | 19 |
| Vite | 6 |
| Tailwind CSS | 4 |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/
│   └── Card.jsx        # Individual flip card component
├── App.jsx             # Game logic & layout
├── index.css           # Tailwind + custom keyframe animations
└── main.jsx            # React entry point
```

## Build for Production

```bash
npm run build
npm run preview
```
