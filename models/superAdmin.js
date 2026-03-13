const mongoose = require('mongoose');
const { getDiscriminator } = require('./user');

const superAdminSchema = new mongoose.Schema({});

module.exports = getDiscriminator('super_admin', superAdminSchema);
