import eventlet
import socketio
from flask import Flask, jsonify
from flask_cors import CORS
from tracker import ZenFlowTracker
import cv2
import threading
import time

sio = socketio.Server(cors_allowed_origins='*')
app = Flask(__name__)
app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app)
CORS(app)

tracker = ZenFlowTracker()

@app.route('/logs')
def get_logs():
    return jsonify({
        "partial": tracker.get_logs(),
        "permanent": tracker.get_permanent_status()
    })

@sio.event
def log_off_permanently(sid, data):
    print("Received Log Off Permanently request")
    tracker.log_off_permanent()
    sio.emit('permanent_status_change', {'status': 'logged_off'})

def background_tracker():
    # Use DirectShow for better compatibility on Windows
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("Warning: Could not open camera with index 0, trying index 1...")
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    
    while cap.isOpened():
        success, image = cap.read()
        if not success:
            time.sleep(0.1)
            continue
            
        old_status = tracker.status
        new_status = tracker.detect_presence(image)
        
        if old_status != new_status:
            sio.emit('status_change', {'status': new_status})
            
        # Optional: Emit "heartbeat" with current status
        # sio.emit('heartbeat', {'status': new_status})
        
        time.sleep(0.1) # Reduce CPU usage
    cap.release()

@sio.event
def connect(sid, environ):
    print('Client connected:', sid)
    sio.emit('status_change', {'status': tracker.status}, room=sid)

if __name__ == '__main__':
    # Start the tracker in a separate thread
    tracker_thread = threading.Thread(target=background_tracker, daemon=True)
    tracker_thread.start()
    
    # Log On Permanently on startup
    tracker.log_on_permanent()
    
    print("ZenFlow Backend Server running on http://localhost:5000")
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)
