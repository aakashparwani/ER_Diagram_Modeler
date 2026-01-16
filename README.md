# ER Diagram Modeler

A web-based tool to parse, edit, and export Entity-Relationship (ER) diagrams using AI (Claude Vision).

## Features
- **AI-Powered Parsing**: Upload an image of an ER diagram and let Claude Vision extract entities and relationships.
- **Interactive Editor**: Add, edit, or delete entities and relationships manually.
- **Smart Suggestions**: Automatically suggests if a table is a "Fact" or "Dimension" based on its relationships.
- **Export Options**: Export your diagram as JSON, PNG, or SQL.

## Security Warning
> [!IMPORTANT]
> **NEVER** hard-code your API keys in the source code. This project is configured to use `localStorage` for API key management and a local proxy to handle CORS.

## Setup Instructions

### 1. Run the Local Proxy
Since browsers block direct calls to the Anthropic API due to CORS, you must run the included Python proxy server:
```bash
python proxy_server.py
```
The proxy will run on `http://localhost:8001`.

### 2. Configure API Key
1. Open `index.html` in your browser.
2. Click the **Settings** (gear icon) button.
3. Enter your **Anthropic API Key**.
4. Select the desired model (e.g., `claude-3-5-sonnet-20240620`).
5. Click **Save Settings**.

Your API key is stored safely in your browser's `localStorage` and is never sent to any server other than Anthropic (via your local proxy).

## Development
- `main.js`: Main application logic.
- `modules/`: Contains modularized logic for parsing, editing, and exporting.
- `models/`: Data models for Diagrams, Entities, and Relationships.
- `style.css`: Clean, modern UI styles.
