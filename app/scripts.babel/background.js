'use strict';

const MESSAGEHISTORY_LIMIT = 200;
const SETTINGS_VERSION = 1;

const backgroundPorts = [];
const messagesHistory = [];
const settings = {};

chrome.runtime.onInstalled.addListener(details => {
  console.log('Extension ' + details.reason, details.previousVersion);
  chrome.browserAction.setBadgeBackgroundColor({
    color: '#009900'
  });
});

chrome.runtime.onSuspend.addListener(() => {
  chrome.browserAction.setBadgeBackgroundColor({
    color: '#990000'
  });
});

chrome.runtime.onConnect.addListener((port) => {
  var match = port.name.match(/background_(\d+)/);
  if (match === null || match.length !== 2) {
    return;
  }

  var tabId = parseInt(match[1]);
  backgroundPorts[tabId] = port;
  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'history':
        sendHistory(tabId);
        break;
      default:
        console.warn('unknown message on background port', msg);
        break;
    }
  });
  port.onDisconnect.addListener(() => {
    delete backgroundPorts[tabId];
  });
});

const defaultEndpoints = ['*://api.exponea.com/*', '*://api.infinario.com/*'];

const filter = {
  urls: defaultEndpoints
};

const opt_extraInfoSpec = ['requestBody'];

window.getFilters = () => {
  return filter.urls;
}

window.resetFilters = () => {
  updateFilters(defaultEndpoints);
}

window.updateFilters = (urls) => {
  chrome.webRequest.onBeforeRequest.removeListener(onWebRequest, filter, opt_extraInfoSpec);
  filter.urls = urls;
  chrome.webRequest.onBeforeRequest.addListener(onWebRequest, filter, opt_extraInfoSpec);
  console.log('Listening for WebRequests on API endpoints:', urls);
  saveEndpoints(urls);
}

loadSettings((items) => {
  updateFilters(items.urls);
});

function onWebRequest(details) {
  try {
    var tabId = details.tabId;
    var buffer;
    if (details && details.type === 'xmlhttprequest') {
      if (details.requestBody && (buffer = details.requestBody.raw[0].bytes)) {
        var body = arrayBufferToData.toJSON(buffer);
        if (details.method == 'POST') {
          if (/\/bulk$/.test(details.url)) {
            for (var i in body.commands) {
              var cmd = body.commands[i];
              processCommand(tabId, cmd);
            }
          } else if (/\crm\/events/.test(details.url)) {
            processCommand(tabId, body);
          } else if (/\crm\/customers/.test(details.url)) {
            processCommand(tabId, body);
          } else {
            console.warn('onWebRequest unknown POST request', details);
          }
        } else {
          console.warn('onWebRequest unknown request', details);
        }
      } else {
        console.warn('onWebRequest request without BODY', details);
      }
    }
  } catch (e) {
    console.error(e.stack);
  }
}

function processCommand(tabId, cmd) {
  if (!cmd.data.timestamp) {
    cmd.data.timestamp = new Date().getTime() / 1000;
  }
  const msg = {
    type: 'command',
    tabId: tabId,
    cmd: cmd
  };
  backgroundPorts.forEach((port, index, array) => {
    if (index === tabId) {
      port.postMessage(msg);
    }
  });
  addHistory(msg);
}

function sendHistory(tabId) {
  var port = backgroundPorts[tabId];
  if (!port) {
    return;
  }
  for (var i in messagesHistory) {
    var msg = messagesHistory[i];
    if (msg.tabId == tabId) {
      port.postMessage(msg);
    }
  }
}

function addHistory(msg) {
  if (messagesHistory.length >= MESSAGEHISTORY_LIMIT) {
    messagesHistory.shift();
  }
  messagesHistory.push(msg);
}

window.loadEndpoints = (callback) => {
  loadSettings((settings) => {
    callback(settings.urls);
  });
}

window.saveEndpoints = (endpoints) => {
  settings.urls = endpoints;
  saveSettings(endpoints);
}

function saveSettings(items) {
  chrome.storage.sync.set(settings, () => {
    settings.version = items.version;
    settings.endpoints = items.urls;
  });
}

function loadSettings(callback) {
  chrome.storage.sync.get((items) => {
    if (!items.version) {
      items.version = 0;
    }
    if (items.version < SETTINGS_VERSION) {
      switch (items.version) {
        case 1:
          break;
        default:
          for (var i in items.urls) {
            items.urls[i] = items.urls[i].replace(/\/bulk$/, '/*');
          }
          break;
      }
    }
    settings.version = items.version;
    settings.endpoints = items.urls;
    callback(items);
  });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed. ' +
      'Old value was "%s", new value is "%s".',
      key,
      namespace,
      storageChange.oldValue,
      storageChange.newValue);
  }
});