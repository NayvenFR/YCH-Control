'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class EnergyMeterDriver extends Homey.Driver {

  onInit() {
    this.driver_type = {"NLPC" : undefined};
    this.driver_class = "energymeter";
    this.log('Driver has been inited');
  }

  async onPair(session) {
    this.log('Pairing session started');
    await LegrandDriver.onPairLegrand(session, this, Homey);
  }

  async onRepair(session, device) {
    this.log('Repairing session started');
    await LegrandDriver.onRepairLegrand(session, device, this, Homey);
  }

}

module.exports = EnergyMeterDriver;