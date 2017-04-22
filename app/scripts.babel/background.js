'use strict';

const MESSAGEHISTORY_LIMIT = 200;
const SETTINGS_VERSION = 1;

const backgroundPorts = [];
const messagesHistory = [];

const defaultEndpoints = ['*://api.exponea.com/*', '*://api.infinario.com/*'];
const defaultSettings = {
  version: 1,
  urls: defaultEndpoints
};
const globalSettings = {};

chrome.runtime.onInstalled.addListener(details => {
  console.log('Extension ' + details.reason, details.previousVersion);
  trackEvent('background', details.reason, details.previousVersion);
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
      case 'trackEvent':
        window.trackEvent(msg.eventCategory, msg.eventAction, msg.eventLabel, msg.eventValue, msg.fieldsObject);
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
  globalSettings.urls = urls;
  saveSettings(globalSettings);
}

updateSettings(globalSettings, defaultSettings);
loadSettings((settings) => {
  updateFilters(settings.urls);
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

function saveSettings(value) {
  updateSettings(globalSettings, value);
  chrome.storage.sync.set(globalSettings, () => {
    if (chrome.runtime.lastError) {
      console.error('Error when saving settings', globalSettings, chrome.runtime.lastError);
    }
  });
}

function loadSettings(callback) {
  chrome.storage.sync.get(null, (value) => {
    if (!('version' in value)) {
      value.version = 0;
    }
    if (value.version < SETTINGS_VERSION) {
      switch (value.version) {
        case 0:
          if (value.urls) {
            for (var i in value.urls) {
              value.urls[i] = value.urls[i].replace(/\/bulk$/, '/*');
            }
          } else {
            value.urls = defaultSettings.urls;
          }
          value.version = 1;
          break;
        default:
          break;
      }
      saveSettings(value);
    }
    callback(globalSettings);
  });
}

function updateSettings(settings, value) {
  if ('version' in value) {
    settings.version = value.version;
  }
  if ('urls' in value) {
    settings.urls = value.urls;
  }
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    console.log('Storage key \'%s\' in namespace \'%s\' changed. ' +
      'Old value was \'%s\', new value is \'%s\'.',
      key,
      namespace,
      storageChange.oldValue,
      storageChange.newValue);
  }
});

(function (w, d, html, js, ga, a, m) {
  w['GoogleAnalyticsObject'] = ga;
  w[ga] = w[ga] || function () {
    (w[ga].q = w[ga].q || []).push(arguments)
  }, w[ga].l = 1 * new Date();
  a = d.createElement(html),
    m = d.getElementsByTagName(html)[0];
  a.async = 1;
  a.src = js;
  m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-XXXXX-Y', 'auto');
ga('send', 'pageview');

function trackEvent(eventCategory, eventAction, eventLabel, eventValue, fieldsObject) {
  console.log('GA:event', eventCategory, eventAction, eventLabel, eventValue, fieldsObject);
  ga('send', 'event', eventCategory, eventAction, eventLabel, eventValue, fieldsObject);
}

window.trackEvent = trackEvent;