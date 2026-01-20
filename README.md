# Trello Export Power-Up

Este é um Power-Up simples para o Trello que permite exportar dados de quadros e colunas com facilidade.

## Funcionalidades
- Exportar Quadro inteiro ou Coluna específica.
- Selecionar quais campos incluir (Nome, Descrição, Membros, etc).
- Pré-visualização dos dados em tabela.
- Download em CSV e JSON.

## Instalação (Desenvolvimento/Local)

1. **Hospedagem**:
   Você precisa hospedar estes arquivos em um servidor HTTPS.
   - Opção Simples: Use o GitHub Pages.
   - Opção Local: Use um servidor local (como "Live Server" do VS Code) e use o `ngrok` para criar um túnel HTTPS.

2. **Registrar no Trello**:
   - Vá para [Trello Power-Ups Admin](https://trello.com/power-ups/admin).
   - Clique em "New Power-Up".
   - Preencha o nome (ex: "Exportador da Empresa").
   - Em **Iframe Connector URL**, coloque a URL onde está o ficheiro `index.html` (ex: `https://seu-site.com/index.html`).
   - Salve.

3. **Ativar no Quadro**:
   - Vá para o quadro Trello desejado.
   - Abra o menu "Power-Ups" -> "Adicionar Power-Up".
   - Clique em "Custom" (Personalizados) e ative o seu Power-Up.

4. **Usar**:
   - Um botão "Exportar Quadro" aparecerá no cabeçalho do quadro.

## Tecnologias
- HTML5, CSS3, Vanilla JavaScript.
- Sem dependências de NPM ou Node.js.
