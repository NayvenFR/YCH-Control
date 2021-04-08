'use strict';

const Homey = require('homey');
const LegrandDevices = require('../../legrand-homey/LegrandDevices');


class SocketDevice extends Homey.Device {

	onInit() {
		LegrandDevices.onInitLegrand(this);
	}

	onAdded() {
		super.onAdded();
		LegrandDevices.onAddedSync(this);
	}

}

module.exports = SocketDevice;