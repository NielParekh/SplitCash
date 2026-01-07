# SplitCash

A beautiful and modern expense and income tracking application built with Python Flask REST API and vanilla JavaScript frontend.

## Features

- 💰 Track expenses and income in one place
- 📊 View summary statistics (total income, expenses, and balance)
- ✏️ Add, edit, and delete transactions
- 🏷️ Categorize transactions (optional)
- 📅 Date-based transaction tracking
- 🎨 Modern, responsive UI with gradient design

## Getting Started

### Prerequisites

- Python 3.7+ installed
- pip package manager

### Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Start the Flask backend server:
```bash
python app.py
```

The server will start on `http://localhost:5000`

3. Open `index.html` in your browser, or serve it with a simple HTTP server:
```bash
# Using Python's built-in server
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Usage

- Click "Add Transaction" to record a new expense or income
- View your financial summary at the top of the page
- Edit or delete transactions using the action buttons
- All data is stored locally in a JSON file (`data/transactions.json`)

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions (optional query params: `?type=expense&year=2024&month=01`)
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/<id>` - Update a transaction
- `DELETE /api/transactions/<id>` - Delete a transaction

### Summary
- `GET /api/summary` - Get financial summary (optional query params: `?year=2024&month=01`)

## Tech Stack

- **Python Flask** - REST API backend
- **Vanilla JavaScript** - Frontend
- **JSON File Storage** - Local data persistence
- **HTML/CSS** - Modern, responsive UI

## Project Structure

```
SplitCash/
├── app.py                 # Flask backend server
├── index.html             # Frontend HTML
├── app.js                 # Frontend JavaScript
├── styles.css             # Frontend styles
├── requirements.txt       # Python dependencies
└── data/
    └── transactions.json  # JSON database (auto-created)
```

## License

MIT
