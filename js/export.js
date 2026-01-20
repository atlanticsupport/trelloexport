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

window.generatePrintView = function () {
    if (exportData.length === 0) return;

    var printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor permita pop-ups para abrir a vista de impressão.");
        return;
    }

    // Generate HTML Content
    var html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Trello Export - Impressão</title>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');
            
            body {
                font-family: 'Segoe UI', sans-serif;
                background: #fff;
                color: #172b4d;
                padding: 40px;
                max-width: 210mm; /* A4 width */
                margin: 0 auto;
            }
            
            .card {
                border: 1px solid #dfe1e6;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
                page-break-inside: avoid; /* Avoid cutting cards in half when printing */
                box-shadow: 0 1px 2px rgba(9, 30, 66, 0.25);
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #dfe1e6;
                padding-bottom: 10px;
                margin-bottom: 15px;
                align-items: center;
            }

            h2 {
                margin: 0;
                font-size: 18px;
                color: #172b4d;
            }

            .list-badge {
                background: #f4f5f7;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                text-transform: uppercase;
                font-weight: 700;
                color: #5e6c84;
            }

            .labels {
                margin-bottom: 10px;
            }

            .label {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                margin-right: 5px;
                font-size: 11px;
                font-weight: 700;
                color: white;
                background-color: #0079bf; /* Default fallback */
            }

            .meta-info {
                font-size: 12px;
                color: #5e6c84;
                margin-bottom: 15px;
                display: flex;
                gap: 15px;
            }

            .description {
                font-size: 14px;
                line-height: 1.6;
                color: #172b4d;
            }
            
            /* Markdown Styles */
            .description h1, .description h2, .description h3 { margin-top: 10px; margin-bottom: 5px; }
            .description p { margin-bottom: 10px; }
            .description ul, .description ol { padding-left: 20px; }
            .description code { background: #f4f5f7; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            .description blockquote { border-left: 3px solid #dfe1e6; padding-left: 10px; color: #5e6c84; margin-left: 0; }
            .description img { max-width: 100%; height: auto; }

            @media print {
                body { padding: 0; }
                .no-print { display: none; }
                @page { margin: 20mm; }
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right; position: sticky; top: 10px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0079bf; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">🖨️ Imprimir agora</button>
        </div>
        <h1>Relatório de Exportação</h1>
        <p style="color: #666; margin-bottom: 30px;">Gerado em ${new Date().toLocaleString()}</p>
    `;

    exportData.forEach(function (row) {
        html += `<div class="card">`;

        // Header with Name and List
        html += `<div class="card-header">
                    <h2>${row['Nome'] || 'Sem Nome'}</h2>
                    ${row['Lista'] ? `<span class="list-badge">${row['Lista']}</span>` : ''}
                 </div>`;

        // Labels
        if (row['Etiquetas']) {
            html += `<div class="labels">`;
            // Split labels (assumes they are comma separated string currently)
            var labels = row['Etiquetas'].split(', ');
            labels.forEach(l => {
                if (l) html += `<span class="label">${l}</span>`;
            });
            html += `</div>`;
        }

        // Meta Info
        html += `<div class="meta-info">`;
        if (row['Membros']) html += `<span>👤 ${row['Membros']}</span>`;
        if (row['Entrega']) html += `<span>📅 ${row['Entrega']}</span>`;
        if (row['URL']) html += `<span>🔗 <a href="${row['URL']}" target="_blank">Link Trello</a></span>`;
        html += `</div>`;

        // Description with Markdown parsing
        if (row['Descrição']) {
            var descHtml = typeof marked !== 'undefined' ? marked.parse(row['Descrição']) : row['Descrição'];
            html += `<div class="description">${descHtml}</div>`;
        } else {
            html += `<div class="description" style="font-style: italic; color: #999;">Sem descrição.</div>`;
        }

        html += `</div>`; // Close card
    });

    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
};
