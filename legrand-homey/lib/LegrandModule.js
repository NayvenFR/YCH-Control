const LegrandObject = require('./LegrandObject');

class LegrandModule extends LegrandObject {

    constructor(name, id, type, applianceType, roomId, bridge, plantId) {
        super(name, id);
        this.type = type;
        this.applianceType = applianceType;
        this.roomId = roomId;
        this.bridge = bridge;
        this.plantId = plantId;
    }

}

module.exports = LegrandModule;