"""
Flask wrapper for House-Price-Estimator
Exposes ensemble predictions via REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
import pickle
import os

app = Flask(__name__)
CORS(app)

# Load pre-trained models
models = {}
try:
    models['random_forest'] = joblib.load('Real-Estate.joblib')
    print("✓ Loaded Random Forest model")
except Exception as e:
    print(f"⚠ Could not load Random Forest: {e}")

# Initialize other models if joblib files available
try:
    with open('gb_model.pkl', 'rb') as f:
        models['gradient_boosting'] = pickle.load(f)
    print("✓ Loaded Gradient Boosting model")
except:
    print("⚠ Gradient Boosting model not found")

try:
    with open('svr_model.pkl', 'rb') as f:
        models['svr'] = pickle.load(f)
    print("✓ Loaded SVR model")
except:
    print("⚠ SVR model not found")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "house-price-estimator",
        "models_loaded": list(models.keys())
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict house prices using ensemble methods
    
    Expected JSON:
    {
        "house_age": 5,
        "mrt_distance": 500,
        "convenience_stores": 10,
        "bedrooms": 3,
        "bathrooms": 2,
        "square_feet": 1500,
        "postal_code": "M5V"
    }
    """
    try:
        data = request.json
        
        # Extract features
        features = np.array([
            data.get('house_age', 0),
            data.get('mrt_distance', 0),
            data.get('convenience_stores', 0),
            data.get('bedrooms', 0),
            data.get('bathrooms', 0),
            data.get('square_feet', 0),
        ]).reshape(1, -1)
        
        predictions = {}
        
        # Get predictions from available models
        if 'random_forest' in models:
            predictions['random_forest'] = float(models['random_forest'].predict(features)[0])
        else:
            predictions['random_forest'] = 0
            
        if 'gradient_boosting' in models:
            predictions['gradient_boosting'] = float(models['gradient_boosting'].predict(features)[0])
        else:
            predictions['gradient_boosting'] = predictions['random_forest']
            
        if 'svr' in models:
            predictions['svr'] = float(models['svr'].predict(features)[0])
        else:
            predictions['svr'] = predictions['random_forest']
        
        # Calculate ensemble (average)
        ensemble_pred = np.mean(list(predictions.values()))
        std_dev = np.std(list(predictions.values()))
        
        return jsonify({
            "predictions": predictions,
            "ensemble": float(ensemble_pred),
            "std": float(std_dev),
            "confidence": min(0.95, 0.7 + (0.25 / (1 + std_dev / ensemble_pred)))
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Failed to predict"
        }), 500


@app.route('/info', methods=['GET'])
def info():
    """Get model information"""
    return jsonify({
        "service": "house-price-estimator",
        "version": "1.0.0",
        "models": {
            "random_forest": "RandomForestRegressor",
            "gradient_boosting": "GradientBoostingRegressor",
            "svr": "Support Vector Regression"
        },
        "features": [
            "house_age",
            "mrt_distance",
            "convenience_stores",
            "bedrooms",
            "bathrooms",
            "square_feet"
        ]
    }), 200


if __name__ == '__main__':
    print("Starting House-Price-Estimator API...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /predict - Make predictions")
    print("  GET  /info - Model information")
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', '5002')),
        debug=False,
        threaded=True,
    )
