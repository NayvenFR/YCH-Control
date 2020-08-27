const LegrandObject = require('./LegrandObject');

class LegrandPlant extends LegrandObject {

    constructor(name, id, location) {
        super(name, id);
        this.location = location;
        this.rooms = new Map();
        this.modulesNotSortedPerRoom = new Map();
    }

    addRoomToPlant(room) {
        this.rooms.set(room.id, room);
    }

    addModuleToRoom(module, roomId) {
        const room = this.rooms.get(roomId);
        room.addModule(module);
    }

    getPlantsModules() {
        let moduleArray = [];
        for (const [key, values] of this.rooms) {
            moduleArray = moduleArray.concat(values.getModules());
        }

        for (const [key, values] of this.modulesNotSortedPerRoom) {
            moduleArray.push(values);
        }

        return moduleArray;
    }

    addModuleToPlant(module) {
        this.modulesNotSortedPerRoom.set(module.id, module);
    }

}

module.exports = LegrandPlant;