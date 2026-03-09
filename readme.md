# AIRDROP DASHBOARD

A lightweight, browser-based dashboard designed to track airdrop tasks, testnets, and daily crypto activities. It features real-time synchronization via Firebase and automated task reset timers.

## 🚀 Features

* **Category Management**: Organize tasks into custom categories (e.g., Testnet, Nodes, Mainnet).
* **Task Tracking**: Add entries with titles, URLs, and detailed markdown-style notes.
* **Automated Reset System**:
* **Daily/Weekly**: Standard periodic resets.
* **Clock-based**: Reset at a specific time (e.g., every 07:00 AM).
* **Custom Duration**: Set specific countdowns in hours, minutes, and seconds.
* **Day-specific**: Reset on specific days of the week.


* **Real-time Sync**: Uses Firebase Realtime Database to keep data synced across multiple devices.
* **Smart UI**:
* Automatic favicon fetching for task URLs.
* Draggable reordering for categories and tasks.
* Search functionality to find tasks quickly.
* Responsive resizable detail panel.



## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules)
* **Database**: Firebase Realtime Database
* **Libraries**:
* [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop.
* Firebase SDK for data persistence.



## 📂 Project Structure

```text
├── css/
│   ├── base.css       # Core variables and reset styles
│   ├── components.css # Buttons, inputs, modals, and badges
│   ├── layout.css     # Main application shell and panels
│   ├── sidebar.css    # Category list styling
│   └── views.css      # Task list and detail panel styling
├── js/
│   ├── config.js      # Firebase configuration (git-ignored)
│   ├── handlers.js    # Event handlers and modal logic
│   ├── main.js        # App initialization and global bindings
│   ├── state.js       # Data management and Firebase syncing
│   ├── ui.js          # DOM rendering and UI updates
│   └── utils.js       # Helper functions (timers, icons)
└── index.html         # Main entry point

```

## ⚙️ Setup

1. **Firebase Configuration**:
* Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
* Enable **Realtime Database**.
* Create a `js/config.js` file (referencing `.gitignore`) and add your credentials:
```javascript
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

```




2. **Deployment**:
* Since this is a static site, you can host it on GitHub Pages, Vercel, or Netlify.
* Ensure your Firebase Database Rules allow read/write access (secure these for production).



## 📝 Usage

* **Adding Tasks**: Click **"ADD ENTRY"** in the middle panel. You can set the reset type to "Duration" for tasks that require a specific cooldown.
* **Editing Categories**: Click the ⚙️ icon in the sidebar to enable edit mode, allowing you to rename or delete categories.
* **Moving Tasks**: Simply drag a task from the list and drop it onto a category in the sidebar to move it.
* **Checklist**: Click the checkbox to mark a task as complete. If a reset timer is set, the task will automatically uncheck when the timer expires.