'use strict';

const Homey = require('homey');
const LegrandDevices = require('../../legrand-homey/LegrandDevices');

class WiredPilotDevice extends Homey.Device {
  onInit() {
    LegrandDevices.onInitLegrand(this);

    //CODE POUR LES FLOWS
    this._flowConditionOnmodeX = this.homey.flow.getConditionCard("onmode_x");
    this._flowActionStartFrost = this.homey.flow.getActionCard("start_frost");
    this._flowActionStartEco = this.homey.flow.getActionCard("start_eco");
    this._flowActionStartComfort = this.homey.flow.getActionCard("start_comfort");

    this._flowConditionOnmodeX.registerRunListener(async (args) => {
      if (args.state === "frost"){
        return this.getCapabilityValue("wiredpilot_mode") === "off";
      }
      else if (args.state === "comfort"){
        return this.getCapabilityValue("wiredpilot_mode") === "heat";
      }
      else if (args.state === "eco"){
        return this.getCapabilityValue("wiredpilot_mode") === "cool";
      }
      return false;
    })

    this._flowActionStartComfort.registerRunListener(async args=> {
      await LegrandDevices.onCapabilityChange(this, {"wiredpilot_mode": "heat"});
    })
    this._flowActionStartEco.registerRunListener(async args=> {
      await LegrandDevices.onCapabilityChange(this, {"wiredpilot_mode": "cool"});
    })
    this._flowActionStartFrost.registerRunListener(async args=> {
      await LegrandDevices.onCapabilityChange(this, {"wiredpilot_mode": "off"});
    })

  }

  onAdded() {
    super.onAdded();
    LegrandDevices.onAddedSync(this);
  }

}

module.exports = WiredPilotDevice;
