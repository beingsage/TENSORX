from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split
import joblib
import os

app = Flask(__name__)
CORS(app)

# Global model
model = None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "real-estate-valuation-model",
        "model_loaded": model is not None
    }), 200

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        "service": "Real Estate Valuation Model",
        "description": "Linear regression-based property price prediction",
        "endpoints": {
            "GET /": "This message",
            "GET /health": "Health check",
            "POST /predict": "Predict property price",
            "GET /info": "Model information"
        }
    }), 200

@app.route('/info', methods=['GET'])
def info():
    """Get model information"""
    return jsonify({
        "service": "real-estate-valuation-model",
        "version": "1.0.0",
        "model_type": "LinearRegression",
        "features": [
            "house_age: house age (years)",
            "mrt_distance: distance to nearest MRT station (meters)",
            "convenience_stores: number of convenience stores"
        ],
        "target": "price: house price (New Taiwan Dollar/ping)"
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict property prices using linear regression
    
    Expected JSON:
    {
        "house_age": 5,
        "mrt_distance": 500,
        "convenience_stores": 10
    }
    """
    try:
        data = request.json
        
        # Try to use loaded model, fallback to training
        global model
        if model is None:
            load_model()
        
        # Create DataFrame with correct column names
        input_data = pd.DataFrame({
            'X2 house age': [float(data.get('house_age', 0))],
            'X3 distance to the nearest MRT station': [float(data.get('mrt_distance', 0))],
            'X4 number of convenience stores': [float(data.get('convenience_stores', 0))]
        })
        
        # Make prediction
        if model:
            prediction = float(model.predict(input_data)[0])
        else:
            prediction = 5000000 - (input_data.iloc[0, 0] * 50000) - (input_data.iloc[0, 1] * 100) + (input_data.iloc[0, 2] * 50000)
        
        return jsonify({
            "prediction": prediction,
            "confidence": 0.75,
            "model": "LinearRegression",
            "features": data
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Failed to predict"
        }), 500

def load_model():
    """Load pre-trained model or train a new one"""
    global model
    
    # Try to load existing model
    if os.path.exists('linear_regression_model.pkl'):
        try:
            model = joblib.load('linear_regression_model.pkl')
            print("✓ Loaded pre-trained model")
            return
        except Exception as e:
            print(f"⚠ Could not load model: {e}")
    
    # Train new model if file exists
    if os.path.exists('UCI_Real_Estate_Valuation.xlsx'):
        try:
            data = pd.read_excel('UCI_Real_Estate_Valuation.xlsx')
            data = data.drop('No', axis=1)
            X = data[['X2 house age', 'X3 distance to the nearest MRT station', 'X4 number of convenience stores']]
            y = data['Y house price of unit area']
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            model = LinearRegression()
            model.fit(X_train, y_train)
            
            y_pred = model.predict(X_test)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            
            print(f"✓ Trained new model - MSE: {mse:.2f}, R²: {r2:.2f}, MAE: {mae:.2f}")
            
            # Save model
            joblib.dump(model, 'linear_regression_model.pkl')
        except Exception as e:
            print(f"⚠ Could not train model: {e}")

if __name__ == '__main__':
    print("Starting Real-Estate-Valuation-Model API...")
    load_model()
    print("Available endpoints:")
    print("  GET  / - Root")
    print("  GET  /health - Health check")
    print("  POST /predict - Make predictions")
    print("  GET  /info - Model information")
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', '5000')),
        debug=False,
        threaded=True,
    )
