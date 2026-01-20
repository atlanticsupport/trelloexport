/* global TrelloPowerUp */

console.log("Trello Export Power-Up: Connector script loaded.");

// Use a simple SVG data URI for the icon to avoid external dependency issues
var ICON = 'https://cdn.glitch.global/3b31c19b-640c-4389-9e8e-4a5704400569/download.svg?v=1689606821217';

// If you prefer a local icon, you can use:
// var ICON = window.location.href.replace('index.html', '') + 'logo.png';

window.TrelloPowerUp.initialize({
  'board-buttons': function (t, options) {
    console.log("Trello Export Power-Up: Initializing board buttons.");
    return [{
      icon: {
        dark: ICON,
        light: ICON
      },
      text: 'Exportar Quadro',
      callback: function (t) {
        return t.modal({
          title: 'Exportar Dados do Quadro',
          url: './export.html',
          fullscreen: true,
          height: 800
        });
      }
    }];
  }
});
