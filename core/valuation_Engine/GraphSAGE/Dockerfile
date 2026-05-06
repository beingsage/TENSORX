FROM tensorflow/tensorflow:latest-gpu

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir flask flask-cors networkx scikit-learn scipy numpy

# Expose port
EXPOSE 5003

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5003/health || exit 1

# Start Flask app
CMD ["python", "app.py"]
