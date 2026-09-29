// Cookie Manager - Popup Controller

document.addEventListener("DOMContentLoaded", () => {
  const btnDashboard = document.getElementById("btn-dashboard");

  btnDashboard.addEventListener("click", async () => {
    let activeUrl = "";
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url && tabs[0].url.startsWith("http")) {
        activeUrl = tabs[0].url;
      }
    } catch {}

    let dashboardUrl = chrome.runtime.getURL("dashboard.html");
    if (activeUrl) {
      dashboardUrl += `?url=${encodeURIComponent(activeUrl)}`;
    }

    chrome.tabs.create({ url: dashboardUrl });
    window.close();
  });
});
