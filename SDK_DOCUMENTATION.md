
# C42 OS Client SDK Documentation v2.0

Welcome, developer! This document is your guide to integrating your application seamlessly and securely into the C42 Operating System.

## 🎯 What is the C42 Client SDK?

When your application is loaded inside an `iframe` within C42 OS, the host **Kernel** injects a special JavaScript object into your `window` called `C42_SDK`. This SDK is your **single, secure pipeline** for communicating with the host environment.

The SDK follows a robust, modern, event-driven architecture. You can:

1.  **Subscribe to Live Events:** Receive real-time notifications when the user changes settings (like toggling from dark to light mode).
2.  **Request Host Actions:** Securely ask the C42 OS Kernel to perform actions on your behalf, such as generating an AI response using the user's API key (which your app **never** sees). This is an asynchronous, promise-based API.

## 🚀 Getting Started: Detecting the SDK

The first thing your application should do is check for the existence of `window.C42_SDK`. The Kernel injects this object as soon as the iframe loads.

```javascript
window.addEventListener('DOMContentLoaded', () => {
    // A short delay can help prevent race conditions on slower systems.
    setTimeout(() => {
        if (window.C42_SDK) {
            // C42 OS environment detected!
            console.log('C42 SDK Detected. Version:', window.C42_SDK.version);
            initializeAppWithSDK(window.C42_SDK);
        } else {
            // Not running inside C42 OS.
            console.warn('C42 SDK not found. Running in standalone mode.');
            runStandalone();
        }
    }, 50);
});
```

---

## 📖 API Reference v2.0

The `C42_SDK` object provides the following properties and methods:

### Properties

#### `version`
- **Type:** `string`
- **Description:** The semantic version of the SDK.
- **Example:** `'2.0'`

### Methods

#### `subscribe(eventType, callback)`
- **Parameters:**
  - `eventType: string` - The name of the event to listen for.
  - `callback: (payload: any) => void` - The function to execute when the event is published.
- **Returns:** `void`
- **Description:** Subscribes to a live event from the C42 Kernel. The provided callback will be executed immediately with the current state, and again every time the state changes in the host OS.
- **Available Event Types:**
    - `'theme_change'`: `payload` is a string (`'light'` or `'dark'`).
    - `'language_change'`: `payload` is a string (e.g., `'en'`, `'es'`).
- **Usage:**
  ```javascript
  // Subscribe to theme changes
  sdk.subscribe('theme_change', (newTheme) => {
      console.log('Host theme is now:', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
  });

  // Subscribe to language changes
  sdk.subscribe('language_change', (newLang) => {
      console.log('Host language is now:', newLang);
      // Logic to update UI text...
  });
  ```

#### `request(action, payload)`
- **Parameters:**
  - `action: string` - The name of the action to request from the Kernel.
  - `payload: object` - The data required to perform the action.
- **Returns:** `Promise<any>` - A promise that resolves with the result of the action or rejects with an error.
- **Description:** Sends a secure request to the C42 OS Kernel to perform an action. This is the **only** way to ask the host to do something that requires credentials or access to privileged APIs.
- **Available Actions:**
    - `action: 'generate_response'`
        - `payload: { topic: string }`
        - `returns: Promise<{ text: string }>`
- **Usage:**
  ```javascript
  async function getAIResponse(topic) {
      try {
          console.log('Requesting AI response from Kernel...');
          const response = await sdk.request('generate_response', { topic });
          console.log('Kernel responded:', response.text);
          // Render the response text in your UI
          document.getElementById('response').textContent = response.text;
      } catch (error) {
          console.error('Kernel failed to generate response:', error);
          // Render an error message in your UI
          document.getElementById('error').textContent = error.message;
      }
  }
  ```

---

## ✅ Best Practices

1.  **Always check for the SDK's existence** before calling its methods to allow for standalone functionality.
2.  **Use `subscribe` for all state changes.** This is the core of the live, integrated experience. Do not rely on initial URL parameters except as a fallback.
3.  **Wrap `request` calls in `try...catch` blocks** or use `.catch()` on the promise to gracefully handle potential errors from the host (e.g., missing API key, network issues).
4.  **Keep your component lightweight.** All heavy lifting and sensitive operations should be delegated to the Kernel via the `request` method. Your component's job is to manage its own UI and state, and interact with the OS through the secure SDK pipeline.
