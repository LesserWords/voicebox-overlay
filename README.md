# Voicebox Overlay

A lightweight, native desktop overlay that converts screen text into speech via a local Voicebox API. Built to minimize context switching, it provides an eyes-free way to consume technical documentation, PRDs, and long-form content.

## ✨ Features

- **Floating Glassmorphic UI**: Beautiful, unobtrusive overlay that sits on top of your workspace.
- **Smart Text Chunking**: Automatically splits large texts by sentences, ignoring abbreviations and decimals, ensuring natural pauses in speech.
- **Instant Playback (Zero Latency)**: Streams audio chunk-by-chunk. You hear the first sentence immediately while the next sentences are silently pre-fetched in the background.
- **Interactive Reader**: Click on any sentence to jump straight to it.
- **Edit Mode**: Need to tweak the text mid-read? Toggle edit mode, adjust your text, and seamlessly resume playback.
- **Offline Mock Engine**: A built-in programmatic 16-bit PCM WAV synthesizer ensures you can test and develop the UI even if the Voicebox server is offline.

---

## 🚀 How to Use

### Native Desktop Mode (Tauri)
1. **Copy text** to your system clipboard from any application.
2. Press the global hotkey: `Win/Cmd + Shift + Space`.
3. The Voicebox Overlay will appear and instantly begin reading your text.

### Browser Fallback Mode
If you are developing in a standard web browser (e.g., using `pnpm dev` without the Tauri container):
1. Navigate to `http://localhost:1420`.
2. Press the fallback hotkey: `Alt + Shift + Space` to trigger the overlay.
3. Because browser clipboards have strict security, it will read your clipboard if permitted, or load a fallback text chunk automatically.

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)
- *(Optional)* [Rust](https://www.rust-lang.org/) (Only required if compiling the native Tauri desktop app)

### Installation
Clone the repository and install the dependencies:
```bash
pnpm install
```

### Running in the Browser (UI/UX Development)
You can build and test the entire interface, mock audio engine, and state management right in your browser without compiling Rust.
```bash
pnpm dev
```
*Note: If your local Voicebox API (`localhost:17493`) is not running, the application will automatically enter **Mock Mode** and synthesize synthetic test beeps so you can verify playback queues and UI animations.*

### Running as a Native Desktop App
If you have Rust installed and want to test the actual system-wide hotkeys, transparent window, and native clipboard hooks:
```bash
pnpm tauri dev
```

### Running Tests
The project contains comprehensive unit tests for the text parser, Pinia store, and API client.
```bash
pnpm test
```

### Building for Production
To compile the project into a standalone executable (e.g., an `.exe` installer on Windows) that you can install on your machine or share with others:
```bash
pnpm tauri build
```
*Note: The built installers and binaries will be located in the `src-tauri/target/release/bundle` directory.*

---

## 🏗️ Tech Stack
* **System**: [Tauri v2](https://v2.tauri.app/) (Rust)
* **Frontend**: [Vue 3](https://vuejs.org/) (Composition API) + Vite
* **State Management**: [Pinia](https://pinia.vuejs.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons**: [Lucide Vue](https://lucide.dev/)
* **Audio Handling**: Native Web Audio API (`AudioContext`) with volumetric GainNode fading.
