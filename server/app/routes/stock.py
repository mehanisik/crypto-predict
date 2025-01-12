from flask import Blueprint, jsonify, request
from app.services.stock_service import train_model
from uuid import uuid4
from threading import Thread

stock_blueprint = Blueprint("api", __name__)





@stock_blueprint.route("/start-model", methods=["POST"])
def start_model():
    data = request.get_json()
    required_fields = ["ticker_symbol", "start_date", "end_date"]

    # Validate request payload
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    # Generate Task ID and start model training
    task_id = str(uuid4())

    # Start model training in a separate thread
    Thread(target=train_model, args=(task_id, data)).start()

    return jsonify({"task_id": task_id, "status": "started"}), 200


@stock_blueprint.route("/task-status/<task_id>", methods=["GET"])
def get_task_status(task_id):
    # Check task status
    # Implement logic to fetch the task state
    return jsonify({"task_id": task_id, "status": "running"})
