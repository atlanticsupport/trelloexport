/* global TrelloPowerUp */

console.log("Trello Export Power-Up: Connector script loaded.");

// Using a reliable public icon from Trello's own CDN/examples or a solid external source.
// FontAwesome 'download' icon.
var ICON = 'https://cdn.glitch.global/3b31c19b-640c-4389-9e8e-4a5704400569/download.svg?v=1689606821217';

window.TrelloPowerUp.initialize({
  'board-buttons': function (t, options) {
    console.log("Trello Export Power-Up: Initializing board buttons.");
    return [{
      icon: {
        dark: ICON,
        light: ICON
      },
      text: 'Exportar', // Returning text because empty text often causes the button to vanish in some Trello versions
      title: 'Exportar Quadro', // Tooltip
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
