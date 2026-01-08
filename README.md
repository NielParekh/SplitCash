# 💸 SplitCash - Expense & Income Tracker

A modern, dark-mode expense and income tracking application built with Flask and vanilla JavaScript.

## Features

- 📝 **Transaction Management**: Add, edit, and delete income and expenses
- 📊 **Financial Summary**: View total income, expenses, and balance
- 📈 **Visual Analytics**: Four interactive charts for financial insights
  - Income vs Expenses Over Time
  - Expenses by Category (Pie Chart)
  - Monthly Balance Trend
  - Category Spending Over Time
- 🎨 **Dark Mode**: Beautiful dark theme throughout
- 💾 **Persistent Storage**: JSON-based data storage

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application:**
   ```bash
   python app.py
   ```

3. **Open in browser:**
   ```
   http://localhost:5000
   ```

### Docker

**Using Docker Compose (Recommended):**
```bash
docker-compose up -d
```

**Using Docker directly:**
```bash
docker build -t splitcash:latest .
docker run -d -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  splitcash:latest
```

Access at `http://localhost:8000`

## Project Structure

```
SplitCash/
├── app.py              # Flask backend
├── app.js              # Frontend JavaScript
├── index.html          # Main HTML template
├── styles.css          # Dark mode styling
├── requirements.txt    # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
├── data/               # Transaction data (JSON)
└── logs/               # Application logs
```

## API Endpoints

- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `PATCH /api/transactions/<id>` - Update transaction
- `DELETE /api/transactions/<id>` - Delete transaction
- `GET /api/summary` - Get financial summary

## Deployment

### AWS Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for AWS Elastic Beanstalk deployment instructions.

### Docker Deployment
See [DOCKER.md](DOCKER.md) for Docker deployment options including:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js
- **Production Server**: Gunicorn

## License

MIT
