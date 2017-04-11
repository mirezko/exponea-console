(() => {
  'use strict';

  chrome.runtime.onInstalled.addListener(details => {
    console.log('previousVersion', details.previousVersion);
  });

  var filter = { // TODO: read from google.storage.sync
    urls: [
      '*://api.exponea.com/bulk',
      '*://api.infinario.com/bulk'
    ]
  };
  var opt_extraInfoSpec = ['requestBody'];

  chrome.webRequest.onBeforeRequest.addListener(callback, filter, opt_extraInfoSpec);

})();