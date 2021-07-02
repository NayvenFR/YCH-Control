'use strict';

const Homey = require('homey');
const LegrandDevices = require('../../legrand-homey/LegrandDevices');

class RollerShutterDevice extends Homey.Device {

  onInit() {
    LegrandDevices.onInitLegrand(this);
    //CODE POUR LES FLOWS

    this._flowActionChangeLevel = this.homey.flow.getActionCard("level");
    this._flowActionChangeLevel.registerRunListener(async (level) => {
      await LegrandDevices.onCapabilityChange(this, {"wiredpilot_level": level});
    })
  }

  onAdded() {
    super.onAdded();
    LegrandDevices.onAddedSync(this);
  }

}

module.exports = RollerShutterDevice;
