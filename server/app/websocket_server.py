import asyncio
import websockets
import threading
from app.blueprints.websocket_routes import handle_websocket
from app.utils.logger import get_logger

logger = get_logger(__name__)

class WebSocketServer:
    def __init__(self, host='0.0.0.0', port=8765):
        self.host = host
        self.port = port
        self.server = None
        self.loop = None
        self.thread = None

    async def start_server(self):
        """Start the WebSocket server."""
        try:
            self.server = await websockets.serve(
                handle_websocket,
                self.host,
                self.port
            )
            logger.info("websocket_server_started", host=self.host, port=self.port)
            await self.server.wait_closed()
        except Exception as e:
            logger.error("websocket_server_error", error=str(e))

    def start(self):
        """Start the WebSocket server in a separate thread."""
        def run_server():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self.start_server())

        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()
        logger.info("websocket_server_thread_started")

    def stop(self):
        """Stop the WebSocket server."""
        if self.server:
            self.server.close()
            if self.loop:
                self.loop.call_soon_threadsafe(self.server.wait_closed)
        logger.info("websocket_server_stopped")

# Global WebSocket server instance
websocket_server = WebSocketServer()

def start_websocket_server():
    """Start the WebSocket server."""
    websocket_server.start()

def stop_websocket_server():
    """Stop the WebSocket server."""
    websocket_server.stop()
