/* global TrelloPowerUp */

console.log("Trello Export Power-Up: Connector script loaded.");

// FontAwesome 'file-export' styled icon (Grey)
var ICON_DATA = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuNC4wIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIzIEZvbnRpY29ucywgSW5jLiAtLT48cGF0aCBkPSJNMCA2NEMwIDI4LjcgMjguNyAwIDY0IDBIMjI0VjEyOGMwIDE3LjcgMTQuMyAzMiAzMiAzMkgzODRWMzg0SDY0VjY0em0zODQgNjRIMjU2VjBMMzg0IDEyOHpNNTcwLjQgMzg3LjFjMy4xIDMuMSA4LjIgMy4xIDExLjMgMHMzLjEtOC4yIDAtMTEuM2wtNjQtNjRjTMzMuMS0zLjEtOC4yLTMuMS0xMS4zIDBsLTY0IDY0Yy0zLjEgMy4xLTMuMSA4LjIgMCAxMS4zczguMiAzLjEgMTEuMyAwbDUwLjMtNTAuM1Y0NDhINDAwdjMyaDQ4YzE3LjcgMCAzMi0xNC4zIDMyLTMyVjM0NWw0Mi4zIDQyLjF6IiBmaWxsPSIjOEQ5NDlFIi8+PC9zdmc+';

window.TrelloPowerUp.initialize({
  'board-buttons': function (t, options) {
    console.log("Trello Export Power-Up: Initializing board buttons.");
    return [{
      icon: {
        dark: ICON_DATA,
        light: ICON_DATA
      },
      text: '', // Text removed as requested
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
