/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

// State to store fetched data
var allLists = [];
var allMembers = [];
var allCards = [];
var exportData = []; // Processed data ready for export

// Initialize
t.render(function () {
    // Setup standard view logic if needed, usually just one-time setup
    // We'll trigger data load on button click, but let's fetch lists early for the dropdown
    fetchLists();
    loadPreferences();
});

// Load preferences from localStorage
function loadPreferences() {
    try {
        var saved = localStorage.getItem('trello_export_prefs');
        if (saved) {
            var prefs = JSON.parse(saved);
            var checks = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
            checks.forEach(function (cb) {
                if (prefs.includes(cb.value)) {
                    cb.checked = true;
                } else {
                    cb.checked = false;
                }
            });
        }
    } catch (e) {
        console.warn("Could not load preferences", e);
    }
}

// Save preferences to localStorage
function savePreferences() {
    try {
        var fields = getSelectedFields();
        localStorage.setItem('trello_export_prefs', JSON.stringify(fields));
    } catch (e) {
        console.warn("Could not save preferences", e);
    }
}

// Toggle List Select Visibility
window.toggleListSelect = function () {
    var source = document.querySelector('input[name="source"]:checked').value;
    var listSelect = document.getElementById('list-select-container');
    if (source === 'list') {
        listSelect.classList.remove('hidden');
    } else {
        listSelect.classList.add('hidden');
    }
    t.sizeTo('#config-section'); // Resize iframe
};

// Fetch Lists for Dropdown
function fetchLists() {
    t.lists('all').then(function (lists) {
        allLists = lists;
        var select = document.getElementById('list-select');
        select.innerHTML = ''; // Clear loading

        // Sort lists by position (pos) usually, or name
        lists.sort((a, b) => a.pos - b.pos);

        lists.forEach(function (list) {
            var option = document.createElement('option');
            option.value = list.id;
            option.textContent = list.name;
            select.appendChild(option);
        });
    }).catch(function (err) {
        console.error("Error fetching lists", err);
    });
}

// Helper to get checked fields
function getSelectedFields() {
    return Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked'))
        .map(cb => cb.value);
}

// Main Load Function
document.getElementById('btn-load').addEventListener('click', function () {
    savePreferences(); // Save current selection

    var btn = document.getElementById('btn-load');
    var spinner = document.getElementById('spinner');
    var errorMsg = document.getElementById('error-msg');
    var previewSection = document.getElementById('preview-section');
    var configSection = document.getElementById('config-section');

    btn.disabled = true;
    spinner.style.display = 'block';
    errorMsg.classList.add('hidden');

    Promise.all([
        t.lists('all'),
        t.cards('all'),
        t.board('members')
    ]).then(function (values) {
        var lists = values[0];
        var cards = values[1];
        var boardData = values[2]; // t.board returns an object

        allLists = lists;
        allCards = cards;
        allMembers = boardData.members || [];

        processData();

        // UI Updates
        spinner.style.display = 'none';
        btn.disabled = false;
        configSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        document.querySelector('header').classList.add('hidden'); // Hide header
        t.sizeTo(document.body); // Resize to fit content

    }).catch(function (err) {
        console.error(err);
        spinner.style.display = 'none';
        btn.disabled = false;
        errorMsg.textContent = "Erro ao carregar dados: " + err.message;
        errorMsg.classList.remove('hidden');
    });
});

function processData() {
    var source = document.querySelector('input[name="source"]:checked').value;
    var selectedListId = document.getElementById('list-select').value;
    var fields = getSelectedFields();

    // Create Maps for fast lookup
    var listMap = {};
    allLists.forEach(l => listMap[l.id] = l.name);

    var memberMap = {};
    if (allMembers && allMembers.length) {
        allMembers.forEach(m => memberMap[m.id] = m.fullName || m.username);
    }

    // Filter Cards
    var filteredCards = allCards.filter(function (card) {
        if (source === 'list') {
            return card.idList === selectedListId;
        }
        return true; // All cards
    });

    // Map Data
    exportData = filteredCards.map(function (card) {
        var row = {};

        if (fields.includes('name')) row['Nome'] = card.name;
        if (fields.includes('desc')) row['Descrição'] = card.desc;
        if (fields.includes('list')) row['Lista'] = listMap[card.idList] || 'Desconhecida';
        if (fields.includes('url')) row['URL'] = card.url;
        if (fields.includes('due')) row['Entrega'] = card.due ? new Date(card.due).toLocaleDateString() : '';
        if (fields.includes('dateLastActivity')) row['Última Atividade'] = card.dateLastActivity ? new Date(card.dateLastActivity).toLocaleString() : '';

        if (fields.includes('labels')) {
            row['Etiquetas'] = card.labels.map(l => l.name || l.color).join(', ');
        }

        if (fields.includes('members')) {
            row['Membros'] = card.members ? card.members.map(m => m.fullName).join(', ') : // Sometimes members object is embedded
                (card.idMembers ? card.idMembers.map(id => memberMap[id] || id).join(', ') : '');
        }

        return row;
    });

    renderTable();
}

function renderTable() {
    var tableHead = document.getElementById('table-header');
    var tableBody = document.getElementById('table-body');
    var countSpan = document.getElementById('row-count');

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    countSpan.textContent = exportData.length;

    if (exportData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100">Nenhum cartão encontrado.</td></tr>';
        return;
    }

    // Get headers from first item
    var headers = Object.keys(exportData[0]);

    // Create Header Row
    headers.forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        tableHead.appendChild(th);
    });

    // Create Data Rows
    exportData.forEach(function (row) {
        var tr = document.createElement('tr');
        headers.forEach(function (h) {
            var td = document.createElement('td');
            var content = row[h] || '';

            if (h === 'URL' && content.startsWith('http')) {
                var link = document.createElement('a');
                link.href = content;
                link.target = '_blank';
                link.textContent = 'Link';
                link.style.color = 'var(--accent)';
                td.appendChild(link);
            } else {
                td.textContent = content;
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Download Handlers
window.downloadXLSX = function () {
    /* global XLSX */
    if (exportData.length === 0) return;

    // Create worksheet
    var ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trello Export");

    // Export
    XLSX.writeFile(wb, "trello_export.xlsx");
};

window.downloadCSV = function () {
    if (exportData.length === 0) return;
    var headers = Object.keys(exportData[0]);

    var csvContent = headers.join(",") + "\n";

    exportData.forEach(function (row) {
        var rowStr = headers.map(function (header) {
            var cell = row[header] === null || row[header] === undefined ? "" : row[header].toString();
            // Escape quotes and wrap in quotes
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
            }
            return cell;
        }).join(",");
        csvContent += rowStr + "\n";
    });

    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "trello_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.resetView = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('config-section').classList.remove('hidden');
    document.getElementById('preview-section').classList.add('hidden');
    document.querySelector('header').classList.remove('hidden');
    t.sizeTo('#config-section');
};
