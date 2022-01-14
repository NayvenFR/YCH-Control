'use strict';

const Homey = require('homey');
const LegrandDevices = require('../../legrand-homey/LegrandDevices');
const scope = "&scope=read_magellan write_magellan read_bubendorff write_bubendorff";

class SceneDevice extends Homey.Device {

  onInit() {
    this.log('Device init');
    this.log('Name', this.getName());
    this.log('Class', this.getClass());

    this.data = LegrandDevices.getDeviceMap(this);
    //this.log(this.data);

    this.registerMultipleCapabilityListener(this.getCapabilities(), ( capabilityValues) => {
      
      LegrandDevices.runScene(this, this.data).then(res => this.log(res)).catch(err => this.log(err));
    }, 500);

    this.log(this.getName(), 'has been inited');
  }

}

module.exports = SceneDevice;