import requests

# Endha slot 'Available' nu irukko, andha ID-a inga podunga (e.g., Slot 3)
SLOT_ID = 3  

# Sensor 1 = Vandi nikkudhu nu backend-ku signal anuppurom
data = {
    "slot_id": SLOT_ID,
    "sensor_status": 1 
}

print(f"📡 Sending IoT Signal for Slot {SLOT_ID}...")
response = requests.post('http://127.0.0.1:5000/api/hardware/sensor', json=data)

print("Server Response:", response.json())