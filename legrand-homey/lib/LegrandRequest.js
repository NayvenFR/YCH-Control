class LegrandRequest {

    constructor(type, bridge, deviceId, plantId, cap) {
        this.type = type;
        this.bridge = bridge;
        this.plantId = plantId;
        this.deviceId = deviceId
        this.capabilityValue = cap;
    }

    update(req){
        this.capabilityValue = req.capabilityValue;
    }

    equals(req){
        if (this.type === null){
            if (req.deviceType === this.deviceType && req.plantId === this.plantId){
                for (let key of Object.keys(req.capabilityValue)){
                    return req.capabilityValue[key] === this.capabilityValue[key];
                }
            }
            return false;
        }
        return req.type === this.type && req.plantId === this.plantId && req.capabilityValue === this.capabilityValue &&this.deviceId === req.deviceId;
    }

}

module.exports = LegrandRequest;