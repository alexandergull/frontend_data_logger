const networkRequests = [];

// Store request data
function storeRequest(details) {
    const requestData = {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        type: details.type,
        time: new Date().toLocaleTimeString()
    };

    networkRequests.push(requestData);

    // Keep only the last 100 requests
    if (networkRequests.length > 100) {
        networkRequests.shift();
    }

    chrome.storage.local.set({ networkRequests });
}

// Set up listeners with correct extraInfoSpec
chrome.webRequest.onCompleted.addListener(
    storeRequest,
    { urls: ["<all_urls>"] }
);

// For response headers (if needed)
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const requestIndex = networkRequests.findIndex(req => req.url === details.url);
        if (requestIndex !== -1) {
            networkRequests[requestIndex].responseHeaders = details.responseHeaders;
            chrome.storage.local.set({ networkRequests });
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNetworkRequests") {
        chrome.storage.local.get(['networkRequests'], (result) => {
            sendResponse(result.networkRequests || []);
        });
        return true;
    }

    if (request.action === "clearNetworkRequests") {
        networkRequests.length = 0;
        chrome.storage.local.set({ networkRequests: [] });
        sendResponse({success: true});
    }
});
