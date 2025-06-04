document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplayLogs();
});

async function fetchAndDisplayLogs() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getLogs' });
    console.table('response', response);
    displayLogs(response?.logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

function displayLogs(logs) {
  const logsBody = document.getElementById('logs-body');
  const noLogsElement = document.getElementById('no-logs');
  const logsTable = document.getElementById('logs-table');

  logsBody.innerHTML = '';

  if (!logs || logs.length === 0) {
    noLogsElement.style.display = 'block';
    logsTable.style.display = 'none';
    return;
  }

  noLogsElement.style.display = 'none';
  logsTable.style.display = 'table';

  const logsData = processLogs(logs);
  renderLogsTable(logsBody, logsData);
}

function processLogs(logs) {
  const tokensData = {};

  logs.forEach(log => {
    const request = JSON.parse(log.requestData);
    const { data, event_token: token } = request;

    if (!tokensData[token]) {
      tokensData[token] = {};
    }

    Object.keys(data).forEach(key => {
      if (key === 'timestamp') return;

      const timestamp = formatTimestamp(data.timestamp);
      const value = formatValue(data[key]);
      const vCode = analyseValue(key, value);
      const eventData = {
        js_event: request.js_event,
        value: value,
        ts: timestamp,
        code: log.responseCode,
        v_code: vCode
      };

      if (tokensData[token][key]) {
        tokensData[token][key].push(eventData);
      } else {
        tokensData[token][key] = [eventData];
      }
    });
  });

  return tokensData;
}

function analyseValue(key, value) {
  let result;
  switch (key) {
    case 'has_input_focused':
    case 'has_key_up':
    case 'webgl':
    case 'mouse_moved':
    case 'has_scrolled':
    case 'cookies_enabled':
      result = value == true ? 1 : -1;
      break;
    case 'headless':
      result = value == false ? 1 : -1;
      break;
    case 'agent':
    case 'user_agent':
    case 'REFFERRER':
    case 'REFFERRER_PREVIOUS':
      result = value !== ''  ? 1 : -1;
      break;
    case 'scrolling_additional':
    case 'pointer_data':
    case 'page_hits':
      result = value > 0  ? 1 : -1;
      break;
    case 'screen_info':
      result = value.indexOf('fullHeight') !== -1 &&
          value.indexOf('fullWidth') !== -1 &&
          value.indexOf('visibleHeight') !== -1 &&
          value.indexOf('visibleWidth') !== -1;
      result = result ? 1 : -1;
      break;
    case 'webgl_f_hash_data':
      result = value.indexOf('f_hash') !== -1 &&
          value.indexOf('sent') !== -1 &&
          value.indexOf('"error_msg":""') !== -1 &&
          value.indexOf('success') !== -1;
      result = result ? 1 : -1;
      break;
    default:
      result = 0
  }
  return result;
}

function formatTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/:/g, ':');
}

function formatValue(value) {
  const isArray = Array.isArray(value);
  const isObject = !isArray && typeof value === 'object'
  if (isArray) {
    return value.length;
  }
  if (isObject) {
    return JSON.stringify(value);
  }
  return value;
}

function renderLogsTable(container, tokensData) {
  for (const [token, params] of Object.entries(tokensData)) {
    for (const [paramName, events] of Object.entries(params)) {
      events.forEach(eventData => {
        const row = createTableRow(token, paramName, eventData);
        container.appendChild(row);
      });
    }
  }
}

function createTableRow(token, paramName, eventData) {
  const row = document.createElement('tr');

  const createCell = (text) => {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  };

  row.appendChild(createCell(`..${token.slice(-5)}`));
  row.appendChild(createCell(paramName));
  const valCell = createCell(eventData.value);
  if (eventData.v_code !== 0) {
    valCell.style.color = eventData.v_code == -1 ? 'red' : 'green';
  }
  valCell.className = 'valueClass';
  row.appendChild(valCell);
  row.appendChild(createCell(eventData.js_event));
  row.appendChild(createCell(eventData.ts));
  row.appendChild(createCell(eventData.code));

  return row;
}
