from flask import Flask, jsonify,request
import mysql.connector
import os
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

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
# Email Anuppum Function
def send_alert_email(slot_name):
    sender_email = os.getenv('EMAIL_USER')
    sender_password = os.getenv('EMAIL_PASS')
    
    # Namma testing-kaga namakke mail anuppikirom (Admin email)
    receiver_email = sender_email 

    if not sender_email or not sender_password:
        print("Email details missing in .env")
        return

    # 1. Create the Email content
    msg = EmailMessage()
    msg.set_content(f"URGENT: Unauthorized parking detected at {slot_name}!\nSomeone parked without booking.")
    msg['Subject'] = f"Security Alert: Smart Parking ({slot_name})"
    msg['From'] = sender_email
    msg['To'] = receiver_email

    try:
        # 2. Connect to Google's Server and Send
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully for {slot_name}!")
    except Exception as e:
        print(f"Error sending email: {e}")

# --- API 1: Get All Parking Slots ---
# What: Fetch all slots from DB
# Why: For frontend to show empty/booked slots
@app.route('/api/slots', methods=['GET'])
def get_slots():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True) # dictionary=True makes result as JSON-like object
    
    try:
        # Simple SQL Query to get all slots
        cursor.execute("SELECT slot_id, slot_name, db_status, sensor_status FROM Parking_Slots")
        slots = cursor.fetchall()
        
        return jsonify({
            "status": "success",
            "data": slots
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
    finally:
        # ALWAYS close the connection!
        cursor.close()
        conn.close()
# --- API 2: Book a Slot (With Row Locking) ---
@app.route('/api/book', methods=['POST'])
def book_slot():
    data = request.json
    user_id = data.get('user_id')
    slot_id = data.get('slot_id')

    # 1. Check if frontend sent the required data
    if not user_id or not slot_id:
        return jsonify({"error": "user_id and slot_id are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        # 2. START TRANSACTION & ROW LOCKING (FOR UPDATE)
        conn.start_transaction()
        cursor.execute("SELECT * FROM Parking_Slots WHERE slot_id = %s AND db_status = 'Available' FOR UPDATE", (slot_id,))
        slot = cursor.fetchone()

        if not slot:
            conn.rollback() 
            return jsonify({"error": "Sorry, Slot is already booked or not available"}), 400

        # 3. Update slot status to 'Booked'
        cursor.execute("UPDATE Parking_Slots SET db_status = 'Booked' WHERE slot_id = %s", (slot_id,))

        # 4. Create a new booking entry
        cursor.execute("INSERT INTO Bookings (user_id, slot_id, booking_status) VALUES (%s, %s, 'Active')", (user_id, slot_id))
        
        # 5. COMMIT (Save changes and release the lock)
        conn.commit()

        return jsonify({"status": "success", "message": f"Slot {slot_id} successfully booked for user {user_id}!"}), 200

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
        # SQL math: Add new minutes to existing minutes
        cursor.execute("""
            UPDATE Bookings 
            SET extended_time_mins = extended_time_mins + %s 
            WHERE booking_id = %s AND booking_status = 'Active'
        """, (extra_mins, booking_id))
        
        # Check if the booking ID was correct and active
        if cursor.rowcount == 0:
            return jsonify({"error": "Active booking not found"}), 404

        conn.commit()
        return jsonify({
            "status": "success", 
            "message": f"Successfully added {extra_mins} mins to booking {booking_id}"
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()        
# --- API 4: Update Hardware Sensor Status ---
@app.route('/api/hardware/sensor', methods=['POST'])
def update_sensor():
    data = request.json
    slot_id = data.get('slot_id')
    sensor_status = data.get('sensor_status')  # 1 = Occupied (Car is there), 0 = Empty

    if slot_id is None or sensor_status is None:
        return jsonify({"error": "slot_id and sensor_status are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        # Update the sensor status in the DB
        cursor.execute("""
            UPDATE Parking_Slots 
            SET sensor_status = %s 
            WHERE slot_id = %s
        """, (sensor_status, slot_id))
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Invalid slot_id"}), 404
        # --- PUTHU CODE: TRICK B EMAIL TRIGGER ---
        if sensor_status == 1:
            # Vandi ninnuruchu, so DB-la booking status enna nu check pandrom
            cursor.execute("SELECT slot_name, db_status FROM Parking_Slots WHERE slot_id = %s", (slot_id,))
            slot_data = cursor.fetchone()
            
            # Vandi irukku, aana DB 'Available' nu sonna..
            if slot_data and slot_data['db_status'] == 'Available':
                send_alert_email(slot_data['slot_name']) # Function-a call pandrom!
        # ------------------------------------------

        
        conn.commit()
        return jsonify({
            "status": "success", 
            "message": f"Hardware for Slot {slot_id} updated sensor to {sensor_status}"
        }), 200

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
        # THE MAGIC QUERY: Book aagala (Available), aana vandi irukku (sensor_status = 1)
        cursor.execute("""
            SELECT slot_id, slot_name 
            FROM Parking_Slots 
            WHERE db_status = 'Available' AND sensor_status = 1
        """)
        
        violations = cursor.fetchall()

        # Evvalo vandi thappa niruthi irukkanga nu count edukkurom
        return jsonify({
            "status": "success",
            "violation_count": len(violations),
            "violations": violations
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()        
# --- Start the Server ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)