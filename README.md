# Real Estate PDF Analyzer

A powerful tool that uses MinerU to extract real estate data from PDF listings automatically.

## Features

- **Advanced PDF Processing**: Uses MinerU for superior text extraction and layout analysis
- **Real Estate Data Extraction**: Automatically extracts prices, square footage, bedrooms, bathrooms, MLS numbers, and addresses
- **Modern Web Interface**: Clean, responsive Next.js frontend
- **Fast Processing**: Efficient Python backend with FastAPI

## Quick Start

1. **Install Dependencies** (already done):
   ```bash
   # Python dependencies are in mineru-env/
   # Frontend dependencies are in frontend/
   ```

2. **Set up Environment** (optional):
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key if needed
   ```

3. **Start the Application**:
   ```bash
   ./start.sh
   ```

4. **Open in Browser**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## How It Works

1. **Upload PDF**: Select a real estate listing PDF
2. **MinerU Processing**: Converts PDF to structured markdown using advanced AI models
3. **Data Extraction**: Automatically extracts key real estate information
4. **View Results**: See extracted data and full markdown content

## Technology Stack

- **Backend**: Python + FastAPI + MinerU
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **PDF Processing**: MinerU with LayoutLMv3 and PaddleOCR
- **Data Extraction**: Regex patterns for real estate data

## API Endpoints

- `POST /analyze-pdf` - Analyze a PDF file
- `GET /health` - Health check

## Development

### Backend Development
```bash
cd /Users/kacper/Downloads/real-estate-analyzer
source mineru-env/bin/activate
python pdf_service.py
```

### Frontend Development
```bash
cd frontend
npm run dev
```

## Requirements

- Python 3.9+
- Node.js 18+
- MinerU (already installed)

## Troubleshooting

If you encounter issues:
1. Make sure all dependencies are installed
2. Check that ports 3000 and 8000 are available
3. Verify MinerU is working: `python -c "import mineru; print('OK')"`
