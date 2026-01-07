import cv2
import time
import json
import os
import sqlite3
from datetime import datetime

class ZenFlowTracker:
    def __init__(self):
        # Using OpenCV Haar Cascades for more stability on Python 3.13
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.status = "Away"
        self.away_start_time = None
        self.db_file = "presence_logs.db"
        self.init_db()
        
    def init_db(self):
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        # Existing Partial logs table
        c.execute('''CREATE TABLE IF NOT EXISTS logs
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      session_date TEXT,
                      log_off_partial TEXT,
                      log_on_partial TEXT,
                      duration_seconds REAL)''')
        
        # New Permanent sessions table
        c.execute('''CREATE TABLE IF NOT EXISTS permanent_sessions
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      date TEXT,
                      log_on_time TEXT,
                      log_off_time TEXT,
                      is_active INTEGER DEFAULT 1)''')
        conn.commit()
        conn.close()

    def log_on_permanent(self):
        date_str = datetime.now().strftime('%Y-%m-%d')
        time_str = datetime.now().isoformat()
        
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        # Close any previous unsaved session for today
        c.execute("UPDATE permanent_sessions SET is_active = 0 WHERE date = ? AND is_active = 1", (date_str,))
        # Start new session
        c.execute("INSERT INTO permanent_sessions (date, log_on_time, is_active) VALUES (?, ?, 1)", (date_str, time_str))
        conn.commit()
        conn.close()
        print(f"Permanent Log On at {time_str}")

    def log_off_permanent(self):
        time_str = datetime.now().isoformat()
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        c.execute("UPDATE permanent_sessions SET log_off_time = ?, is_active = 0 WHERE is_active = 1", (time_str,))
        conn.commit()
        conn.close()
        print(f"Permanent Log Off at {time_str}")

    def get_permanent_status(self):
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM permanent_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
        row = c.fetchone()
        conn.close()
        return dict(row) if row else None

    def detect_presence(self, frame):
        # Convert to grayscale for Haar Cascade
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        present = len(faces) > 0
        current_time = time.time()
        
        if present:
            if self.status == "Away":
                if self.away_start_time:
                    duration = current_time - self.away_start_time
                    if duration > 5:
                        self.log_session(self.away_start_time, current_time, duration)
                self.status = "At Desk"
                self.away_start_time = None
        else:
            if self.status == "At Desk":
                self.status = "Away"
                self.away_start_time = current_time
                
        return self.status

    def log_session(self, start, end, duration):
        session_date = datetime.fromtimestamp(start).strftime('%Y-%m-%d')
        log_off = datetime.fromtimestamp(start).isoformat()
        log_on = datetime.fromtimestamp(end).isoformat()
        
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        c.execute("INSERT INTO logs (session_date, log_off_partial, log_on_partial, duration_seconds) VALUES (?, ?, ?, ?)",
                  (session_date, log_off, log_on, duration))
        conn.commit()
        conn.close()

    def get_logs(self):
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT session_date as date, log_off_partial as start, log_on_partial as end, duration_seconds FROM logs ORDER BY id DESC")
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]

if __name__ == "__main__":
    tracker = ZenFlowTracker()
    cap = cv2.VideoCapture(0)
    
    print("Testing Presence Detection... Press 'q' to quit.")
    while cap.isOpened():
        success, image = cap.read()
        if not success:
            continue
            
        status = tracker.detect_presence(image)
        
        # Display the status on the frame
        cv2.putText(image, f"Status: {status}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0) if status == "At Desk" else (0, 0, 255), 2)
        cv2.imshow('ZenFlow Presence Detection', image)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
