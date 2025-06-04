document.addEventListener('DOMContentLoaded', function() {
  const networkContent = document.getElementById('network-content');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearBtn = document.getElementById('clear-btn');
  const autoRefreshCheckbox = document.getElementById('auto-refresh');

  let autoRefreshInterval = null;

  async function displayNetworkRequests() {
    const requests = await chrome.runtime.sendMessage({action: "getNetworkRequests"});

    if (!requests || requests.length === 0) {
      networkContent.textContent = 'No network requests recorded yet.';
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Method</th>
            <th>Status</th>
            <th>Type</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
    `;

    requests.slice().reverse().forEach(req => {
      html += `
        <tr>
          <td>${req.time}</td>
          <td>${req.method}</td>
          <td>${req.statusCode || ''}</td>
          <td>${req.type}</td>
          <td class="url" title="${req.url}">${req.url}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    networkContent.innerHTML = html;
  }

  function clearNetworkRequests() {
    chrome.runtime.sendMessage({action: "clearNetworkRequests"}, () => {
      networkContent.textContent = 'Network log cleared.';
    });
  }

  function toggleAutoRefresh() {
    if (autoRefreshCheckbox.checked) {
      autoRefreshInterval = setInterval(displayNetworkRequests, 2000);
    } else {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }

  // Event listeners
  refreshBtn.addEventListener('click', displayNetworkRequests);
  clearBtn.addEventListener('click', clearNetworkRequests);
  autoRefreshCheckbox.addEventListener('change', toggleAutoRefresh);

  // Initial display
  displayNetworkRequests();

  // Clean up interval when popup closes
  window.addEventListener('unload', () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });
});
