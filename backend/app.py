from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage
from werkzeug.security import generate_password_hash, check_password_hash
import random
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from flask_socketio import SocketIO

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Database Connection Setup ---
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None
    
# --- Background Task: Auto Cancel 30-min Expired Bookings ---
def auto_clear_expired_bookings():
    conn = get_db_connection()
    if not conn:
        return
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT booking_id, slot_id 
            FROM Bookings 
            WHERE booking_status = 'Active' 
            AND TIMESTAMPDIFF(MINUTE, booking_time, NOW()) >= (30 + COALESCE(extended_time_mins, 0))
        """)
        expired_bookings = cursor.fetchall()
        
        for booking in expired_bookings:
            cursor.execute("UPDATE Bookings SET booking_status = 'Expired' WHERE booking_id = %s", (booking['booking_id'],))
            cursor.execute("UPDATE Parking_Slots SET db_status = 'Available' WHERE slot_id = %s", (booking['slot_id'],))
        
        conn.commit()
        if expired_bookings:
            print(f"🔥 Auto-cleared {len(expired_bookings)} expired bookings!")
            # 🔥 Trigger live update for background expiration
            socketio.emit('live_update', {'message': 'Expired bookings cleared!'})
            
    except Exception as e:
        conn.rollback()
        print("Error in auto_clear_expired_bookings:", e)
    finally:
        cursor.close()
        conn.close()
        
# Email Anuppum Function
def send_alert_email(slot_name):
    sender_email = os.getenv('EMAIL_USER')
    sender_password = os.getenv('EMAIL_PASS')
    receiver_email = sender_email 

    if not sender_email or not sender_password:
        print("Email details missing in .env")
        return

    msg = EmailMessage()
    msg.set_content(f"URGENT: Unauthorized parking detected at {slot_name}!\nSomeone parked without booking.")
    msg['Subject'] = f"Security Alert: Smart Parking ({slot_name})"
    msg['From'] = sender_email
    msg['To'] = receiver_email

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully for {slot_name}!")
    except Exception as e:
        print(f"Error sending email: {e}")

# --- API 1: Get All Parking Slots ---
@app.route('/api/slots', methods=['GET'])
def get_slots():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True) 
    try:
        cursor.execute("SELECT slot_id, slot_name, db_status, sensor_status FROM Parking_Slots")
        slots = cursor.fetchall()
        return jsonify({"status": "success", "data": slots}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API 2: Book a Slot ---
@app.route('/api/book', methods=['POST'])
def book_slot():
    data = request.json
    user_id = data.get('user_id')
    slot_id = data.get('slot_id')

    if not user_id or not slot_id:
        return jsonify({"error": "user_id and slot_id are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()
        cursor.execute("SELECT * FROM Parking_Slots WHERE slot_id = %s AND db_status = 'Available' FOR UPDATE", (slot_id,))
        slot = cursor.fetchone()

        if not slot:
            conn.rollback() 
            return jsonify({"error": "Sorry, Slot is already booked or not available"}), 400

        cursor.execute("UPDATE Parking_Slots SET db_status = 'Booked' WHERE slot_id = %s", (slot_id,))
        cursor.execute("INSERT INTO Bookings (user_id, slot_id, booking_status) VALUES (%s, %s, 'Active')", (user_id, slot_id))
        conn.commit()

        # 🔥 Trigger live update for new booking
        socketio.emit('live_update', {'message': 'New slot booked!'})

        return jsonify({"status": "success", "message": f"Slot successfully booked!"}), 200
    except Exception as e:
        conn.rollback() 
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API 3: Extend Parking Time ---
@app.route('/api/extend-time', methods=['POST'])
def extend_time():
    data = request.json
    booking_id = data.get('booking_id')
    extra_mins = data.get('extra_mins')

    if not booking_id or not extra_mins:
        return jsonify({"error": "booking_id and extra_mins are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("UPDATE Bookings SET extended_time_mins = extended_time_mins + %s WHERE booking_id = %s AND booking_status = 'Active'", (extra_mins, booking_id))
        if cursor.rowcount == 0:
            return jsonify({"error": "Active booking not found"}), 404
        conn.commit()
        
        socketio.emit('live_update', {'message': 'Parking time extended!'})
        return jsonify({"status": "success", "message": f"Successfully added {extra_mins} mins"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()        

# --- API 4: Update Hardware Sensor Status (WITH AUTO-CHECKOUT) ---
@app.route('/api/hardware/sensor', methods=['POST'])
def update_sensor():
    data = request.json
    slot_id = data.get('slot_id')
    sensor_status = data.get('sensor_status')

    if slot_id is None or sensor_status is None:
        return jsonify({"error": "slot_id and sensor_status are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT slot_name, db_status, sensor_status FROM Parking_Slots WHERE slot_id = %s", (slot_id,))
        slot_data = cursor.fetchone()

        if not slot_data:
            return jsonify({"error": "Invalid slot_id"}), 404

        old_sensor_status = slot_data['sensor_status']
        db_status = slot_data['db_status']
        slot_name = slot_data['slot_name']

        cursor.execute("UPDATE Parking_Slots SET sensor_status = %s WHERE slot_id = %s", (sensor_status, slot_id))
        
        if sensor_status == 1 and db_status == 'Available':
            send_alert_email(slot_name)
            
        elif old_sensor_status == 1 and sensor_status == 0 and db_status == 'Booked':
            cursor.execute("UPDATE Bookings SET booking_status = 'Completed' WHERE slot_id = %s AND booking_status = 'Active'", (slot_id,))
            cursor.execute("UPDATE Parking_Slots SET db_status = 'Available' WHERE slot_id = %s", (slot_id,))
            print(f"✅ Auto-Checkout Successful for {slot_name}! Slot is now Available.")

        conn.commit()
        
        # 🔥 Trigger live update for hardware state change
        socketio.emit('live_update', {'message': 'Sensor state changed!'})
        
        return jsonify({"status": "success", "message": "Sensor logic executed successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API 5: Trick B (Unauthorized Parking Alert) ---
@app.route('/api/alerts/unauthorized', methods=['GET'])
def get_unauthorized_alerts():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT slot_id, slot_name FROM Parking_Slots WHERE db_status = 'Available' AND sensor_status = 1")
        violations = cursor.fetchall()
        return jsonify({"status": "success", "violation_count": len(violations), "violations": violations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()        

# --- API 6: User Registration (Sign Up) ---
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone_number')
    vehicle = data.get('vehicle_number')
    password = data.get('password')

    if not all([name, email, phone, vehicle, password]):
        return jsonify({"error": "All fields are required!"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already registered! Please login."}), 409

        hashed_password = generate_password_hash(password)
        cursor.execute("""
            INSERT INTO Users (name, email, phone_number, vehicle_number, password_hash) 
            VALUES (%s, %s, %s, %s, %s)
        """, (name, email, phone, vehicle, hashed_password))
        
        conn.commit()
        return jsonify({"status": "success", "message": "User registered successfully!"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API 7: User Login ---
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required!"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                "status": "success",
                "message": "Login successful!",
                "user": {
                    "user_id": user['user_id'],
                    "name": user['name'],
                    "email": user['email'],
                    "role": user.get('role', 'user')
                }
            }), 200
        else:
            return jsonify({"error": "Invalid email or password. Please try again."}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Helper Function: Send OTP via Email ---
def send_otp_email(receiver_email, otp_code):
    sender_email = os.getenv('EMAIL_USER')
    sender_password = os.getenv('EMAIL_PASS')

    if not sender_email or not sender_password:
        print("Email credentials missing in .env")
        return False

    msg = EmailMessage()
    msg.set_content(f"Hello VIP,\n\nYour Login OTP for Grand Cinemas Smart Parking is: {otp_code}\n\nThis code is valid for 5 minutes. Do not share it with anyone.")
    msg['Subject'] = "Your VIP Parking Login OTP"
    msg['From'] = sender_email
    msg['To'] = receiver_email

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending OTP email: {e}")
        return False

# --- API 8: Request OTP ---
@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
        if not cursor.fetchone():
            return jsonify({"error": "Email not found! Please sign up first."}), 404

        otp = str(random.randint(100000, 999999))

        cursor.execute("""
            UPDATE Users 
            SET otp_code = %s, otp_expiry = DATE_ADD(NOW(), INTERVAL 5 MINUTE) 
            WHERE email = %s
        """, (otp, email))
        conn.commit()

        if send_otp_email(email, otp):
            return jsonify({"status": "success", "message": "OTP sent successfully to your email!"}), 200
        else:
            return jsonify({"error": "Failed to send OTP email. Try again later."}), 500

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API 9: Verify OTP & Login ---
@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM Users 
            WHERE email = %s AND otp_code = %s AND otp_expiry > NOW()
        """, (email, otp))
        user = cursor.fetchone()

        if user:
            cursor.execute("UPDATE Users SET otp_code = NULL, otp_expiry = NULL WHERE email = %s", (email,))
            conn.commit()
            return jsonify({
                "status": "success",
                "message": "OTP Verified! Login successful.",
                "user": {
                    "user_id": user['user_id'],
                    "name": user['name'],
                    "email": user['email'],
                    "role": user.get('role', 'user')
                }
            }), 200
        else:
            return jsonify({"error": "Invalid OTP or OTP has expired."}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()      

# --- API 10: Get User's Bookings ---
@app.route('/api/my-bookings/<int:user_id>', methods=['GET'])
def get_my_bookings(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT b.booking_id, b.slot_id, b.booking_status, b.extended_time_mins, p.slot_name 
            FROM Bookings b
            JOIN Parking_Slots p ON b.slot_id = p.slot_id
            WHERE b.user_id = %s
            ORDER BY b.booking_id DESC
        """, (user_id,))
        bookings = cursor.fetchall()
        return jsonify({"status": "success", "data": bookings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()       

# --- API 11: Dispute & Re-route (Fully Corrected) ---
@app.route('/api/bookings/dispute', methods=['POST'])
def handle_dispute():
    data = request.json
    booking_id = data.get('booking_id')

    if not booking_id:
        return jsonify({"error": "booking_id is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT slot_id FROM Bookings WHERE booking_id = %s", (booking_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"status": "error", "message": "Booking not found!"}), 404
            
        old_slot_id = result['slot_id']
        cursor.execute("UPDATE Parking_Slots SET db_status = 'Disputed' WHERE slot_id = %s", (old_slot_id,))
        
        cursor.execute("SELECT slot_id, slot_name FROM Parking_Slots WHERE db_status = 'Available' AND sensor_status = 0 LIMIT 1")
        new_slot = cursor.fetchone()
        
        if new_slot:
            new_slot_id = new_slot['slot_id']
            new_slot_name = new_slot['slot_name']
            
            cursor.execute("UPDATE Bookings SET slot_id = %s WHERE booking_id = %s", (new_slot_id, booking_id))
            cursor.execute("UPDATE Parking_Slots SET db_status = 'Booked' WHERE slot_id = %s", (new_slot_id,))
            
            conn.commit()
            socketio.emit('live_update', {'message': 'Slot disputed and rerouted!'})
            return jsonify({
                "status": "success", 
                "message": f"Slot is disputed. You have been re-routed to {new_slot_name}."
            }), 200
        else:
            conn.commit() 
            socketio.emit('live_update', {'message': 'Slot disputed, full parking!'})
            return jsonify({
                "status": "error", 
                "message": "Sorry, parking is completely full! Security has been alerted."
            }), 404

    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    
# --- Start the Server with Background Scheduler ---
if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=auto_clear_expired_bookings, trigger="interval", minutes=1)
    scheduler.start()

    atexit.register(lambda: scheduler.shutdown())

    socketio.run(app, debug=True, port=5000, use_reloader=False)