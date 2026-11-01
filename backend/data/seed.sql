-- Fictional hotel for development and demo. All data is invented.
INSERT OR IGNORE INTO hotels (id, name, sms_number, whatsapp_number)
VALUES (1, 'Hotel Nordlys', NULL, NULL); -- numbers set when Twilio is configured

INSERT OR IGNORE INTO hotel_info (hotel_id, key, text, approved_by) VALUES
(1, 'reception_hours', 'The reception is staffed from 07:00 to 22:00 every day.', 'seed'),
(1, 'late_arrival', 'Guests arriving after 22:00 can check in with the key box at the main entrance. The code is sent by SMS on the day of arrival to the phone number on the booking.', 'seed'),
(1, 'night_bell', 'A night bell at the main entrance connects to the on-call staff member in case of problems with the key box.', 'seed'),
(1, 'pets', 'Dogs are welcome in selected rooms for DKK 150 per night. Please tell us in advance so we can assign a pet-friendly room.', 'seed'),
(1, 'parking', 'Parking is available in the courtyard for DKK 200 per day. The gate opens with the same code as the key box.', 'seed'),
(1, 'breakfast', 'Breakfast is served from 07:00 to 10:30 on weekdays and 07:30 to 11:00 on weekends.', 'seed'),
(1, 'checkout', 'Check-out is at 11:00. Keys can be left in the box at the reception if it is closed.', 'seed'),
(1, 'transport', 'The hotel is a 5-minute walk from the nearest metro station. Taxis can be ordered by phone at any time.', 'seed');

-- Staff user is created in phase 2 with a hashed password (never plaintext in seed).
