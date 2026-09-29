// Manage Cookies - Dashboard Controller

(function () {
  "use strict";

  // Elements
  const targetUrlInput = document.getElementById("target-url");
  const btnClearUrl = document.getElementById("btn-clear-url");

  const btnExtract = document.getElementById("btn-extract");
  const btnImport = document.getElementById("btn-import");
  const btnDelete = document.getElementById("btn-delete");

  const jsonBox = document.getElementById("json-box");
  const jsonCount = document.getElementById("json-count");
  const btnCopy = document.getElementById("btn-copy");
  const btnDownload = document.getElementById("btn-download");
  const fileInput = document.getElementById("file-input");
  const btnSample = document.getElementById("btn-sample");
  const btnClearJson = document.getElementById("btn-clear-json");

  const tableCount = document.getElementById("table-count");
  const searchInput = document.getElementById("search-input");
  const tableBody = document.getElementById("table-body");
  const tableEmpty = document.getElementById("table-empty");
  const toast = document.getElementById("toast");

  let currentCookies = [];

  // Init
  document.addEventListener("DOMContentLoaded", async () => {
    bindEvents();
    await initUrl();
  });

  function bindEvents() {
    // URL typing
    targetUrlInput.addEventListener("input", () => {
      btnClearUrl.classList.toggle("hidden", !targetUrlInput.value);
    });

    btnClearUrl.addEventListener("click", () => {
      targetUrlInput.value = "";
      btnClearUrl.classList.add("hidden");
      targetUrlInput.focus();
    });

    // 3 Primary Actions
    btnExtract.addEventListener("click", handleExtract);
    btnImport.addEventListener("click", handleImport);
    btnDelete.addEventListener("click", handleDelete);

    // JSON Workspace Actions
    btnCopy.addEventListener("click", handleCopyJson);
    btnDownload.addEventListener("click", handleDownloadJson);
    btnSample.addEventListener("click", handleLoadSample);
    btnClearJson.addEventListener("click", handleClearJson);
    fileInput.addEventListener("change", handleFileUpload);

    // Table Search
    searchInput.addEventListener("input", (e) => {
      renderTable(e.target.value.trim().toLowerCase());
    });
  }

  // Load URL from query param
  async function initUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("url")) {
      targetUrlInput.value = params.get("url");
      btnClearUrl.classList.remove("hidden");
      await handleExtract();
    }
  }

  // 1. EXTRACT
  async function handleExtract() {
    const url = targetUrlInput.value.trim();
    if (!url) {
      showToast("Please enter a website URL first", true);
      targetUrlInput.focus();
      return;
    }

    setButtonLoading(btnExtract, true, "Extracting...");

    try {
      const res = await chrome.runtime.sendMessage({
        action: "EXTRACT_COOKIES",
        payload: { url }
      });

      if (res?.success) {
        currentCookies = res.data || [];
        jsonBox.value = JSON.stringify(currentCookies, null, 2);
        jsonCount.textContent = `${currentCookies.length} Cookies`;
        renderTable();
        showToast(`✓ Extracted ${currentCookies.length} cookies!`);
      } else {
        showToast("Extraction error: " + res.error, true);
      }
    } catch (e) {
      showToast("Error: " + e.message, true);
    } finally {
      setButtonLoading(btnExtract, false, "Extract JSON", "📥", "Get cookies for this URL");
    }
  }

  // 2. IMPORT
  async function handleImport() {
    const url = targetUrlInput.value.trim();
    const raw = jsonBox.value.trim();

    if (!url) {
      showToast("Please enter a target URL", true);
      targetUrlInput.focus();
      return;
    }

    if (!raw) {
      showToast("Please paste JSON cookies into the box", true);
      jsonBox.focus();
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      showToast("Invalid JSON format!", true);
      return;
    }

    let cookies = [];
    if (Array.isArray(parsed)) {
      cookies = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      if (parsed.name && parsed.value !== undefined) {
        cookies = [parsed];
      } else {
        cookies = Object.entries(parsed).map(([k, v]) => ({
          name: k,
          value: String(v),
          path: "/",
          secure: true
        }));
      }
    }

    if (!cookies.length) {
      showToast("No valid cookies found in JSON", true);
      return;
    }

    setButtonLoading(btnImport, true, "Injecting...");

    try {
      const res = await chrome.runtime.sendMessage({
        action: "IMPORT_COOKIES",
        payload: { url, cookies }
      });

      if (res?.success) {
        showToast(`✓ Injected ${res.data.successCount} of ${res.data.total} cookies!`);
        await handleExtract();
      } else {
        showToast("Import failed: " + res.error, true);
      }
    } catch (e) {
      showToast("Import error: " + e.message, true);
    } finally {
      setButtonLoading(btnImport, false, "Import JSON", "📤", "Inject JSON cookies into site");
    }
  }

  // 3. DELETE
  async function handleDelete() {
    const url = targetUrlInput.value.trim();
    if (!url) {
      showToast("Please enter a website URL", true);
      return;
    }

    if (!confirm(`Permanently delete all cookies for ${url}?`)) {
      return;
    }

    setButtonLoading(btnDelete, true, "Deleting...");

    try {
      const res = await chrome.runtime.sendMessage({
        action: "DELETE_COOKIES",
        payload: { url }
      });

      if (res?.success) {
        showToast(`✓ Deleted ${res.data.deleted} cookies!`);
        currentCookies = [];
        jsonBox.value = "[]";
        jsonCount.textContent = "0 Cookies";
        renderTable();
      } else {
        showToast("Delete error: " + res.error, true);
      }
    } catch (e) {
      showToast("Error: " + e.message, true);
    } finally {
      setButtonLoading(btnDelete, false, "Delete Cookies", "🗑️", "Remove all cookies for site");
    }
  }

  // Render Table
  function renderTable(filter = "") {
    let list = currentCookies;
    if (filter) {
      list = currentCookies.filter(c =>
        c.name.toLowerCase().includes(filter) ||
        (c.value && c.value.toLowerCase().includes(filter)) ||
        (c.domain && c.domain.toLowerCase().includes(filter))
      );
    }

    tableCount.textContent = `${list.length} Items`;
    tableBody.innerHTML = "";

    if (!list.length) {
      tableEmpty.style.display = "block";
      return;
    }

    tableEmpty.style.display = "none";

    list.forEach(c => {
      const tr = document.createElement("tr");

      let exp = "Session";
      if (!c.session && c.expirationDate) {
        const d = new Date(c.expirationDate * 1000);
        exp = d.toLocaleDateString();
      }

      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><span class="cookie-val-text" title="${escapeHtml(c.value)}">${escapeHtml(c.value || "(empty)")}</span></td>
        <td style="color:#64748b;font-size:12px;">${escapeHtml(c.domain)}</td>
        <td style="color:#94a3b8;font-size:12px;">${escapeHtml(c.path)}</td>
        <td>
          ${c.secure ? '<span class="tag-pill sec" title="HTTPS Only">SEC</span>' : ''}
          ${c.httpOnly ? '<span class="tag-pill http" title="Hidden from JS">HTTP</span>' : ''}
          <span class="tag-pill lax">${escapeHtml(c.sameSite || "Lax")}</span>
        </td>
        <td style="font-size:12px;color:#64748b;">${exp}</td>
        <td style="text-align: right;">
          <button class="btn-icon-action btn-copy-one" title="Copy value">📋</button>
          <button class="btn-icon-action danger btn-del-one" title="Delete cookie">🗑️</button>
        </td>
      `;

      // Copy One
      tr.querySelector(".btn-copy-one").addEventListener("click", async () => {
        await navigator.clipboard.writeText(c.value || "");
        showToast(`Copied value for ${c.name}!`);
      });

      // Delete One
      tr.querySelector(".btn-del-one").addEventListener("click", async () => {
        const res = await chrome.runtime.sendMessage({
          action: "DELETE_SINGLE_COOKIE",
          payload: { cookie: c, url: targetUrlInput.value }
        });
        if (res?.success) {
          showToast(`Deleted ${c.name}`);
          currentCookies = currentCookies.filter(item => item !== c);
          jsonBox.value = JSON.stringify(currentCookies, null, 2);
          jsonCount.textContent = `${currentCookies.length} Cookies`;
          renderTable(searchInput.value.trim().toLowerCase());
        }
      });

      tableBody.appendChild(tr);
    });
  }

  // JSON File & Clipboard Actions
  async function handleCopyJson() {
    const text = jsonBox.value.trim();
    if (!text) {
      showToast("Nothing to copy", true);
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("✓ Copied JSON to clipboard!");
  }

  function handleDownloadJson() {
    const text = jsonBox.value.trim();
    if (!text) {
      showToast("Nothing to download", true);
      return;
    }
    const urlStr = targetUrlInput.value.trim();
    let site = "cookies";
    try {
      const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      site = u.hostname.replace(/[^a-z0-9]/gi, "_");
    } catch {}

    const blob = new Blob([text], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `cookies_${site}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast("✓ Downloaded JSON file!");
  }

  function handleFileUpload(e) {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      jsonBox.value = event.target.result;
      try {
        const parsed = JSON.parse(event.target.result);
        const count = Array.isArray(parsed) ? parsed.length : 1;
        jsonCount.textContent = `${count} Cookies`;
      } catch {}
      showToast(`✓ Loaded ${file.name}!`);
    };
    reader.readAsText(file);
  }

  function handleLoadSample() {
    const sample = [
      {
        name: "session_token",
        value: "token_sample_abc123",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "lax"
      },
      {
        name: "user_role",
        value: "admin",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: false
      }
    ];
    jsonBox.value = JSON.stringify(sample, null, 2);
    jsonCount.textContent = "2 Cookies";
    showToast("Loaded sample JSON!");
  }

  function handleClearJson() {
    jsonBox.value = "";
    jsonCount.textContent = "0 Cookies";
    showToast("JSON cleared");
  }

  function setButtonLoading(btn, isLoading, text, icon = "", sub = "") {
    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-icon">⏳</span><div><strong>${text}</strong><small>Please wait...</small></div>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<span class="btn-icon">${icon}</span><div><strong>${text}</strong><small>${sub}</small></div>`;
    }
  }

  let toastTimeout;
  function showToast(msg, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = msg;
    toast.style.backgroundColor = isError ? "#e11d48" : "#0f172a";
    toast.classList.remove("hidden");
    toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

})();
