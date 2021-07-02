'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class EnergyMeterDriver extends Homey.Driver {

  onInit() {
    this.driver_type = 'energymeter';
    this.log('Driver has been inited');
  }

  async onPair(session) {
    this.log('Pairing session started');
    await LegrandDriver.onPairLegrand(session, this, Homey);
  }

}

module.exports = EnergyMeterDriver;