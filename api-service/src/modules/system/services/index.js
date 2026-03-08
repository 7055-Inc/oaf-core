/**
 * System Services
 * 
 * Re-exports all system service modules
 */

const heroService = require('./hero');
const announcementsService = require('./announcements');
const termsService = require('./terms');
const policiesService = require('./policies');

module.exports = {
  heroService,
  announcementsService,
  termsService,
  policiesService
};
