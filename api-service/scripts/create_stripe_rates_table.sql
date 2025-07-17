-- Stripe Rates Management Table
-- Stores different Stripe fee rates for different transaction types and time periods

CREATE TABLE stripe_rates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_type VARCHAR(50) NOT NULL,  -- 'standard', 'ach', 'international', 'sepa', etc.
  rate_name VARCHAR(100) NOT NULL, -- 'Standard Card Processing', 'ACH Direct Debit', etc.
  percentage_rate DECIMAL(5,4) NOT NULL,  -- 0.0290 for 2.9%
  fixed_fee DECIMAL(10,2) NOT NULL,  -- 0.30 for 30 cents
  currency VARCHAR(3) DEFAULT 'USD',
  region VARCHAR(10) DEFAULT 'US',  -- 'US', 'EU', 'UK', etc.
  effective_date DATE NOT NULL,
  end_date DATE NULL,  -- NULL means currently active
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,  -- For rate change explanations
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_rate_type_active (rate_type, is_active),
  INDEX idx_effective_date (effective_date),
  INDEX idx_currency_region (currency, region)
);

-- Insert initial standard rate
INSERT INTO stripe_rates (
  rate_type, 
  rate_name, 
  percentage_rate, 
  fixed_fee, 
  currency, 
  region, 
  effective_date, 
  notes
) VALUES (
  'standard',
  'Standard Card Processing',
  0.0290,  -- 2.9%
  0.30,    -- 30 cents
  'USD',
  'US',
  '2025-01-01',
  'Current standard card processing rate'
);

-- Example of how future rates would be added
INSERT INTO stripe_rates (
  rate_type, 
  rate_name, 
  percentage_rate, 
  fixed_fee, 
  currency, 
  region, 
  effective_date, 
  notes
) VALUES (
  'ach',
  'ACH Direct Debit',
  0.0080,  -- 0.8%
  0.00,    -- No fixed fee
  'USD',
  'US',
  '2025-01-01',
  'ACH payment processing rate - much lower than cards'
);

-- Example of a rate change
INSERT INTO stripe_rates (
  rate_type, 
  rate_name, 
  percentage_rate, 
  fixed_fee, 
  currency, 
  region, 
  effective_date, 
  notes
) VALUES (
  'standard',
  'Standard Card Processing',
  0.0275,  -- 2.75% (hypothetical rate decrease)
  0.30,    -- 30 cents
  'USD',
  'US',
  '2025-07-01',
  'Rate decrease effective July 2025'
); 