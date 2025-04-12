import pandas as pd
import numpy as np
import yfinance as yf
import pandas_ta as ta
import joblib
import os
import logging
import pathlib
import traceback
import json
import time
import argparse
import sys
from functools import lru_cache
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.model_selection import GridSearchCV, cross_val_score

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("risk_analysis.log"),
        logging.StreamHandler()
    ]
)

# Get the current file's directory
CURRENT_DIR = pathlib.Path(__file__).parent
# Go up one level to backend and then to AI_models
MODELS_DIR = CURRENT_DIR.parent / 'AI_models'
def parse_args():
    parser = argparse.ArgumentParser(description='Stock Risk Analysis')
    parser.add_argument('--ticker', type=str, required=True, help='Stock ticker symbol')
    parser.add_argument('--portfolio', type=str, default='[]', help='JSON array of portfolio tickers')
    return parser.parse_args()
def get_model_paths(ticker):
    """Helper function to generate correct model paths"""
    # Create models directory if it doesn't exist
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = MODELS_DIR / f'{ticker}_risk_model.pkl'
    scaler_path = MODELS_DIR / f'{ticker}_scaler.pkl'
    return str(model_path), str(scaler_path)

@lru_cache(maxsize=32)
def get_stock_data(ticker, period='1y', interval='1d'):
    """
    Fetch historical stock data for a given ticker using Yahoo Finance API.
    Dynamically adjusts the period for newly listed stocks if data is unavailable.
    
    Uses LRU cache to improve performance for repeated requests.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)

        # If data is not available for the specified period, try shorter periods
        if hist.empty:
            for fallback_period in ['6mo', '3mo', '1mo']:
                hist = stock.history(period=fallback_period, interval=interval)
                if not hist.empty:
                    logging.info(f"Data found for {ticker} with period '{fallback_period}'.")
                    break

        if hist.empty:
            raise ValueError(f"No data found for ticker: {ticker}")

        return hist

    except yf.shared.exceptions.YFinanceError as yfe:
        logging.error(f"YFinance API error for {ticker}: {yfe}")
        raise ValueError(f"Yahoo Finance API error: {yfe}")
    except Exception as e:
        logging.error(f"Error fetching data for ticker {ticker}: {e}")
        raise ValueError(f"Failed to fetch data for {ticker}: {e}")

def preprocess_data(df):
    """
    Preprocess the stock data by handling missing values and resetting the index.
    """
    try:
        if df.empty:
            raise ValueError("Empty dataframe received for preprocessing.")
            
        if len(df) < 10:  # Ensure enough data points exist
            raise ValueError("Insufficient data available for meaningful analysis.")

        # Make a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Handle missing values
        df.dropna(inplace=True)
        
        # Reset index to have Date as a column
        df.reset_index(inplace=True)
        
        return df
    except Exception as e:
        logging.error(f"Error during preprocessing: {str(e)}")
        raise ValueError(f"Error during preprocessing: {e}")

def add_features(df):
    """
    Add technical indicators as features for the model. Handles missing data appropriately.
    Enhanced with additional technical indicators for better prediction capability.
    """
    try:
        # Make a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Basic features
        df['Daily Return'] = df['Close'].pct_change()
        df['Volatility'] = df['Daily Return'].rolling(window=21).std() * np.sqrt(252)
        df['MA50'] = df['Close'].rolling(window=50).mean()
        df['MA200'] = df['Close'].rolling(window=200).mean()

        # Additional technical indicators using pandas_ta
        df['RSI'] = df.ta.rsi(length=14)
        macd = df.ta.macd(fast=12, slow=26, signal=9)
        df['MACD'] = macd['MACD_12_26_9']
        df['MACD_Signal'] = macd['MACDs_12_26_9']
        df['MACD_Hist'] = macd['MACDh_12_26_9']

        # Bollinger Bands
        bb_bands = df.ta.bbands(close=df['Close'], length=20)
        df['BB_upper'] = bb_bands['BBU_20_2.0']
        df['BB_middle'] = bb_bands['BBM_20_2.0']
        df['BB_lower'] = bb_bands['BBL_20_2.0']
        
        # Price-to-Moving Average Ratios
        df['Price_to_MA50'] = df['Close'] / df['MA50']
        df['Price_to_MA200'] = df['Close'] / df['MA200']
        
        # Rate of change indicators
        df['ROC_5'] = df['Close'].pct_change(periods=5)
        df['ROC_10'] = df['Close'].pct_change(periods=10)
        
        # Average True Range for volatility
        df['ATR'] = df.ta.atr(length=14)
        
        # Volume-based indicators
        df['Volume_ROC'] = df['Volume'].pct_change()
        df['OBV'] = df.ta.obv()
        
        # Stochastic Oscillator
        stoch = df.ta.stoch(high=df['High'], low=df['Low'], close=df['Close'])
        df['Stoch_K'] = stoch['STOCHk_14_3_3']
        df['Stoch_D'] = stoch['STOCHd_14_3_3']

        # Handle missing values after feature addition
        df.dropna(inplace=True)

        return df
    except Exception as e:
        logging.error(f"Error adding features: {str(e)}")
        raise ValueError(f"Error adding features: {e}")

def label_risk(df):
    """
    Label the risk level based on volatility quantiles.
    """
    try:
        # Make a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Ensure no missing values in Volatility
        df = df.dropna(subset=['Volatility'])
        
        # Create risk levels based on volatility quantiles
        quantiles = df['Volatility'].quantile([0.33, 0.66])
        conditions = [
            (df['Volatility'] > quantiles[0.66]),
            (df['Volatility'] <= quantiles[0.66]) & (df['Volatility'] > quantiles[0.33]),
            (df['Volatility'] <= quantiles[0.33])
        ]
        choices = ['High', 'Medium', 'Low']
        df['Risk Level'] = np.select(conditions, choices)
        
        return df
    except Exception as e:
        logging.error(f"Error during risk labeling: {str(e)}")
        raise ValueError(f"Error during labeling: {e}")

def should_retrain_model(model_path):
    """
    Check if model should be retrained based on creation date.
    Returns True if model doesn't exist or is older than 7 days.
    """
    if not os.path.exists(model_path):
        return True
    
    # Retrain if model is older than 7 days
    model_age = time.time() - os.path.getmtime(model_path)
    return model_age > (7 * 24 * 60 * 60)  # 7 days in seconds

def train_and_save_model(ticker, model_path, scaler_path):
    """
    Train a machine learning model for a specific ticker and save the model along with its scaler.
    Enhanced with cross-validation and model metrics storage.
    """
    try:
        # Fetch, preprocess, and add features to the stock data
        data = get_stock_data(ticker)
        data = preprocess_data(data)
        data = add_features(data)
        data = label_risk(data)

        # Select features and target - using expanded feature set
        features = [
            'Daily Return', 'Volatility', 'MA50', 'MA200',
            'RSI', 'MACD', 'MACD_Signal', 'MACD_Hist',
            'BB_upper', 'BB_middle', 'BB_lower',
            'Price_to_MA50', 'Price_to_MA200', 
            'ROC_5', 'ROC_10', 'ATR', 
            'Volume_ROC', 'OBV',
            'Stoch_K', 'Stoch_D'
        ]
        
        # Only use features that exist in the dataframe
        available_features = [f for f in features if f in data.columns]
        
        X = data[available_features].values
        y = data['Risk Level'].values.ravel()

        # Split the dataset
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Define parameters for grid search
        parameters = [{'n_estimators': [100, 300, 700],
                      'max_features': ['sqrt', 'log2'],
                      'criterion': ['gini', 'entropy']}]

        # Perform Grid Search with cross-validation
        grid_search = GridSearchCV(RandomForestClassifier(random_state=42),
                                 parameters,
                                 cv=5,
                                 scoring='accuracy',
                                 n_jobs=-1)
        grid_search.fit(X_train_scaled, y_train)

        # Get the best model
        best_model = grid_search.best_estimator_
        
        # Evaluate the model with stratified k-fold
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        X_scaled = scaler.transform(X)
        cv_scores = cross_val_score(best_model, X_scaled, y, cv=skf, scoring='accuracy')
        
        # Evaluate on test set
        y_pred = best_model.predict(X_test_scaled)
        
        # Save evaluation metrics
        evaluation_results = {
            'cv_accuracy_mean': float(cv_scores.mean()),
            'cv_accuracy_std': float(cv_scores.std()),
            'best_params': grid_search.best_params_,
            'feature_importance': {feature: float(importance) for feature, importance in 
                                  zip(available_features, best_model.feature_importances_)},
            'features_used': available_features
        }
        
        # Save evaluation metrics
        metrics_path = str(MODELS_DIR / f'{ticker}_model_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(evaluation_results, f)

        # Save the best model and scaler
        joblib.dump(best_model, model_path)
        joblib.dump(scaler, scaler_path)
        
        logging.info(f"Model for {ticker} trained and saved with accuracy: {cv_scores.mean():.4f}")
        return best_model, scaler, available_features

    except Exception as e:
        logging.error(f"Error training model for {ticker}: {str(e)}")
        logging.error(traceback.format_exc())
        raise ValueError(f"Error training and saving model for {ticker}: {e}")

def load_model_and_scaler(model_path, scaler_path):
    """
    Load a trained model and its corresponding scaler from disk.
    """
    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        # Load features used during training
        ticker = os.path.basename(model_path).split('_')[0]
        metrics_path = str(MODELS_DIR / f'{ticker}_model_metrics.json')
        
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
            features_used = metrics.get('features_used', None)
        
        return model, scaler, features_used
    except Exception as e:
        logging.error(f"Failed to load model or scaler: {str(e)}")
        raise ValueError(f"Failed to load model or scaler: {e}")

def risk_analysis_model(new_stock_ticker):
    """
    Perform risk analysis on a given stock ticker.
    Returns a comprehensive dictionary of risk metrics and insights.
    """
    try:
        data = get_stock_data(new_stock_ticker)

        # Check if the data is too short for analysis
        if len(data) < 10:
            logging.warning(f"Skipping {new_stock_ticker} due to insufficient data.")
            return {'error': "Insufficient data for analysis."}

        # Proceed with analysis if enough data
        data = preprocess_data(data)
        data = add_features(data)
        data = label_risk(data)

        # Paths for the model and scaler
        model_path, scaler_path = get_model_paths(new_stock_ticker)

        # Load or train the model
        if should_retrain_model(model_path) or not os.path.exists(model_path) or not os.path.exists(scaler_path):
            model, scaler, features_used = train_and_save_model(new_stock_ticker, model_path, scaler_path)
        else:
            model, scaler, features_used = load_model_and_scaler(model_path, scaler_path)

        # If features_used is None, use a default set
        if features_used is None:
            features_used = ['Daily Return', 'Volatility', 'MA50', 'MA200']

        # Ensure all required features are in the dataframe
        missing_features = [f for f in features_used if f not in data.columns]
        if missing_features:
            logging.warning(f"Missing features for {new_stock_ticker}: {missing_features}")
            # Use only available features
            features_used = [f for f in features_used if f in data.columns]

        # Get features for prediction
        latest_data = data[features_used].iloc[-1]

        # Scale the latest data
        latest_data_scaled = scaler.transform(latest_data.values.reshape(1, -1))

        # Make prediction
        risk_level = model.predict(latest_data_scaled)[0]
        
        # Get prediction probabilities
        risk_probs = model.predict_proba(latest_data_scaled)[0]
        confidence_score = risk_probs[list(model.classes_).index(risk_level)]

        # Calculate additional insights
        rsi_value = data['RSI'].iloc[-1] if 'RSI' in data.columns else None
        rsi_status = "Unknown"
        if rsi_value is not None:
            if rsi_value > 70:
                rsi_status = "Overbought"
            elif rsi_value < 30:
                rsi_status = "Oversold"
            else:
                rsi_status = "Neutral"
        
        # MACD signal
        macd_value = data['MACD'].iloc[-1] if 'MACD' in data.columns else None
        macd_signal = "Unknown"
        if macd_value is not None:
            macd_signal_value = data['MACD_Signal'].iloc[-1] if 'MACD_Signal' in data.columns else None
            if macd_signal_value is not None:
                macd_signal = "Bullish" if macd_value > macd_signal_value else "Bearish"
            else:
                macd_signal = "Bullish" if macd_value > 0 else "Bearish"
        
        # Price position relative to Moving Averages
        price_position = "Unknown"
        if 'MA50' in data.columns and 'MA200' in data.columns:
            if data['Close'].iloc[-1] > data['MA50'].iloc[-1] and data['Close'].iloc[-1] > data['MA200'].iloc[-1]:
                price_position = "Above both MAs"
            elif data['Close'].iloc[-1] < data['MA50'].iloc[-1] and data['Close'].iloc[-1] < data['MA200'].iloc[-1]:
                price_position = "Below both MAs"
            else:
                price_position = "Between MAs"

        # Bollinger Bands position
        bb_position = "Unknown"
        if all(col in data.columns for col in ['BB_upper', 'BB_lower']):
            if data['Close'].iloc[-1] > data['BB_upper'].iloc[-1]:
                bb_position = "Above upper band"
            elif data['Close'].iloc[-1] < data['BB_lower'].iloc[-1]:
                bb_position = "Below lower band"
            else:
                bb_position = "Within bands"

        # Trend analysis
        trend = "Unknown"
        if 'MA50' in data.columns and 'MA200' in data.columns:
            if data['MA50'].iloc[-1] > data['MA200'].iloc[-1]:
                # Check if we're in a golden cross situation
                if data['MA50'].iloc[-2] <= data['MA200'].iloc[-2]:
                    trend = "Golden Cross (Strongly Bullish)"
                else:
                    trend = "Bullish"
            else:
                # Check if we're in a death cross situation
                if data['MA50'].iloc[-2] >= data['MA200'].iloc[-2]:
                    trend = "Death Cross (Strongly Bearish)"
                else:
                    trend = "Bearish"
        
        # Momentum indicators
        stoch_signal = "Unknown"
        if 'Stoch_K' in data.columns and 'Stoch_D' in data.columns:
            k = data['Stoch_K'].iloc[-1]
            d = data['Stoch_D'].iloc[-1]
            if k > 80 and d > 80:
                stoch_signal = "Strongly Overbought"
            elif k < 20 and d < 20:
                stoch_signal = "Strongly Oversold"
            elif k > d and k < 80:
                stoch_signal = "Rising Momentum"
            elif k < d and k > 20:
                stoch_signal = "Falling Momentum"
            else:
                stoch_signal = "Neutral"

        # Prepare comprehensive results
        results = {
            'risk_level': risk_level,
            'current_price': f"{data['Close'].iloc[-1]:.2f}",
            'volatility': f"{data['Volatility'].iloc[-1] * 100:.2f}%",
            'daily_return': f"{data['Daily Return'].iloc[-1] * 100:.2f}%",
            'latest_close': float(data['Close'].iloc[-1]),
            'trend': trend,
            'rsi_status': rsi_status,
            'rsi_value': f"{rsi_value:.2f}" if rsi_value is not None else "N/A",
            'macd_signal': macd_signal,
            'price_position': price_position,
            'confidence_score': f"{confidence_score:.2f}",
            'bollinger_band_position': bb_position,
            'stochastic_signal': stoch_signal,
            'recommendations': generate_recommendations(data, risk_level, rsi_value, macd_signal, price_position)
        }

        return results

    except Exception as e:
        logging.error(f"Error in risk analysis model for {new_stock_ticker}: {str(e)}")
        logging.error(traceback.format_exc())
        return {'error': str(e)}

def generate_recommendations(data, risk_level, rsi_value, macd_signal, price_position):
    """
    Generate trading recommendations based on technical indicators.
    """
    recommendations = []
    
    # Risk level based recommendations
    if risk_level == "High":
        recommendations.append("High volatility detected. Consider reducing position size.")
    elif risk_level == "Low":
        recommendations.append("Low volatility may indicate consolidation. Watch for breakouts.")
    
    # RSI based recommendations
    if rsi_value is not None:
        if rsi_value > 70:
            recommendations.append("RSI indicates overbought conditions. Consider taking profits.")
        elif rsi_value < 30:
            recommendations.append("RSI indicates oversold conditions. Potential buying opportunity.")
    
    # MACD based recommendations
    if macd_signal == "Bullish":
        recommendations.append("MACD signals bullish momentum. Potential upside ahead.")
    elif macd_signal == "Bearish":
        recommendations.append("MACD signals bearish momentum. Caution advised.")
    
    # Moving average based recommendations
    if price_position == "Above both MAs":
        recommendations.append("Price above key moving averages indicates strength.")
    elif price_position == "Below both MAs":
        recommendations.append("Price below key moving averages suggests caution.")

    # If we have enough data for short-term trend
    if len(data) >= 5:
        recent_trend = data['Close'].iloc[-5:].pct_change().mean() * 100
        if recent_trend > 1:
            recommendations.append(f"Recent uptrend of {recent_trend:.2f}%. Monitor for continuation.")
        elif recent_trend < -1:
            recommendations.append(f"Recent downtrend of {recent_trend:.2f}%. Watch for reversal signals.")
    
    return recommendations

def fetch_risk_results(new_stock_ticker, portfolio):
    """
    Main function to get risk analysis results for a stock.
    Updates portfolio and handles all exceptions gracefully.
    """
    logging.info(f"Performing risk analysis for {new_stock_ticker}")
    
    try:
        # Get paths for model and scaler
        model_path, scaler_path = get_model_paths(new_stock_ticker)

        # Check if we need to retrain
        need_retrain = should_retrain_model(model_path) or new_stock_ticker not in portfolio
        
        # Run the risk analysis
        results = risk_analysis_model(new_stock_ticker)
        
        # Add to portfolio if not already present
        if new_stock_ticker not in portfolio:
            portfolio.append(new_stock_ticker)
        
        # Add a timestamp to the results
        results['analysis_timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        return results
    except Exception as e:
        logging.error(f"Error in fetch_risk_results for {new_stock_ticker}: {str(e)}")
        logging.error(traceback.format_exc())
        return {
            'error': str(e),
            'ticker': new_stock_ticker,
            'analysis_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
if __name__ == "__main__":
    try:
        # Parse command line arguments
        args = parse_args()
        ticker = args.ticker
        
        # Parse portfolio JSON
        try:
            portfolio = json.loads(args.portfolio)
        except json.JSONDecodeError:
            portfolio = []
        
        # Run risk analysis
        results = fetch_risk_results(ticker, portfolio)
        
        # Print results as JSON to stdout
        print(json.dumps(results))
        
        # Exit with success code
        sys.exit(0)
    except Exception as e:
        # Print error as JSON to stdout
        error_result = {
            'error': str(e),
            'ticker': args.ticker if 'args' in locals() else 'unknown',
            'analysis_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        print(json.dumps(error_result))
        
        # Exit with error code
        sys.exit(1)
# if __name__ == "__main__":
#     # Setup logging
#     logging.basicConfig(
#         level=logging.INFO,
#         format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
#         handlers=[
#             logging.FileHandler("risk_analysis.log"),
#             logging.StreamHandler()
#         ]
#     )
#     
#     # Portfolio of stocks
#     portfolio = ['TCS.NS', 'ITC.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'INFY.NS', 
#                  'RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS']
# 
#     new_stock_ticker = 'TCS.NS'
#     results = fetch_risk_results(new_stock_ticker, portfolio)
#     print(results)