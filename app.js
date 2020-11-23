'use strict';

const YchApp = require('./legrand-homey/YchApp');

class YchControl extends YchApp {

  onInit() {
    this.startupOperations();
    this.log('Legrand Home + Control API integration for Homey is running...');
  }

}

module.exports = YchControl;