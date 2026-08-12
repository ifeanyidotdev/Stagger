# StageNode

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-v19-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

**StageNode** is a modern, lightweight desktop Git GUI client built for speed, clarity, and seamless workflow management. Powered by **Tauri v2**, **React 19**, **TypeScript**, and **Rust**, StageNode provides a visual workspace for staging changes, switching branches, stashing work, and creating pull requests without leaving your desktop interface.

---

## ✨ Features

- **⚡ Granular Git Staging**: Stage, unstage, discard, and view diffs for modified or untracked files with ease.
- **🌿 Branch Management**: Create, checkout, and merge branches smoothly with built-in protections and safety checks.
- **🛡️ Smart Auto-Stashing**: Safely switch branches without losing uncommitted work thanks to automatic worktree stashing.
- **📦 Stash Management**: Save, view, pop, apply, or drop stashes directly within the application.
- **🚀 Pull Request Integration**: Draft and initiate GitHub/GitLab pull requests directly from your workspace.
- **🎨 Modern Dark/Purple UI**: Premium aesthetic with intuitive navigation, keyboard shortcuts, and responsive layouts.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri v2](https://tauri.app/) (Rust backend)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Git Engine**: [git2-rs](https://github.com/rust-lang/git2-rs) / Git CLI

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:

- **Node.js** (v18 or higher) & **npm** or **bun**
- **Rust** (latest stable toolchain via [rustup](https://rustup.rs/))
- System dependencies required for Tauri development on your operating system (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/StageNode.git
   cd StageNode
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

### Development

Run the Tauri application in development mode with hot-reloading:

```bash
npm run tauri dev
# or
bun tauri dev
```

### Building for Production

Build the native executable for your current OS:

```bash
npm run tauri build
# or
bun tauri build
```

---

## 📂 Project Structure

```
StageNode/
├── src/                # React 19 Frontend (TypeScript, CSS, Components)
│   ├── App.tsx         # Main Application UI & Git State Management
│   ├── App.css         # Styling system & dark purple theme
│   └── main.tsx        # React entry point
├── src-tauri/          # Tauri Rust Backend
│   ├── src/            # Rust source code & Tauri IPC handlers
│   ├── Cargo.toml      # Rust package manifests & dependencies (git2, tauri)
│   └── tauri.conf.json # Tauri configuration (window size, permissions, icons)
├── package.json        # Frontend dependencies & scripts
├── LICENSE             # GPL-3.0 License File
└── README.md           # Project documentation
```

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](file:///Users/melodyfidel/Code/projects/StageNode/LICENSE) file for details.

### Summary of GPL-3.0

You are free to:
- **Use**: Run the software for any purpose.
- **Study**: Inspect and modify the source code.
- **Share**: Copy and redistribute the software.
- **Improve**: Release your modifications to the public under the same license terms.

Under the terms of GPL-3.0, any derivative works or distributions must also be made available under the GPL-3.0 license with full source code disclosure.
