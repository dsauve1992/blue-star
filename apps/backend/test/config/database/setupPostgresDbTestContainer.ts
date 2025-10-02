import { PostgreSqlContainer, StartedPostgreSqlContainer, } from '@testcontainers/postgresql';

export class TestContainer {
  private static container: StartedPostgreSqlContainer;

  static async init() {
    this.container = await new PostgreSqlContainer(
      'postgres:18-alpine',
    ).start();

    process.env.DB_HOST = this.container.getHost();
    process.env.DB_PORT = this.container.getPort().toString();
    process.env.DB_USERNAME = this.container.getUsername();
    process.env.DB_PASSWORD = this.container.getPassword();
    process.env.DB_DATABASE = this.container.getDatabase();
    process.env.DB_SSL = 'true';
  }

  static async stop() {
    await this.container.stop();
  }
}
