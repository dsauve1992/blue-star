import { TestContainer } from './database/setupPostgresDbTestContainer';

module.exports = async function () {
  await TestContainer.stop();
};
