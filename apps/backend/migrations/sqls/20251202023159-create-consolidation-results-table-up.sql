-- Create consolidation_results table
CREATE TABLE IF NOT EXISTS consolidation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('daily', 'weekly')),
    analysis_date DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(timeframe, analysis_date, symbol)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consolidation_results_timeframe ON consolidation_results(timeframe);
CREATE INDEX IF NOT EXISTS idx_consolidation_results_analysis_date ON consolidation_results(analysis_date);
CREATE INDEX IF NOT EXISTS idx_consolidation_results_symbol ON consolidation_results(symbol);
CREATE INDEX IF NOT EXISTS idx_consolidation_results_timeframe_date ON consolidation_results(timeframe, analysis_date DESC);

-- Create consolidation_runs table to track when analyses were run
CREATE TABLE IF NOT EXISTS consolidation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('daily', 'weekly')),
    analysis_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(timeframe, analysis_date)
);

-- Create indexes for consolidation_runs
CREATE INDEX IF NOT EXISTS idx_consolidation_runs_timeframe ON consolidation_runs(timeframe);
CREATE INDEX IF NOT EXISTS idx_consolidation_runs_analysis_date ON consolidation_runs(analysis_date);
CREATE INDEX IF NOT EXISTS idx_consolidation_runs_status ON consolidation_runs(status);
CREATE INDEX IF NOT EXISTS idx_consolidation_runs_timeframe_date ON consolidation_runs(timeframe, analysis_date DESC);
