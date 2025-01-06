from flask import Blueprint

api_bp = Blueprint("api", __name__)

@api_bp.route("/market-overview", methods=["GET"])
def market_overview():
    return {"message": "market overview","status": "success"}

@api_bp.route("/market-data", methods=['GET'])
def market_data():
    return {"message": "market data","status": "success"}
   
@api_bp.route("/start-ml-model", methods=['POST'])
def start_ml_model():
    return {"message": "start ml model","status": "success"}