const logs = new Map();
let globalTabId = null;

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.method === 'POST' && details.url.includes('frontend_data')) {
            const tabId = details.tabId;
            if (tabId === -1) return; // Skip requests not associated with a tab

            globalTabId = tabId;

            if (!logs.has(globalTabId)) {
                logs.set(globalTabId, []);
            }

            // Parse request body
            let requestData = '';
            if (details.requestBody) {
                if (details.requestBody.raw && details.requestBody.raw[0]?.bytes) {
                    requestData = String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes));
                } else if (details.requestBody.formData) {
                    requestData = JSON.stringify(details.requestBody.formData);
                }
            }

            const logEntry = {
                url: details.url,
                requestData: requestData,
                timestamp: new Date().toISOString(),
                responseCode: null
            };

            logs.get(globalTabId).push(logEntry);

            return { logIndex: logs.get(globalTabId).length - 1 };
        }
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (details.method === 'POST' && details.url.includes('frontend_data')) {
            if (globalTabId === -1) return;

            if (logs.has(globalTabId) && details?.frameId === 0) {
                const tabLogs = logs.get(globalTabId);
                if (tabLogs.length > 0) {
                    tabLogs[tabLogs.length - 1].responseCode = details.statusCode;
                }
            }
        }
    },
    { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
    logs.delete(globalTabId);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the status changed to 'loading' (page refresh or navigation)
    if (changeInfo.status === 'loading') {
        // Optional: Check if this is a refresh rather than initial load
        // This isn't perfect but can help distinguish refreshes
        if (tab.url && !changeInfo.url) {
            logs.delete(globalTabId);
            logs.delete(tabId);

            // Send a message to content script if needed
            chrome.tabs.sendMessage(tabId, {
                type: 'TAB_REFRESHED',
                url: tab.url
            }).catch(err => {
                // Content script might not be injected yet
                console.log('Message not sent (content script not ready)', err);
            });
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getLogs') {
        sendResponse({ logs: logs.get(globalTabId) });
        return true;
    }
});
