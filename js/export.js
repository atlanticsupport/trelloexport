/* global TrelloPowerUp, XLSX, marked */

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

// Configure Marked.js options
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true, // Render /n as <br>
        gfm: true
    });
}

// Basic Emoji Map for common shortcodes
function parseEmojis(text) {
    if (!text) return text;
    var map = {
        ':smile:': '😄', ':smiley:': '😃', ':grin:': '😁', ':joy:': '😂', ':wink:': '😉',
        ':thumbsup:': '👍', ':plus1:': '👍', ':thumbsdown:': '👎', '-1': '👎', ':ok_hand:': '👌', ':clap:': '👏',
        ':tada:': '🎉', ':rocket:': '🚀', ':bulb:': '💡', ':memo:': '📝', ':mailbox_with_mail:': '📬',
        ':warning:': '⚠️', ':exclamation:': '❗', ':question:': '❓', ':stop_sign:': '🛑',
        ':white_check_mark:': '✅', ':check:': '✅', ':ballot_box_with_check:': '☑️', ':x:': '❌',
        ':heart:': '❤️', ':star:': '⭐', ':fire:': '🔥', ':poop:': '💩', ':eyes:': '👀',
        ':sunglasses:': '😎', ':cry:': '😢', ':sob:': '😭', ':thinking_face:': '🤔',
        ':pensive:': '😔', ':confused:': '😕', ':neutral_face:': '😐', ':open_mouth:': '😮',
        ':scream:': '😱', ':anger:': '💢', ':muscle:': '💪', ':wave:': '👋'
    };
    return text.replace(/:[a-z0-9_]+:/g, function (match) {
        // If found, return emoji. If not found, return empty string to remove code.
        return map[match] || '';
    });
}

// Helper to determine icon based on List Name
function getCategoryIcon(name) {
    name = name.toLowerCase();
    if (name.includes('todo') || name.includes('tudu') || name.includes('fazer') || name.includes('backlog')) return '📋';
    if (name.includes('doing') || name.includes('fazendo') || name.includes('progresso') || name.includes('andamento')) return '🏃';
    if (name.includes('done') || name.includes('feito') || name.includes('conclui') || name.includes('termina') || name.includes('complete')) return '✅';
    if (name.includes('bug') || name.includes('erro') || name.includes('issue')) return '🐞';
    if (name.includes('idea') || name.includes('ideia') || name.includes('sugest')) return '💡';
    if (name.includes('review') || name.includes('revis') || name.includes('qa')) return '👀';
    if (name.includes('meeting') || name.includes('reuniao')) return '📅';
    if (name.includes('info') || name.includes('doc') || name.includes('geral')) return 'ℹ️';
    return '📂'; // Default folder
}

window.generatePrintView = function () {
    if (exportData.length === 0) return;

    var printView = document.getElementById('print-view');
    var previewSection = document.getElementById('preview-section');
    var header = document.querySelector('header');

    // Hide other sections
    previewSection.classList.add('hidden');
    if (header) header.classList.add('hidden');
    printView.classList.remove('hidden');

    // Group Data by List
    var groupedData = {};
    exportData.forEach(function (row) {
        var listName = row['Lista'] || 'Outros';
        if (!groupedData[listName]) groupedData[listName] = [];
        groupedData[listName].push(row);
    });

    // Inject specialized CSS for this view
    var printStyles = `
    <style>
        /* Force scrolling on the main page/body */
        html, body {
            overflow-y: auto !important;
            height: auto !important;
            min-height: 100% !important;
        }

        /* Force light theme for this container regardless of global CSS */
        #print-view {
            background-color: white !important;
            color: black !important;
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            max-width: 210mm; /* A4 width */
            margin: 0 auto;
            position: relative;
        }

        .print-controls {
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 40px; 
            padding-bottom: 20px; 
            border-bottom: 1px solid #ccc;
            position: sticky;
            top: 0;
            background: white;
            z-index: 100;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05); /* subtle shadow for floating header */
        }

        .doc-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            color: black;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .doc-meta {
            font-size: 12px;
            color: #666;
            margin-bottom: 40px;
        }

        /* Tree View Styles using Details/Summary */
        details {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
        }

        details[open] {
            border-bottom: none; /* Let children render border */
        }

        summary {
            background-color: #f8f9fa;
            padding: 12px 15px;
            font-weight: bold;
            cursor: pointer;
            list-style: none; /* Hide default arrow to custom style */
            border-bottom: 1px solid #ddd;
            display: flex;
            align-items: center;
            font-size: 16px;
        }
        
        summary::-webkit-details-marker {
            display: none;
        }

        summary:after {
            content: '+'; 
            font-weight: bold;
            margin-left: auto;
            font-size: 18px;
        }

        details[open] summary:after {
            content: '-';
        }

        details[open] summary {
            margin-bottom: 0;
            border-bottom: 1px solid #eee;
        }

        .category-content {
            padding: 15px;
            background: #fff;
            border-bottom: 1px solid #ddd;
        }

        .print-card {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px dashed #ccc;
            page-break-inside: avoid;
        }
        .print-card:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .print-card h2 {
            font-size: 16px;
            margin: 0 0 8px 0;
            font-weight: bold;
            color: black;
        }

        .print-meta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 11px;
            color: #333;
            margin-bottom: 10px;
            font-family: monospace; 
            text-transform: uppercase;
        }

        .print-label {
            border: 1px solid #000;
            padding: 1px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 10px;
            margin-right: 4px;
        }

        .print-desc {
            font-size: 12px;
            line-height: 1.5;
            color: black;
            text-align: justify;
        }

        .print-desc img {
            max-width: 100%;
            filter: grayscale(100%); 
        }
        
        .print-desc h1 { font-size: 14px; border-bottom: 1px solid #eee; }
        .print-desc h2 { font-size: 13px; font-weight: bold; }
        .print-desc blockquote { border-left: 3px solid #000; padding-left: 10px; margin-left: 0; font-style: italic; }

        @media print {
            body { background-color: white !important; margin: 0; padding: 0; overflow: visible !important; }
            .container, #config-section, #preview-section, header { display: none !important; }
            #print-view { display: block !important; padding: 0 !important; margin: 0 !important; width: 100%; max-width: none; min-height: 0 !important; }
            .print-controls { display: none !important; }
            summary:after { display: none; } /* Hide toggle in print */
            details { border: none !important; margin-bottom: 30px; }
            summary { background: none !important; padding: 0 !important; border-bottom: 2px solid #000 !important; font-size: 20px !important; margin-bottom: 15px !important; }
            .print-card { border-bottom: 1px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
            a { text-decoration: none; color: black !important; }
        }
    </style>
    `;

    var contentHtml = printStyles + `
    <div class="print-controls no-print">
        <button onclick="closePrintView()" class="btn btn-secondary" style="background: #eee; color: #333; border: 1px solid #ccc;">← Voltar</button>
        <button onclick="window.print()" class="btn btn-primary" style="background: #000; color: #fff; border: none;">🖨️ Imprimir</button>
    </div>
    
    <div class="doc-title">Relatório de Exportação</div>
    <div class="doc-meta">Gerado em ${new Date().toLocaleString()} | Total: ${exportData.length} cartões</div>
    `;

    // Render Groups
    Object.keys(groupedData).forEach(function (listName) {
        var items = groupedData[listName];
        var icon = getCategoryIcon(listName);

        contentHtml += `
        <details open>
            <summary>${icon} &nbsp; ${listName} (${items.length})</summary>
            <div class="category-content">`;

        items.forEach(function (row) {
            // Parse emojis
            var safeName = parseEmojis(row['Nome'] || 'Sem Nome');
            var safeDesc = parseEmojis(row['Descrição'] || '');
            var descHtml = safeDesc ? (typeof marked !== 'undefined' ? marked.parse(safeDesc) : safeDesc) : '<span style="color:#999; font-style:italic">Sem descrição</span>';

            contentHtml += `
                <div class="print-card">
                    <h2>${safeName}</h2>
                    
                    <div class="print-meta-row">
                        ${row['Membros'] ? `<span>👤 ${row['Membros']}</span>` : ''}
                        ${row['Entrega'] ? `<span>📅 ${row['Entrega']}</span>` : ''}
                    </div>

                    ${row['Etiquetas'] ? `
                    <div style="margin-bottom: 8px;">
                        ${row['Etiquetas'].split(', ').map(l => `<span class="print-label">${l}</span>`).join(' ')}
                    </div>` : ''}

                    <div class="print-desc">
                        ${descHtml}
                    </div>
                </div>`;
        });

        contentHtml += `
            </div>
        </details>`;
    });

    printView.innerHTML = contentHtml;

    document.body.style.backgroundColor = 'white';
    document.body.style.color = 'black';

    t.sizeTo(document.body);
};

window.closePrintView = function () {
    var printView = document.getElementById('print-view');
    var previewSection = document.getElementById('preview-section');

    printView.classList.add('hidden');
    printView.innerHTML = ''; // Clear memory
    previewSection.classList.remove('hidden');

    t.sizeTo(document.body);
};
