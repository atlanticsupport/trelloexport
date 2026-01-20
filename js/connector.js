/* global TrelloPowerUp */

// Icon for the button
const GREY_ICON = 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-gray.svg';

window.TrelloPowerUp.initialize({
  'board-buttons': function(t, options) {
    return [{
      icon: GREY_ICON,
      text: 'Exportar Quadro',
      callback: function(t) {
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
