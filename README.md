# ⏳ Future Me — Time-Locked Message Capsules

Future Me is a single-page web application that lets users write personal messages to their future selves. Each message is sealed until a selected unlock date, with a live countdown showing the time remaining. Once the unlock date passes, the message becomes readable.

## ✨ Features

- 📝 Create personalized messages for your future self.
- 🔒 Lock messages until a specified date and time.
- ⏱️ Live countdown timer with progress indicators.
- 🔓 Automatically unlock messages when the scheduled time arrives.
- 💾 Save capsules using browser local storage.
- 🎨 Light and dark themes.
- 🔍 Filter and manage message capsules.
- 📋 Copy messages and delete capsules.
- 📱 Responsive user interface.
- ♿ Accessibility support and reduced-motion preferences.

## 🛠️ Technologies Used

- **HTML5** — Page structure and interface.
- **CSS3** — Responsive styling, animations, themes, and layouts.
- **JavaScript (ES6+)** — Countdown timers, capsule management, and interactive functionality.
- **Local Storage API** — Persistent browser-side data storage.
- **Google Fonts** — Typography.

## 📂 Project Structure

```text
Future-Me/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 🚀 Getting Started

### Option 1: Open Directly

1. Download or clone the repository.
2. Open `index.html` in your browser.
3. Start creating your time-locked message capsules.

### Option 2: Run with a Local Server

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/Future-Me.git
```

Navigate to the project folder:

```bash
cd Future-Me
```

Start a local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## 🎮 How to Use

1. Create a new capsule with a title and personal message.
2. Select a future unlock date and time.
3. Save the capsule.
4. Track the live countdown and progress.
5. Open the message once its unlock time has passed.

## 💾 Data Storage

Capsules are stored in the browser's `localStorage` using the key `futureMe.capsules.v1`. The selected theme is stored separately using `futureMe.theme`.

**Important:** Data is stored locally in the browser, not on a remote server. Clearing browser storage or switching browsers/devices may remove or hide your saved capsules. Unlock timing depends on the device's clock.

## 🎯 Learning Outcomes

- Practiced DOM manipulation and event delegation.
- Implemented real-time countdowns and date-based logic.
- Learned browser local storage and data validation.
- Developed light and dark themes using CSS custom properties.
- Applied responsive design and accessibility principles.
- Built a complete application without frameworks or external dependencies.

## 🔮 Future Improvements

- Add secure user accounts and cloud synchronization.
- Enable email notifications when capsules unlock.
- Support exporting and importing capsules.
- Add optional encryption for sensitive messages.

## 👨‍💻 Author

**Marneni Trinadh**

- GitHub: https://github.com/MarneniTrinadh
