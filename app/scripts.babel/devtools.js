'use strict';

var currentTabId;
var backgroundPort;

chrome.devtools.panels.create(
  'EXPONEA',
  null,
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
    backgroundPort.postMessage({
      type: 'trackEvent',
      eventCategory: 'devtools',
      eventAction: 'clear'
    });
    $('#container').empty();
    $('#identity').empty();
    $('#log').empty();
  });
}

function initConnection() {
  backgroundPort = chrome.runtime.connect({
    name: 'background_' + currentTabId
  });
  backgroundPort.postMessage({
    type: 'trackEvent',
    eventCategory: 'devtools',
    eventAction: 'created'
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
    case 'crm/customers':
      printUpdate(cmd.data);
      break;
    default:
      log('unknown type ' + cmd.name);
  }
}

function printEvent(event) {
  var timeString = moment(new Date(event.timestamp * 1000)).format('MMM D YYYY, HH:mm:ss');
  var eventClass = 'event_' + event.type;
  var eventHTML = $('<div />', {
    class: 'event ' + eventClass
  });
  var headerHTML = $('<span />', {
    class: 'header ' + eventClass
  }).html('<span class="event-name">' + event.type + '</span> at <span class="timestring">' + timeString + '</span>');
  eventHTML.append(headerHTML);
  var identitiesHTML = $('<pre />');
  identitiesHTML.text(updateIdentity(event.customer_ids));
  eventHTML.append(identitiesHTML);
  var propertiesString = '';
  for (var propertyName in event.properties) {
    var value = event.properties[propertyName];
    propertiesString += propertyName + ' = ' + JSON.stringify(value) + '\n';
  }
  var propertiesHTML = $('<pre />');
  propertiesHTML.text(propertiesString);
  eventHTML.append(propertiesHTML);
  $('#container fieldset.urlblock').first().prepend(eventHTML);
}

function printUpdate(update) {
  var timeString = moment(new Date(update.timestamp * 1000)).format('MMM D YYYY, HH:mm:ss');
  var updateHTML = $('<div />', {
    class: 'update'
  });
  var headerHTML = $('<span />', {
    class: 'header'
  }).html('<span class="action">Customer update</span> at <span class="timestring">' + timeString + '</span>');
  updateHTML.append(headerHTML);
  var identitiesHTML = $('<pre />');
  identitiesHTML.text(updateIdentity(update.ids));
  updateHTML.append(identitiesHTML);
  var propertiesString = '';
  var propertiesCount = 0;
  for (var propertyName in update.properties) {
    propertiesCount++;
    var value = update.properties[propertyName];
    propertiesString += propertyName + ' = ' + value + '\n';
  }
  var propertiesHTML = $('<pre />');
  propertiesHTML.text(propertiesString);
  if (propertiesCount > 0) {
    updateHTML.append(propertiesHTML);
  }
  $('#container fieldset.urlblock').first().prepend(updateHTML);
}

function updateIdentity(identityObj) {
  var identitiesString = '';
  for (var idName in identityObj) {
    identitiesString += idName + ' = ' + identityObj[idName] + '\n';
  }
  $('#identity').text(identitiesString);
  return identitiesString;
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
  // for (var i in arguments) {
  //   var obj = arguments[i];
  //   $('#log').prepend(document.createTextNode(JSON.stringify(obj) + '\n'));
  // }
}