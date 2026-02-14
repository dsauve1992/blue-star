CREATE TABLE IF NOT EXISTS monitoring_alert_log (
    market_date DATE NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_date, ticker, type)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alert_log_market_date ON monitoring_alert_log(market_date);
CREATE INDEX IF NOT EXISTS idx_monitoring_alert_log_type ON monitoring_alert_log(type);
