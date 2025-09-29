import { TestContainer } from './config/setupPostgresDbTestContainer';

module.exports = async function () {
  await TestContainer.init();
};
