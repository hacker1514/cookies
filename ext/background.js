// Cookie Master - Background Service Worker

// Open dashboard in a new clean tab
function openDashboard(targetUrl = "") {
  let url = chrome.runtime.getURL("dashboard.html");
  if (targetUrl && targetUrl.startsWith("http")) {
    url += `?url=${encodeURIComponent(targetUrl)}`;
  }
  chrome.tabs.create({ url });
}

// Derive clean domain and URL
function parseUrlAndDomain(rawUrl) {
  let urlStr = (rawUrl || "").trim();
  if (!urlStr) return { url: "", domain: "" };
  if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
    urlStr = "https://" + urlStr;
  }
  try {
    const u = new URL(urlStr);
    return { url: u.href, domain: u.hostname };
  } catch {
    return { url: urlStr, domain: urlStr };
  }
}

// Build valid cookie URL for chrome.cookies API
function buildCookieUrl(cookie, fallbackUrl = "") {
  if (cookie.url && cookie.url.startsWith("http")) {
    return cookie.url;
  }
  if (fallbackUrl && fallbackUrl.startsWith("http")) {
    return fallbackUrl;
  }
  const isSecure = cookie.secure !== false;
  const protocol = isSecure ? "https:" : "http:";
  let domain = cookie.domain || "localhost";
  if (domain.startsWith(".")) {
    domain = domain.substring(1);
  }
  const path = cookie.path && cookie.path.startsWith("/") ? cookie.path : `/${cookie.path || ""}`;
  return `${protocol}//${domain}${path}`;
}

// Sanitize cookie object for chrome.cookies.set
function prepareCookieForSet(cookie, targetUrl = "") {
  const url = buildCookieUrl(cookie, targetUrl);
  const setDetails = {
    url: url,
    name: String(cookie.name || ""),
    value: String(cookie.value !== undefined ? cookie.value : ""),
    path: cookie.path || "/"
  };

  if (cookie.domain) {
    setDetails.domain = cookie.domain;
  }
  if (typeof cookie.secure === "boolean") {
    setDetails.secure = cookie.secure;
  }
  if (typeof cookie.httpOnly === "boolean") {
    setDetails.httpOnly = cookie.httpOnly;
  }

  // SameSite normalization
  if (cookie.sameSite) {
    const s = String(cookie.sameSite).toLowerCase();
    if (s === "no_restriction" || s === "none") {
      setDetails.sameSite = "no_restriction";
      setDetails.secure = true;
    } else if (s === "lax") {
      setDetails.sameSite = "lax";
    } else if (s === "strict") {
      setDetails.sameSite = "strict";
    } else {
      setDetails.sameSite = "unspecified";
    }
  }

  // Expiration
  if (cookie.expirationDate && !cookie.session) {
    setDetails.expirationDate = Number(cookie.expirationDate);
  } else if (cookie.expires && !cookie.session) {
    const exp = typeof cookie.expires === "number" ? cookie.expires : Date.parse(cookie.expires) / 1000;
    if (!isNaN(exp) && exp > 0) {
      setDetails.expirationDate = exp;
    }
  }

  return setDetails;
}

// Update Extension Badge
async function updateBadge(tabId, url) {
  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ text: "", tabId });
    return;
  }
  try {
    const u = new URL(url);
    const cookies = await chrome.cookies.getAll({ domain: u.hostname });
    const count = cookies.length;
    chrome.action.setBadgeText({
      text: count > 0 ? (count > 99 ? "99+" : count.toString()) : "",
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: "#8b5cf6",
      tabId
    });
  } catch {
    chrome.action.setBadgeText({ text: "", tabId });
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) updateBadge(tab.id, tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab?.url) {
    updateBadge(tabId, tab.url);
  }
});

// Runtime Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;

  (async () => {
    try {
      switch (action) {
        case "GET_ACTIVE_TAB": {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const activeTab = tabs[0] || null;
          sendResponse({ success: true, data: activeTab });
          break;
        }

        case "OPEN_DASHBOARD": {
          openDashboard(payload?.url);
          sendResponse({ success: true });
          break;
        }

        case "EXTRACT_COOKIES": {
          const { url } = payload;
          const { domain } = parseUrlAndDomain(url);
          if (!domain) {
            throw new Error("Please provide a valid URL or domain");
          }

          // Fetch by domain
          let cookies = await chrome.cookies.getAll({ domain });
          if (!cookies.length) {
            // Also try with leading dot or clean URL
            cookies = await chrome.cookies.getAll({ domain: domain.startsWith(".") ? domain.substring(1) : `.${domain}` });
          }
          if (!cookies.length && payload.url) {
            try {
              cookies = await chrome.cookies.getAll({ url: payload.url });
            } catch {}
          }

          sendResponse({ success: true, data: cookies, domain });
          break;
        }

        case "IMPORT_COOKIES": {
          const { url, cookies } = payload;
          if (!Array.isArray(cookies) || !cookies.length) {
            throw new Error("No valid cookies found in JSON array");
          }

          const { domain, url: targetUrl } = parseUrlAndDomain(url);
          let successCount = 0;
          let failedCount = 0;
          const errors = [];

          for (let i = 0; i < cookies.length; i++) {
            const raw = cookies[i];
            try {
              const c = { ...raw };
              if (domain && (!c.domain || c.domain === "localhost")) {
                c.domain = domain;
              }
              const details = prepareCookieForSet(c, targetUrl);
              const res = await chrome.cookies.set(details);
              if (res) successCount++;
              else {
                failedCount++;
                errors.push(`${raw.name || i}: unable to set`);
              }
            } catch (err) {
              failedCount++;
              errors.push(`${raw.name || i}: ${err.message}`);
            }
          }

          sendResponse({
            success: true,
            data: { total: cookies.length, successCount, failedCount, errors }
          });
          break;
        }

        case "DELETE_COOKIES": {
          const { url } = payload;
          const { domain } = parseUrlAndDomain(url);
          if (!domain) {
            throw new Error("Please provide a valid URL or domain");
          }

          let cookies = await chrome.cookies.getAll({ domain });
          if (!cookies.length) {
            cookies = await chrome.cookies.getAll({ domain: domain.startsWith(".") ? domain.substring(1) : `.${domain}` });
          }

          let deleted = 0;
          for (const c of cookies) {
            try {
              const cookieUrl = buildCookieUrl(c, url);
              await chrome.cookies.remove({ url: cookieUrl, name: c.name, storeId: c.storeId });
              deleted++;
            } catch {}
          }

          sendResponse({ success: true, data: { deleted, total: cookies.length } });
          break;
        }

        case "DELETE_SINGLE_COOKIE": {
          const { cookie, url } = payload;
          const cookieUrl = buildCookieUrl(cookie, url);
          const res = await chrome.cookies.remove({ url: cookieUrl, name: cookie.name, storeId: cookie.storeId });
          sendResponse({ success: true, data: res });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown action: ${action}` });
      }
    } catch (e) {
      sendResponse({ success: false, error: e.message || String(e) });
    }
  })();

  return true;
});
