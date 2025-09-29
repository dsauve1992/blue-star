import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export class TestContainer {
  private static container: StartedPostgreSqlContainer;

  static async init() {
    this.container = await new PostgreSqlContainer('18-alpine').start();

    global.__dbConfig__ = {
      host: this.container.getHost(),
      port: this.container.getPort(),
      user: this.container.getUsername(),
      password: this.container.getPassword(),
      database: this.container.getDatabase(),
    };
  }

  static async stop() {
    await this.container.stop();
  }
}
