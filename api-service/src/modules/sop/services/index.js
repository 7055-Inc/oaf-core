/**
 * SOP Services Index
 */

const usersService = require('./users');
const foldersService = require('./folders');
const sopsService = require('./sops');
const layoutService = require('./layout');

module.exports = {
  usersService,
  foldersService,
  sopsService,
  layoutService,
};
