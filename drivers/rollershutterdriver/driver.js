'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class RollerShutterDriver extends Homey.Driver {

  onInit() {
    this.driver_type = {"NLLV":undefined, "NLV":undefined, "NLLM": undefined, "NLVI": undefined, "NBR": undefined, "NBO": undefined, "NBS": undefined};

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

  async onRepair(session, device) {
    this.log('Repairing session started');
    await LegrandDriver.onRepairLegrand(session, device, this, Homey);
  }
}

module.exports = RollerShutterDriver;