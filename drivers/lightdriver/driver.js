'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class LightsDriver extends Homey.Driver {

  onInit() {
    this.driver_type = 'light';
    this.log('Driver has been inited');
  }

  async onPair(session) {
    this.log('Pairing session started');
    await LegrandDriver.onPairLegrand(session, this, Homey);
  }

}

module.exports = LightsDriver;