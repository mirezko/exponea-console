(() => {
  'use strict';

  chrome.devtools.panels.create(
    'EXPONEA',
    null, // No icon path
    'devtools.html',
    onPanelCreated
  );

  function onPanelCreated(panel) {
    chrome.runtime.connect();
    initListener();
    loadHistory();
  }

  function loadHistory() {
    chrome.devtools.network.getHAR(function (harlog) {
      if (harlog && harlog.entries)
        harlog.entries.forEach(function (item, index, array) {
          newRequest(item);
        });
    });
  }

  function initListener() {
    chrome.devtools.network.onRequestFinished.addListener(onWebRequest);
  }

  function onWebRequest(request) {
    var targetInstance = null;
    if (/https?:\/\/api\.exponea\.com\/bulk/i.test(request.request.url)) {
      targetInstance = 'EXP';
    } else if (/https?:\/\/api\.infinario\.com\/bulk/i.test(request.request.url)) {
      targetInstance = 'CIN';
    } else return;

    var body = JSON.parse(request.request.postData.text);
    try {
      for (var i in body.commands) {
        var cmd = body.commands[i];
        processCommand(cmd);
      }
    } catch (e) {
      log(e.stack);
    }
  }

  function processCommand(cmd) {
    switch (cmd.name) {
      case 'crm/events':
        processEvent(cmd.data);
        break;
      default:
        log('unknown type ' + cmd.name);
    }
  }

  function processEvent(event) {
    var eventHTML = $('<div />');
    eventHTML.text(event.type);
    $('#container').prepend(eventHTML);
  }

  function log() {
    for (var i in arguments) {
      var obj = arguments[i];
      $('#log').prepend(document.createTextNode(JSON.stringify(obj) + '\n'));
    }
  }

})();