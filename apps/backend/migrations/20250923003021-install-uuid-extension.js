'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.runSql(require('fs').readFileSync(__dirname + '/sqls/20250923003021-install-uuid-extension-up.sql', 'utf8'));
};

exports.down = function(db) {
  return db.runSql(require('fs').readFileSync(__dirname + '/sqls/20250923003021-install-uuid-extension-down.sql', 'utf8'));
};

exports._meta = {
  "version": 1
};
