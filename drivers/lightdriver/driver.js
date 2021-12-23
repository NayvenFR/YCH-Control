'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class LightDriver extends Homey.Driver {

  onInit() {
    this.driver_type = {'NLF': undefined, 'NLFN': undefined, 'NLM': undefined, 'NLL': undefined, 'NLPT': undefined, 'NLP': 'light', 'NLPM': 'light', 'NLPBS': 'light',};
    this.driver_class = "light";
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

module.exports = LightDriver;