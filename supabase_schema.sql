-- ============ SUPABASE TABLE SCHEMA ============
-- Create the table for crop strategies

CREATE TABLE crop_strategies (
    id SERIAL PRIMARY KEY,
    crop VARCHAR(50) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    profit INTEGER NOT NULL,
    regen_score INTEGER NOT NULL CHECK (regen_score BETWEEN 0 AND 100),
    water_usage INTEGER NOT NULL,
    fertilizer_usage INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_crop_strategies_crop ON crop_strategies(crop);
CREATE INDEX idx_crop_strategies_strategy_type ON crop_strategies(strategy_type);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crop_strategies_updated_at
    BEFORE UPDATE ON crop_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO crop_strategies (crop, strategy_type, profit, regen_score, water_usage, fertilizer_usage, risk_level) VALUES
-- Rice
('rice', 'baseline', 41000, 62, 320, 120, 'moderate'),
('rice', 'highInput', 48000, 51, 560, 210, 'high'),
('rice', 'balanced', 45300, 76, 390, 140, 'medium'),
('rice', 'regenerative', 38000, 88, 260, 70, 'low'),
-- Wheat
('wheat', 'baseline', 38000, 58, 290, 100, 'moderate'),
('wheat', 'highInput', 45200, 48, 510, 190, 'high'),
('wheat', 'balanced', 41500, 72, 340, 130, 'medium'),
('wheat', 'regenerative', 34000, 85, 240, 65, 'low'),
-- Maize
('maize', 'baseline', 52000, 50, 380, 150, 'high'),
('maize', 'highInput', 60000, 40, 680, 250, 'high'),
('maize', 'balanced', 56000, 66, 420, 180, 'medium'),
('maize', 'regenerative', 46000, 80, 290, 80, 'low');

-- Verify data
SELECT * FROM crop_strategies ORDER BY crop, profit;