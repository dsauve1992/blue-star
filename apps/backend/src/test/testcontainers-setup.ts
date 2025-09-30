import { PostgreSqlContainer } from '@testcontainers/postgresql';

export class TestcontainersSetup {
  private static container: PostgreSqlContainer | null = null;

  static async startPostgresContainer(): Promise<PostgreSqlContainer | null> {
    if (this.container) {
      return this.container;
    }

    this.container = new PostgreSqlContainer('postgres:18-alpine');

    const startedContainer = await this.container.start();

    // Configure environment variables for DatabaseService
    // The container will be accessible on localhost with the mapped port
    process.env.DB_HOST = startedContainer.getHost();
    process.env.DB_PORT = startedContainer.getPort().toString(); // Testcontainers will map this to a random port
    process.env.DB_USERNAME = startedContainer.getUsername();
    process.env.DB_PASSWORD = startedContainer.getPassword();
    process.env.DB_DATABASE = startedContainer.getDatabase();
    process.env.DB_SSL = 'false';

    return this.container;
  }

  static stopPostgresContainer(): void {
    if (this.container) {
      // The container will be automatically stopped when the process exits
      // or we can set it to null to indicate it's no longer available
      this.container = null;
    }
  }

  static getContainer(): PostgreSqlContainer | null {
    return this.container;
  }
}
