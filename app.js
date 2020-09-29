'use strict';

const Util = require('./legrand-homey/YchUtil');

class YchControl extends Util {

  onInit() {
    this.startupOperations();
    this.log('Legrand Home + Control API integration for Homey is running...');
  }

}

module.exports = YchControl;