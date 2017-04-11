(() => {
  'use strict';

  const MESSAGEHISTORY_LIMIT = 200;

  const backgroundPorts = [];
  const messagesHistory = [];

  chrome.runtime.onInstalled.addListener(details => {
    console.log('Extension ' + details.reason, details.previousVersion);
    chrome.browserAction.setBadgeBackgroundColor({
      color: '#009900'
    });
  });

  chrome.runtime.onSuspend.addListener(() => {
    chrome.browserAction.setBadgeBackgroundColor({
      color: '##990000'
    });
  });

  chrome.runtime.onConnect.addListener((port) => {
    var match = port.name.match(/background_(\d+)/);
    if (match.length !== 2) {
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

  const filter = { // TODO: get from settings page and store in google.storage.sync
    urls: [
      '*://api.exponea.com/bulk',
      '*://api.infinario.com/bulk'
    ]
  };
  const opt_extraInfoSpec = ['requestBody'];

  chrome.webRequest.onBeforeRequest.addListener(onWebRequest, filter, opt_extraInfoSpec);

  function onWebRequest(details) {
    console.log('onWebRequest', details);
    try {
      var tabId = details.tabId;
      var buffer;
      if (details && details.type === 'xmlhttprequest' && (buffer = details.requestBody.raw[0].bytes)) {
        var body = arrayBufferToData.toJSON(buffer);
        for (var i in body.commands) {
          var cmd = body.commands[i];
          processCommand(tabId, cmd);
        }
      }
    } catch (e) {
      console.error(e.stack);
    }
  }

  function processCommand(tabId, cmd) {
    const msg = {
      type: 'command',
      tabId: tabId,
      cmd: cmd
    };
    console.log(cmd.name, cmd.data.type, cmd.data);
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
      console.count('addHistory[' + msg.tabId + '] discarding old message');
      messagesHistory.shift();
    }
    messagesHistory.push(msg);
  }

})();