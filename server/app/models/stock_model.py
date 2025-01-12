

import yfinance as yf
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from sklearn.metrics import mean_squared_error, r2_score


class StockPredictionModel:
    def __init__(self, ticker_symbol,start_date,end_date, lookback=8, train_ratio=0.8, batch_size=64, epochs=100, learning_rate=0.001):
        """
        Initialize the stock prediction model with key parameters.
        """
        self.ticker_symbol = ticker_symbol
        self.start_date = start_date    
        self.end_date = end_date
        self.lookback = lookback
        self.train_ratio = train_ratio
        self.batch_size = batch_size
        self.epochs = epochs
        self.learning_rate = learning_rate
        
        # Placeholders for data and preprocessing artifacts
        self.data = None
        self.mean = None
        self.std = None
        self.X_train, self.y_train, self.X_test, self.y_test = None, None, None, None
        self.model = None
        self.optimizer = None
        self.loss_fn = tf.keras.losses.MeanAbsoluteError()

    def fetch_data(self):
        """
        Fetch historical stock data from Yahoo Finance.
        """
        print(f"Fetching data for {self.ticker_symbol}...")
        ticker = yf.Ticker(self.ticker_symbol)
        df = ticker.history(start=self.start_date, end=self.end_date)
        self.data = df[['Close']].reset_index()
        print(f"Data fetched. {len(self.data)} rows loaded.")

    def preprocess_data(self):
        """
        Normalize the data and create sliding windows for training/testing.
        """
        print("Preprocessing data...")
        close_prices = self.data['Close'].values
        self.mean = close_prices.mean()
        self.std = close_prices.std()

        normalized_data = (close_prices - self.mean) / self.std
        
        # Create sliding windows
        train_size = int(len(normalized_data) * self.train_ratio)
        self.X_train, self.y_train = self.create_windows(normalized_data[:train_size])
        self.X_test, self.y_test = self.create_windows(normalized_data[train_size:])
        print("Preprocessing complete.")

    def create_windows(self, data):
        """
        Create sliding windows for time-series data.
        """
        X, y = [], []
        for i in range(self.lookback, len(data)):
            X.append(data[i - self.lookback:i])
            y.append(data[i])
        return np.array(X).reshape(-1, self.lookback, 1), np.array(y)

    def build_model(self):
        """
        Define the CNN-LSTM hybrid model architecture.
        """
        print("Building model...")
        self.model = tf.keras.Sequential([
            layers.Conv1D(filters=32, kernel_size=1, activation='tanh', input_shape=(self.lookback, 1)),
            layers.MaxPooling1D(pool_size=1),
            layers.LSTM(64, return_sequences=False),
            layers.Dense(1)
        ])
        self.optimizer = tf.keras.optimizers.Adam(learning_rate=self.learning_rate)
        print("Model built.")

    def train(self, tracker=None):
        """
        Train the model using the training dataset.
        """
        print("Starting training...")
        train_dataset = tf.data.Dataset.from_tensor_slices((self.X_train, self.y_train)).batch(self.batch_size)
        for epoch in range(self.epochs):
            epoch_loss = 0
            for x_batch, y_batch in train_dataset:
                with tf.GradientTape() as tape:
                    predictions = self.model(x_batch, training=True)
                    loss = self.loss_fn(y_batch, predictions)
                gradients = tape.gradient(loss, self.model.trainable_variables)
                self.optimizer.apply_gradients(zip(gradients, self.model.trainable_variables))
                epoch_loss += loss
            epoch_loss /= len(train_dataset)
            #print(f"Epoch {epoch+1}/{self.epochs}, Loss: {epoch_loss:.4f}")
            
            # Update tracker progress if provided
            if tracker:
                tracker.update_training_progress(epoch + 1, self.epochs)

    def test(self):
        """
        Evaluate the model using the test dataset.
        """
        print("Evaluating on test data...")
        test_dataset = tf.data.Dataset.from_tensor_slices((self.X_test, self.y_test)).batch(self.batch_size)
        test_loss = 0
        for x_batch, y_batch in test_dataset:
            predictions = self.model(x_batch, training=False)
            test_loss += self.loss_fn(y_batch, predictions)
        test_loss /= len(test_dataset)
        print(f"Test Loss: {test_loss:.4f}")

    def evaluate(self):
        """
        Calculate evaluation metrics and plot results.
        """
        print("Calculating evaluation metrics...")
        y_test_denorm = self.y_test * self.std + self.mean
        predictions = self.model.predict(self.X_test).flatten()
        predictions_denorm = predictions * self.std + self.mean

        mae = tf.keras.losses.MeanAbsoluteError()(y_test_denorm, predictions_denorm).numpy()
        r2 = r2_score(y_test_denorm, predictions_denorm)
        rmse = np.sqrt(mean_squared_error(y_test_denorm, predictions_denorm))

        print(f"MAE: {mae}")
        print(f"R-squared: {r2}")
        print(f"RMSE: {rmse}")

        # Plot results
        #plt.figure(figsize=(10, 6))
        #plt.plot(range(len(self.y_test)), y_test_denorm, label="Original")
        #plt.plot(range(len(self.y_test)), predictions_denorm, label="Predicted")
        #plt.legend()
        #plt.title("Stock Price Prediction")
        #plt.show()

        return mae, r2, rmse
