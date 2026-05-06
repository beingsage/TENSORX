/**
 * PostgreSQL + TimescaleDB Schema for Comprehensive Property Valuation System
 * 
 * Tables:
 * - properties: Core property information
 * - valuations: Valuation snapshots with all 10 adjustments
 * - adjustments: Time-series tracking of individual adjustments
 * - comparables: Market comparable properties
 * - broker_networks: Broker information and activity
 * - climate_data: Environmental risk metrics
 */

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis CASCADE;

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) UNIQUE NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  property_type VARCHAR(50), -- 'residential', 'commercial', 'industrial'
  sub_type VARCHAR(50), -- '1BHK', '2BHK', etc.
  area_sqft INTEGER,
  building_age INTEGER,
  condition_score DECIMAL(3, 1), -- 0-10
  ownership_type VARCHAR(50), -- 'freehold', 'leasehold'
  rera_registration BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_coords CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- Valuations table - main valuation results
CREATE TABLE IF NOT EXISTS valuations (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  valuation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Base valuation
  base_valuation DECIMAL(15, 2) NOT NULL,
  
  -- Individual adjustments (10 ideas)
  rental_arbitrage_amount DECIMAL(12, 2),
  rental_arbitrage_pct DECIMAL(5, 2),
  rental_arbitrage_confidence DECIMAL(3, 2),
  
  transaction_velocity_amount DECIMAL(12, 2),
  transaction_velocity_pct DECIMAL(5, 2),
  transaction_velocity_confidence DECIMAL(3, 2),
  
  demographics_amount DECIMAL(12, 2),
  demographics_pct DECIMAL(5, 2),
  demographics_confidence DECIMAL(3, 2),
  
  mobility_amount DECIMAL(12, 2),
  mobility_pct DECIMAL(5, 2),
  mobility_confidence DECIMAL(3, 2),
  
  sentiment_amount DECIMAL(12, 2),
  sentiment_pct DECIMAL(5, 2),
  sentiment_confidence DECIMAL(3, 2),
  
  climate_risk_amount DECIMAL(12, 2),
  climate_risk_pct DECIMAL(5, 2),
  climate_risk_confidence DECIMAL(3, 2),
  
  zoning_amount DECIMAL(12, 2),
  zoning_pct DECIMAL(5, 2),
  zoning_confidence DECIMAL(3, 2),
  
  competition_amount DECIMAL(12, 2),
  competition_pct DECIMAL(5, 2),
  competition_confidence DECIMAL(3, 2),
  
  infrastructure_amount DECIMAL(12, 2),
  infrastructure_pct DECIMAL(5, 2),
  infrastructure_confidence DECIMAL(3, 2),
  
  blockchain_amount DECIMAL(12, 2),
  blockchain_pct DECIMAL(5, 2),
  blockchain_confidence DECIMAL(3, 2),
  
  -- Final results
  final_valuation DECIMAL(15, 2),
  total_adjustment DECIMAL(12, 2),
  total_confidence DECIMAL(3, 2),
  time_to_sell_days INTEGER,
  overall_risk_score DECIMAL(5, 2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adjustments time-series table (for trending)
CREATE TABLE IF NOT EXISTS valuation_adjustments_ts (
  time TIMESTAMP NOT NULL,
  property_id VARCHAR(50) NOT NULL,
  adjustment_type VARCHAR(50),
  adjustment_value DECIMAL(12, 2),
  confidence DECIMAL(3, 2),
  PRIMARY KEY (time, property_id, adjustment_type)
);

-- Make adjustments_ts a hypertable for TimescaleDB
SELECT create_hypertable('valuation_adjustments_ts', 'time', if_not_exists => TRUE);

-- Comparables table
CREATE TABLE IF NOT EXISTS comparables (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  comparable_address VARCHAR(255) NOT NULL,
  comparable_latitude DECIMAL(10, 8),
  comparable_longitude DECIMAL(11, 8),
  sale_price DECIMAL(15, 2),
  price_per_sqft DECIMAL(8, 2),
  area_sqft INTEGER,
  condition_score DECIMAL(3, 1),
  days_on_market INTEGER,
  distance_km DECIMAL(5, 2),
  sale_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Broker networks table
CREATE TABLE IF NOT EXISTS broker_networks (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  broker_id VARCHAR(50),
  broker_name VARCHAR(100),
  credibility_score DECIMAL(3, 1),
  transaction_count INTEGER,
  avg_ticket_size DECIMAL(15, 2),
  specializations TEXT[], -- Array of specializations
  avg_days_to_close INTEGER,
  reputation_score DECIMAL(3, 1),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Climate and risk data
CREATE TABLE IF NOT EXISTS climate_risk_data (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  measurement_date DATE,
  
  -- Flood risk
  flood_risk_score DECIMAL(3, 1),
  flood_plan_proximity DECIMAL(5, 2),
  historical_flood_events INTEGER,
  
  -- Heat risk
  avg_temp DECIMAL(5, 1),
  extreme_heat_days INTEGER,
  heat_island_effect DECIMAL(3, 1),
  
  -- Air quality
  aqi_value DECIMAL(5, 1),
  pm25 DECIMAL(5, 1),
  pm10 DECIMAL(5, 1),
  
  -- Insurance
  insurance_premium_multiplier DECIMAL(3, 2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sentiment and market data
CREATE TABLE IF NOT EXISTS sentiment_market_data (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  measurement_date DATE,
  
  -- Sentiment
  sentiment_score DECIMAL(4, 2), -- -100 to +100
  sentiment_trend VARCHAR(50), -- 'improving', 'stable', 'deteriorating'
  sentiment_volatility DECIMAL(5, 2),
  
  -- Market momentum
  inquiry_volume INTEGER,
  showing_frequency INTEGER,
  offer_competition INTEGER,
  demand_momentum_score DECIMAL(3, 1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal complexity data
CREATE TABLE IF NOT EXISTS legal_complexity (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  assessment_date DATE,
  
  legal_risk_score DECIMAL(3, 1),
  title_clarity_score DECIMAL(3, 1),
  litigation_risk_flag BOOLEAN,
  active_disputes INTEGER,
  mortgage_status VARCHAR(50), -- 'clear', 'mortgaged', 'multiple_mortgages'
  estimated_resolution_days INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flip potential data
CREATE TABLE IF NOT EXISTS flip_potential (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) NOT NULL REFERENCES properties(property_id),
  assessment_date DATE,
  
  current_condition_score DECIMAL(3, 1),
  estimated_renovation_cost DECIMAL(12, 2),
  estimated_renovation_months INTEGER,
  post_renovation_value DECIMAL(15, 2),
  renovation_upside_pct DECIMAL(5, 2),
  flip_potential_score DECIMAL(3, 1),
  break_even_months INTEGER,
  profit_margin_pct DECIMAL(5, 2),
  expected_roi_pct DECIMAL(5, 2),
  flip_recommendation VARCHAR(50), -- 'strong_buy', 'buy', 'hold', 'avoid'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_valuations_property_date ON valuations(property_id, valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_date ON valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_comparables_property ON comparables(property_id);
CREATE INDEX IF NOT EXISTS idx_broker_networks_property ON broker_networks(property_id);
CREATE INDEX IF NOT EXISTS idx_climate_data_date ON climate_risk_data(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_date ON sentiment_market_data(measurement_date DESC);

-- Views for easy querying
CREATE OR REPLACE VIEW latest_valuations AS
SELECT DISTINCT ON (v.property_id)
  p.property_id,
  p.address,
  p.latitude,
  p.longitude,
  v.base_valuation,
  v.final_valuation,
  v.total_adjustment,
  v.total_confidence,
  v.time_to_sell_days,
  v.overall_risk_score,
  v.valuation_date
FROM valuations v
JOIN properties p ON v.property_id = p.property_id
ORDER BY v.property_id, v.valuation_date DESC;

CREATE OR REPLACE VIEW valuation_trends AS
SELECT 
  property_id,
  DATE_TRUNC('week', valuation_date) as week,
  AVG(final_valuation) as avg_valuation,
  MIN(final_valuation) as min_valuation,
  MAX(final_valuation) as max_valuation,
  COUNT(*) as valuation_count
FROM valuations
GROUP BY property_id, DATE_TRUNC('week', valuation_date)
ORDER BY property_id, week DESC;

-- Stored procedure to get comprehensive property analysis
CREATE OR REPLACE FUNCTION get_property_analysis(p_property_id VARCHAR)
RETURNS TABLE (
  property_id VARCHAR,
  address VARCHAR,
  latest_valuation DECIMAL,
  valuation_confidence DECIMAL,
  risk_score DECIMAL,
  time_to_sell INTEGER,
  broker_count INTEGER,
  avg_comparable_distance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.property_id,
    p.address,
    v.final_valuation,
    v.total_confidence,
    v.overall_risk_score,
    v.time_to_sell_days,
    COUNT(DISTINCT b.broker_id)::INTEGER,
    AVG(c.distance_km)
  FROM properties p
  LEFT JOIN (SELECT DISTINCT ON (property_id) * FROM valuations ORDER BY property_id, valuation_date DESC) v 
    ON p.property_id = v.property_id
  LEFT JOIN broker_networks b ON p.property_id = b.property_id
  LEFT JOIN comparables c ON p.property_id = c.property_id
  WHERE p.property_id = p_property_id
  GROUP BY p.property_id, p.address, v.final_valuation, v.total_confidence, v.overall_risk_score, v.time_to_sell_days;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure to log valuation change
CREATE OR REPLACE FUNCTION log_valuation_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO valuation_adjustments_ts (time, property_id, adjustment_type, adjustment_value, confidence)
  VALUES (NEW.valuation_date, NEW.property_id, 'comprehensive', NEW.final_valuation, NEW.total_confidence);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log valuation changes
DROP TRIGGER IF EXISTS trg_log_valuation_change ON valuations;
CREATE TRIGGER trg_log_valuation_change
AFTER INSERT ON valuations
FOR EACH ROW
EXECUTE FUNCTION log_valuation_change();
