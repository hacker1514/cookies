# Manage Cookies

A Chrome extension for managing browser cookies.

## Installation

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/hacker1514/cookies.git
```

Then open the downloaded project folder:

```bash
cd cookies
```

### 2. Open Chrome Extensions

Open Google Chrome and navigate to:

```text
chrome://extensions
```

### 3. Enable Developer Mode

In the top-right corner of the Extensions page, enable:

**Developer mode**

### 4. Load the Extension

Click:

**Load unpacked**

Navigate to the cloned `cookies` folder and select the extension directory containing the extension's `manifest.json` file.

### 5. Done

The extension should now appear in your Chrome Extensions list.

You can pin **Manage Cookies** to your Chrome toolbar and start using it.

---

## Usage

1. Install the extension using the steps above.
2. Open the extension from the Chrome toolbar.
3. Use the available cookie-management features.
4. Reload the extension from `chrome://extensions` if you make changes to the source code.

---

## Project Structure

The repository contains the extension source code and required files.

The most important file is:

```text
manifest.json
```

This file defines the extension configuration, permissions, scripts, and other Chrome extension settings.

---

## Requirements

- Google Chrome
- Git
- Basic knowledge of Chrome Extensions
- Developer Mode enabled in Chrome

No paid Chrome Web Store account is required to use the extension locally with **Load unpacked**.

---

## Important Security Notice

Browser cookies can contain sensitive authentication information.

Use this project only on browsers, accounts, and systems that you own or are explicitly authorized to test.

Do not use cookies to access another person's account, bypass authentication, or obtain unauthorized access.

Never share sensitive cookies publicly.

---

## Troubleshooting

### Extension does not load

Make sure you selected the directory containing:

```text
manifest.json
```

If Chrome displays an error, open:

```text
chrome://extensions
```

and check the error details shown under the extension.

### Changes are not appearing

After modifying the source code:

1. Open `chrome://extensions`
2. Find **Manage Cookies**
3. Click **Reload**
4. Open the extension again

---

## Getting Help

If you are stuck, you can use an AI assistant to understand Chrome Extension APIs, JavaScript errors, manifest configuration, and debugging issues.

When asking for help, provide the exact error message and the relevant source code.

---

## Contributing

Contributions, improvements, bug reports, and suggestions are welcome.

If you find a problem:

1. Open an issue.
2. Describe the problem clearly.
3. Include the Chrome version and extension error message if relevant.

---

## Author

**Niranjan Kumar K**

GitHub:

```text
https://github.com/hacker1514
```

---

## License

See the repository's license file for the terms under which this project can be used and modified.

---

**Manage Cookies**  
*Chrome cookie management made simple.*
