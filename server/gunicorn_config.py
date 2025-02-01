import multiprocessing

bind = "0.0.0.0:5000"
workers = 1 
worker_class = "eventlet"
worker_connections = 1000
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50 