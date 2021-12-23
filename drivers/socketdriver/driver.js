'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class SocketDriver extends Homey.Driver {

	onInit() {
		this.driver_type = {"NLP":"any", "NLPM":"any", "NLPBS": "any","NLPO":"any","NLC":"any" };
		this.driver_class = "socket";
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

module.exports = SocketDriver;