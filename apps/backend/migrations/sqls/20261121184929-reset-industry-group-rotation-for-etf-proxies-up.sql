-- Industry-group members moved from ^SP500 subindices to ETF proxies; the
-- derived RRG rows are rebuilt from scratch on the next computation.
DELETE FROM sector_rotation_data_points WHERE universe_id = 'gics-industry-group';
