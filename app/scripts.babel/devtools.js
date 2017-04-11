'use strict';

var currentTabId;
var backgroundPort;

chrome.devtools.panels.create(
  'EXPONEA',
  null, // No icon path
  'devtools.html',
  onPanelCreated
);

chrome.devtools.network.onNavigated.addListener(onNavigated);

function onPanelCreated(panel) {
  currentTabId = chrome.devtools.inspectedWindow.tabId;
  initConnection();
  initViewListeners();
}

function initViewListeners() {
  $('#btnClear').click(function () {
    $('#container').empty();
    $('#log').empty();
  });
}

function initConnection() {
  backgroundPort = chrome.runtime.connect({
    name: 'background_' + currentTabId
  });
  backgroundPort.onMessage.addListener(function (msg) {
    if (msg.tabId !== currentTabId) {
      return;
    }
    switch (msg.type) {
      case 'command':
        processCommand(msg.cmd);
        break;
      default:
        log('unk msg', msg);
        break;
    }
  });
  requestHistory();
}

function requestHistory() {
  var urlBlock = createUrlBlock('history');
  $('#container').append(urlBlock);
  backgroundPort.postMessage({
    type: 'history',
    tabId: currentTabId
  });
}


function processCommand(cmd) {
  switch (cmd.name) {
    case 'crm/events':
      printEvent(cmd.data);
      break;
    default:
      log('unknown type ' + cmd.name);
  }
}

function printEvent(event) {
  var time = new Date(event.timestamp * 1000);
  var eventHTML = $('<div />');
  var headerText = event.type + ' at ' + time.toLocaleTimeString() + ' (' + time.toLocaleDateString() + ')';
  eventHTML.text(headerText);
  var identitiesString = '';
  for (var idName in event.customer_ids) {
    identitiesString += idName + ' = ' + event.customer_ids[idName] + '\n';
  }
  var identitiesHTML = $('<pre />');
  identitiesHTML.text(identitiesString);
  eventHTML.append(identitiesHTML);
  var propertiesString = '';
  for (var propertyName in event.properties) {
    var value = event.properties[propertyName];
    propertiesString += propertyName + ' = ' + value + '\n';
  }
  var propertiesHTML = $('<pre />');
  propertiesHTML.text(propertiesString);
  eventHTML.append(propertiesHTML);

  $('#container fieldset.urlblock').first().prepend(eventHTML);
}

function onNavigated(url) {
  createUrlBlock(url);
}

function createUrlBlock(url) {
  var urlBlock = $('<fieldset class="urlblock"><legend class="title">' + url + '</legend></fieldset>');
  $('#container').prepend(urlBlock);
  return urlBlock;
}

function log() {
  for (var i in arguments) {
    var obj = arguments[i];
    $('#log').prepend(document.createTextNode(JSON.stringify(obj) + '\n'));
  }
}