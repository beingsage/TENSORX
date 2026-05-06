FROM tensorflow/tensorflow:latest-gpu

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt flask flask-cors

# Copy application
COPY . .

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Start Flask app
CMD ["python", "flask_app.py"]
