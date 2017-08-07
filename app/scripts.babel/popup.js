'use strict';

const backgroundPage = chrome.extension.getBackgroundPage();
backgroundPage.trackEvent('popup', 'created');

function updateEndpointsTextArea() {
  var urls = backgroundPage.getFilters().join('\n');
  $('#apiEndpoints').val(urls);
  $('input#incognito').attr('checked', backgroundPage.getIncognito());
}

$('form[name="settingsForm"] input[type="submit"][name="save"]').click((evt) => {
  backgroundPage.trackEvent('popup', 'save');
  var endpoints = $('#apiEndpoints').val().split('\n');
  var incognito = $('input#incognito').is(':checked');
  backgroundPage.updateFilters({urls: endpoints, incognito: incognito});
});

$('form[name="settingsForm"] input[type="submit"][name="reset"]').click((evt) => {
  backgroundPage.trackEvent('popup', 'reset');
  backgroundPage.resetFilters();
  updateEndpointsTextArea();
  $('input#incognito').attr('checked', false);
  evt.preventDefault();
  return false;
});

updateEndpointsTextArea();