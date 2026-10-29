export interface ThemeExtractionSummary {
  refreshed: number;
  skipped: string[];
}

export interface ThemeService {
  extractAndSaveThemes(): Promise<ThemeExtractionSummary>;
}
