import os
import sys

# Monkey patching for eventlet (must be done before any other imports)
import eventlet
eventlet.monkey_patch()

print("🚀 Starting server...")
print("📦 Importing modules...")

try:
    from app import create_app, socketio
    print("✅ Modules imported successfully")
except Exception as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

print("🔧 Setting up logging...")
try:
    from app.utils.logger import setup_logging, get_logger
    setup_logging()
    logger = get_logger(__name__)
    print("✅ Logging setup complete")
except Exception as e:
    print(f"❌ Logging setup error: {e}")
    sys.exit(1)

print("🏗️ Creating Flask app...")
try:
    app = create_app()
    print("✅ Flask app created successfully")
except Exception as e:
    print(f"❌ Flask app creation error: {e}")
    sys.exit(1)

if __name__ == '__main__':
    print("🚀 Starting server...")
    logger.info("starting_crypto_prediction_api")
    
    try:
        print(f"🌐 Starting on port {os.getenv('PORT', 5000)}...")
        socketio.run(
            app,
            host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', 5000)),
            debug=os.getenv('FLASK_ENV') == 'development'
        )
    except Exception as e:
        print(f"❌ Server startup error: {e}")
        sys.exit(1)
