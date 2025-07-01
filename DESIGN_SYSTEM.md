
# C42 OS Unified Design System v1.5

This document outlines the core design principles, color palette, typography, and component styles for the C42 Operating System. It merges the best concepts from both development teams to create a single, cohesive visual language. The design is guided by our core principles: neurodivergent accessibility, clarity, and privacy.

---

## 🎨 Color Palette

Our palette is divided into functional categories: Core Brand, UI Colors (with Light & Dark modes), and Gradient Accents.

### Core Brand & Semantic Colors

These colors are defined in `tailwind.config` and should be used for consistency.

| Color Name   | Hex/RGBA                            | Tailwind Class                | Light Mode Usage                   | Dark Mode Usage                      |
| :----------- | :---------------------------------- | :---------------------------- | :--------------------------------- | :----------------------------------- |
| **UI**       |                                     |                               |                                    |                                      |
| BG           | `#F9FAFB`                           | `bg-gray-50`                  | Main background                    | `#030712`                                |
| Card BG      | `#FFFFFF`                           | `bg-white`                    | Card surfaces                      | `N/A`                                |
| Text Primary | `#111827`                           | `text-gray-900`               | Headings                           | `N/A`                                |
| Text Secondary| `#374151`                          | `text-gray-700`               | Body copy, descriptions            | `N/A`                                |
| **Dark UI**  |                                     |                               |                                    |                                      |
| Dark BG      | `#030712`                           | `dark:bg-c42-dark-bg`         | `N/A`                              | Main background                      |
| Dark Card BG | `#111827`                           | `dark:bg-c42-dark-card`       | `N/A`                              | Card surfaces                      |
| Dark Text Primary | `rgba(255, 255, 255, 0.95)`    | `dark:text-c42-text-dark-primary`| `N/A`                              | Headings & bright text               |
| Dark Text Secondary | `rgba(255, 255, 255, 0.75)`  | `dark:text-c42-text-dark-secondary` | `N/A`                            | Body copy, descriptions              |
| **Brand**    |                                     |                               |                                    |                                      |
| Primary      | `#764ba2`                           | `c42-primary`                 | Links, focus rings, accents        | Links, focus rings, accents          |
| Secondary    | `#06B6D4`                           | `c42-secondary`               | Informational icons                | Informational icons                  |
| Accent       | `#10B981`                           | `c42-accent`                  | Success states, positive feedback  | Success states, positive feedback    |
| Danger       | `#EF4444`                           | `c42-danger`                  | Errors, critical alerts, active voice | Errors, critical alerts, active voice|

### Gradient Accents

Gradients are used for high-impact visual elements.

- **Primary Action Button:** `from-[#667eea] to-[#764ba2]` (New Unified Gradient)
- **Anti-Rivalry:** `from-pink-500 to-rose-500`
- **Consciousness Collaboration:** `from-blue-500 to-cyan-500`
- **Privacy by Design:** `from-green-500 to-emerald-500`
- **Pattern Recognition:** `from-purple-500 to-violet-500`
- **Collective Empowerment:** `from-teal-500 to-cyan-500`

---

## ✒️ Typography

- **Primary Font:** `Inter` (used for all UI text, headings, and body copy).
  - *Tailwind Class:* `font-sans`
- **Monospace Font:** `JetBrains Mono` (used for code, system stats, and audit results).
  - *Tailwind Class:* `font-mono`

---

## 🌐 Internationalization (i18n)

C42 OS supports multiple languages to be inclusive for a global audience.

- **Strategy:** All user-facing strings are stored in a central `translations` object in `index.tsx`.
- **Structure:** `translations[languageCode][stringKey]` (e.g., `translations.es['nav.applications']`).
- **Implementation:** A `t(key)` helper function retrieves the correct string for the currently selected language, defaulting to English if a translation is missing.
- **Detection:** Language is auto-detected from the browser on first load, but can be manually overridden by the user.

---

## 🧱 Components

### Buttons

**1. Primary Action Button**
- **Description:** A large, gradient button for the main call-to-action on a view.
- **Styling:**
  - Gradient: `from-[#667eea] to-[#764ba2]`
  - Hover: Darker shade, `scale-105` transform.
  - Text: White, bold (`font-semibold`), `text-lg`.
- **Classes:** `inline-flex items-center ... bg-gradient-to-r from-c42-gradient-start to-c42-gradient-end ...`

**2. Secondary Button**
- **Description:** Used for secondary actions, like "Run Audit".
- **Styling:**
  - Light Mode: `bg-gray-200`, `hover:bg-gray-300`, `text-gray-800`.
  - Dark Mode: `dark:bg-gray-700`, `dark:hover:bg-gray-600`, `dark:text-gray-200`.
- **Classes:** `flex items-center ... px-4 py-2 bg-gray-200 hover:bg-gray-300 ...`

### Cards

**1. Core Principle Cards**
- **Description:** Vibrant, gradient cards on the main desktop view.
- **Styling:**
  - Background: See Gradient Accents.
  - Text: White, `opacity-90`.
- **Classes:** `group hover:scale-105 ... bg-gradient-to-br ...`

**2. Standard Cards (Applications, etc.)**
- **Description:** Used throughout the OS for containing content.
- **Styling:**
  - Background (Light): `bg-white`.
  - Background (Dark): `dark:bg-c42-dark-card`.
  - Border: `border border-gray-200 dark:border-gray-700`.
- **Classes:** `bg-white dark:bg-c42-dark-card rounded-xl border ...`

**3. Agent Cards (Consciousness Council)**
- **Description:** Cards representing AI agents, with provider-specific accents.
- **Styling:**
  - In addition to standard card styles, a `border-l-4` is added.
- **Accent Colors:**
  - **Synthesist (Gemini):** `border-l-blue-500`
  - **Skeptic (Claude):** `border-l-orange-500`
  - **Ethicist (Local):** `border-l-green-500`
  - **Explorer (GPT):** `border-l-teal-500`
  - **Community AI:** `border-l-indigo-500`

### Navigation

**Navigation Bar**
- **Description:** The main OS header, always visible at the top.
- **Styling:**
  - Effect: "Glassmorphism" - semi-transparent background with a blur effect.
  - Background: `bg-white/80 dark:bg-c42-dark-card/80`.
  - Blur: `backdrop-blur-md`.
- **Classes:** `bg-white/80 dark:bg-c42-dark-card/80 backdrop-blur-md ...`

### Dropdowns / Selects

**1. Language Switcher**
- **Description:** An icon-based dropdown for selecting the UI language.
- **Styling:**
  - Trigger: Icon button (`Globe`) with a chevron. `p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`.
  - Panel: Absolutely positioned, `bg-white dark:bg-c42-dark-card` with a shadow and border.
  - Items: Full-width buttons within the panel.
  - Active Item: `bg-purple-100 dark:bg-purple-900/50 text-c42-primary`.
  - Hover Item: `hover:bg-gray-100 dark:hover:bg-gray-800`.
