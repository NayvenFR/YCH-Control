'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class WiredPilotDriver extends Homey.Driver {
  onInit() {
    this.driver_class = 'heater';
    this.driver_type = {"NLC": "radiator"}

    this._flowTriggerOnmodeComfort = this.homey.flow.getDeviceTriggerCard('onmode_comfort');
    this._flowTriggerOnmodeEco = this.homey.flow.getDeviceTriggerCard('onmode_eco');
    this._flowTriggerOnmodeFrost = this.homey.flow.getDeviceTriggerCard('onmode_frost');

    this.log('Driver has been inited');
  }

  triggerMyFlow(device, mode){
    this.log(mode);
    if (mode === 'heat'){
      this._flowTriggerOnmodeComfort.trigger(device, {}, {})
          .catch(this.error);
    }
    else if (mode === 'cool'){
      this._flowTriggerOnmodeEco.trigger(device, {}, {})
          .catch(this.error);
    }
    else if (mode === 'off'){
      this._flowTriggerOnmodeFrost.trigger(device, {}, {})
          .catch(this.error);
    }
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

module.exports = WiredPilotDriver;