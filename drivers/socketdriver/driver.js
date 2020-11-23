'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class SocketDriver extends Homey.Driver {

	onInit() {
		this.driver_type = 'plug';
		this.log('Driver has been inited');
	}

	async onPair(session) {
		this.log('Pairing session started');
		await LegrandDriver.onPairLegrand(session, this, Homey);
	}
}

module.exports = SocketDriver;