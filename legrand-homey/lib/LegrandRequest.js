class LegrandRequest {

    constructor(type, plantId, cap) {
        this.deviceType = type;
        this.plantId = plantId;
        this.capabilityValue = cap;
        this.type = null;
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
        return req.deviceType === this.deviceType && req.plantId === this.plantId && req.capabilityValue === this.capabilityValue;
    }

}

module.exports = LegrandRequest;