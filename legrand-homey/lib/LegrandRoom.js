const LegrandObject = require('./LegrandObject');

class LegrandRoom extends LegrandObject {

    constructor(name, id, type, plantId) {
        super(name, id);
        this.plantId = plantId;
        this.type = type;
        this.modules = new Map();
    }

    addModule(module) {
        this.modules.set(module.id, module);
    }

    getModules() {
        const moduleArray = [];
        for (const [key, values] of this.modules) {
            moduleArray.push(values);
        }
        return moduleArray;
    }

}

module.exports = LegrandRoom;