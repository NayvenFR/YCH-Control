'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class RollerShutterDriver extends Homey.Driver {

  onInit() {
    this.driver_type = 'automation';

    this._flowTriggerLevelChanged = this.homey.flow.getDeviceTriggerCard('level_changed');

    this.log('Driver has been inited');
  }

  triggerMyFlow(device, mode){
    this._flowTriggerLevelChanged.triggerMyFlow(device, {})
        .catch(this.error);
  }

  async onPair(session) {
    this.log('Pairing session started');
    await LegrandDriver.onPairLegrand(session, this, Homey);
  }
}

module.exports = RollerShutterDriver;