'use strict';

const Homey = require('homey');
const LegrandDevices = require('../../legrand-homey/LegrandDevices');


class SocketsDevice extends Homey.Device {

	onInit() {
		LegrandDevices.onInitLegrand(this);
	}
	
}

module.exports = SocketsDevice;