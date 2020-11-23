const LegrandObject = require('./LegrandObject');

class LegrandModule extends LegrandObject {

    constructor(name, id, device, hwType, roomId, plantId) {
        super(name, id);
        this.device = device;
        this.hwType = hwType;
        this.plantId = plantId;
    }

}

module.exports = LegrandModule;