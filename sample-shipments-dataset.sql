-- ============================================
-- Sample Shipments Dataset (15 rows)
-- Matches Supabase schema and UI structure
-- Base date: 2025-11-25 (today)
-- ============================================

-- Insert 15 sample shipments covering all severities and risk scenarios

-- 1. Critical: Past ETA + Short Timeline + StaleStatus
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1001', '2025-11-20T00:00:00Z', 'China', 'Shanghai', 'USA', 'Los Angeles', '2025-11-23T18:00:00Z', 'Port Loading', 'OceanBlue', 'Std', 'Sea', 'normal', 'west-coast-team', false);

-- 2. High: Past ETA + PortCongestion
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1002', '2025-11-15T00:00:00Z', 'Germany', 'Berlin', 'USA', 'Chicago', '2025-11-22T12:00:00Z', 'Awaiting Port Departure', 'OceanBlue', 'Express', 'Sea', 'normal', 'air-expedite', false);

-- 3. High: CustomsHold + Express
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1003', '2025-11-20T00:00:00Z', 'Germany', 'Berlin', 'USA', 'Chicago', '2025-11-23T12:00:00Z', 'Awaiting Customs', 'SkyBridge', 'Express', 'Air', 'high', 'air-expedite', false);

-- 4. Medium: 1 day past ETA + Short timeline
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_city, dest_country, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1004', '2025-11-20T00:00:00Z', 'USA', 'Newark', 'Canada', 'Toronto', '2025-11-24T20:00:00Z', 'Ready for Dispatch', 'NorthDrive', 'Priority', 'Road', 'normal', 'road-east', false);

-- 5. Low: 1 day past ETA + Long timeline
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1005', '2025-11-10T00:00:00Z', 'India', 'Mumbai', 'UK', 'London', '2025-11-24T06:00:00Z', 'In Transit', 'AeroLink', 'Std', 'Air', 'normal', 'emea-air', false);

-- 6. Minimal: MissedDeparture risk (early stage, close to ETA)
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1006', '2025-11-22T00:00:00Z', 'USA', 'Newark', 'Canada', 'Toronto', '2025-11-26T20:00:00Z', 'Warehouse', 'NorthDrive', 'Priority', 'Road', 'normal', 'road-east', false);

-- 7. High: StaleStatus + LongDwell
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1007', '2025-11-12T00:00:00Z', 'Vietnam', 'Ho Chi Minh', 'USA', 'Houston', '2025-11-28T00:00:00Z', 'Hub Processing', 'BlueWave', 'Std', 'Sea', 'normal', 'gulf-team', false);

-- 8. Medium: HubCongestion
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1008', '2025-11-18T00:00:00Z', 'France', 'Paris', 'USA', 'New York', '2025-11-24T14:00:00Z', 'At Distribution Hub', 'SkyBridge', 'Express', 'Air', 'normal', 'east-coast-team', false);

-- 9. Low: NoPickup
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1009', '2025-11-15T00:00:00Z', 'Japan', 'Tokyo', 'USA', 'Seattle', '2025-11-30T10:00:00Z', 'Awaiting Pickup', 'PacificCarriers', 'Std', 'Sea', 'normal', 'west-coast-team', false);

-- 10. Minimal: Healthy shipment (no delays)
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1010', '2025-11-18T00:00:00Z', 'USA', 'Chicago', 'USA', 'Miami', '2025-11-30T16:00:00Z', 'In Transit', 'NorthDrive', 'Std', 'Road', 'normal', 'domestic-team', false);

-- 11. Critical: Multiple risk factors
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1011', '2025-11-18T00:00:00Z', 'China', 'Shanghai', 'USA', 'Los Angeles', '2025-11-23T18:00:00Z', 'Port Loading', 'OceanBlue', 'Express', 'Sea', 'high', 'west-coast-team', false);

-- 12. High: WeatherAlert (has weather in events)
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1012', '2025-11-10T00:00:00Z', 'USA', 'Miami', 'UK', 'London', '2025-11-20T12:00:00Z', 'In Transit', 'AtlanticShipping', 'Express', 'Sea', 'normal', 'emea-sea', false);

-- 13. Minimal: Future shipment (no risk yet)
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1013', '2025-11-26T00:00:00Z', 'USA', 'New York', 'USA', 'Los Angeles', '2025-11-30T10:00:00Z', 'Order scheduled', 'NorthDrive', 'Priority', 'Road', 'normal', 'domestic-team', false);

-- 14. High: CapacityShortage
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1014', '2025-11-15T00:00:00Z', 'Mexico', 'Mexico City', 'USA', 'Dallas', '2025-11-24T08:00:00Z', 'Warehouse', 'BorderLogistics', 'Std', 'Road', 'normal', 'south-team', false);

-- 15. Low: DocsMissing
INSERT INTO shipments (shipment_id, order_date, origin_country, origin_city, dest_country, dest_city, expected_delivery, current_status, carrier, service_level, mode, priority_level, owner, acknowledged)
VALUES ('LD1015', '2025-11-12T00:00:00Z', 'Brazil', 'São Paulo', 'USA', 'New York', '2025-11-26T14:00:00Z', 'Awaiting Customs', 'SouthAmericaAir', 'Express', 'Air', 'normal', 'east-coast-team', false);

-- ============================================
-- Shipment Events (timeline for each shipment)
-- ============================================

-- LD1001: Critical - Stale + Past ETA
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1001', '2025-11-20T00:00:00Z', 'Order has been successfully created', 'Order received from customer', 'Shanghai'),
  ('LD1001', '2025-11-21T08:00:00Z', 'Package prepared and ready', 'Shipment prepared for loading', 'Shanghai Warehouse'),
  ('LD1001', '2025-11-22T14:00:00Z', 'Port Loading', 'Shipment loaded onto container vessel', 'Shanghai Port');

-- LD1002: High - PortCongestion
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1002', '2025-11-15T00:00:00Z', 'Order has been successfully created', 'Order received', 'Berlin'),
  ('LD1002', '2025-11-16T10:00:00Z', 'Departed from origin', 'Shipment departed', 'Berlin'),
  ('LD1002', '2025-11-20T08:00:00Z', 'Awaiting Port Departure', 'Vessel waiting due to port congestion', 'Hamburg Port');

-- LD1003: High - CustomsHold
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1003', '2025-11-20T00:00:00Z', 'Order has been successfully created', 'Order received', 'Berlin'),
  ('LD1003', '2025-11-21T06:00:00Z', 'Departed from origin', 'Flight departed', 'Berlin Airport'),
  ('LD1003', '2025-11-22T10:00:00Z', 'Awaiting Customs', 'Customs inspection required - documents under review', 'Chicago O''Hare');

-- LD1004: Medium - MissedDeparture
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1004', '2025-11-20T00:00:00Z', 'Order has been successfully created', 'Order received', 'Newark'),
  ('LD1004', '2025-11-21T14:00:00Z', 'Ready for Dispatch', 'Package ready but not yet collected', 'Newark Warehouse');

-- LD1005: Low - 1 day past ETA
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1005', '2025-11-10T00:00:00Z', 'Order has been successfully created', 'Order received', 'Mumbai'),
  ('LD1005', '2025-11-11T08:00:00Z', 'Departed from origin', 'Flight departed', 'Mumbai Airport'),
  ('LD1005', '2025-11-22T16:00:00Z', 'In Transit', 'Shipment en route to destination', 'In Flight');

-- LD1006: Minimal - MissedDeparture risk
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1006', '2025-11-22T00:00:00Z', 'Order has been successfully created', 'Order received', 'Newark'),
  ('LD1006', '2025-11-23T10:00:00Z', 'Warehouse', 'Package in warehouse awaiting processing', 'Newark Warehouse');

-- LD1007: High - StaleStatus + LongDwell
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1007', '2025-11-12T00:00:00Z', 'Order has been successfully created', 'Order received', 'Ho Chi Minh'),
  ('LD1007', '2025-11-14T08:00:00Z', 'Departed from origin', 'Vessel departed', 'Ho Chi Minh Port'),
  ('LD1007', '2025-11-19T14:00:00Z', 'Hub Processing', 'Shipment at distribution hub', 'Singapore Hub');

-- LD1008: Medium - HubCongestion
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1008', '2025-11-18T00:00:00Z', 'Order has been successfully created', 'Order received', 'Paris'),
  ('LD1008', '2025-11-19T08:00:00Z', 'Departed from origin', 'Flight departed', 'Paris CDG'),
  ('LD1008', '2025-11-20T16:00:00Z', 'At Distribution Hub', 'Delayed due to hub congestion', 'JFK Airport Hub');

-- LD1009: Low - NoPickup
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1009', '2025-11-15T00:00:00Z', 'Order has been successfully created', 'Order received', 'Tokyo'),
  ('LD1009', '2025-11-20T10:00:00Z', 'Arrived at destination port', 'Vessel arrived', 'Seattle Port'),
  ('LD1009', '2025-11-23T08:00:00Z', 'Awaiting Pickup', 'Package ready for pickup - awaiting carrier', 'Seattle Warehouse');

-- LD1010: Minimal - Healthy
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1010', '2025-11-18T00:00:00Z', 'Order has been successfully created', 'Order received', 'Chicago'),
  ('LD1010', '2025-11-19T08:00:00Z', 'Departed from origin', 'Truck departed', 'Chicago Distribution Center'),
  ('LD1010', '2025-11-24T14:00:00Z', 'In Transit', 'Shipment en route to destination', 'Nashville');

-- LD1011: Critical - Multiple factors
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1011', '2025-11-18T00:00:00Z', 'Order has been successfully created', 'Order received', 'Shanghai'),
  ('LD1011', '2025-11-19T08:00:00Z', 'Package prepared and ready', 'Shipment prepared', 'Shanghai Warehouse'),
  ('LD1011', '2025-11-20T14:00:00Z', 'Port Loading', 'Delayed due to port congestion and capacity shortage', 'Shanghai Port');

-- LD1012: High - WeatherAlert
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1012', '2025-11-10T00:00:00Z', 'Order has been successfully created', 'Order received', 'Miami'),
  ('LD1012', '2025-11-12T08:00:00Z', 'Departed from origin', 'Vessel departed', 'Miami Port'),
  ('LD1012', '2025-11-18T10:00:00Z', 'In Transit', 'Route delayed due to severe weather and storm conditions', 'Mid-Atlantic');

-- LD1013: Minimal - Future shipment
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1013', '2025-11-26T00:00:00Z', 'Order scheduled', 'Order scheduled for future processing', 'New York');

-- LD1014: High - CapacityShortage
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1014', '2025-11-15T00:00:00Z', 'Order has been successfully created', 'Order received', 'Mexico City'),
  ('LD1014', '2025-11-20T10:00:00Z', 'Warehouse', 'Delayed - capacity shortage, warehouse at full capacity', 'Mexico City Warehouse');

-- LD1015: Low - DocsMissing
INSERT INTO shipment_events (shipment_id, event_time, event_stage, description, location)
VALUES 
  ('LD1015', '2025-11-12T00:00:00Z', 'Order has been successfully created', 'Order received', 'São Paulo'),
  ('LD1015', '2025-11-13T08:00:00Z', 'Departed from origin', 'Flight departed', 'São Paulo Airport'),
  ('LD1015', '2025-11-22T14:00:00Z', 'Awaiting Customs', 'Customs hold - missing document. Paperwork required', 'JFK Airport');

