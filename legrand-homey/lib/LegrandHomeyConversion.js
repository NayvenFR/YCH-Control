'use strict';

const LegrandRoom = require('./LegrandRoom');
const LegrandModule = require('./LegrandModule');

//The goal of the following functions are to extract or re assemble informations from API for Homey and vice versa


const deviceCapabilityTranslationFromHomeyToAPI = {
    'onoff': 'status',
    'dim' : 'level'
};
const deviceCapabilityValueTranslationFromHomeyToAPI = {
    true: 'on',
    false: 'off',
};

const deviceCapabilityTranslationFromApiToHomey = {
    'status': 'onoff',
    'level' : 'dim',
    'consumptions' : 'measure_power',
    'reachable' : 'avaibility'
};
const deviceCapabilityValueTranslationFromApiToHomey = {
    'on': true,
    'off': false
};

const capabilitiesPerType = {
    //Lights
    "NLPT" : ["onoff", "measure_power"],
    "NLM" : ["onoff", "measure_power"],
    "NLF" : ["onoff", "measure_power", "dim"],
    //Plugs
    "NLPO" : ["onoff", "measure_power"],
    "NLP" : ["onoff", "measure_power"],
    "NLPM" : ["onoff", "measure_power"],
    //Remotes

}

const capabilitiesOptionsPerType = {
    //Lights
    "NLPT" : {"onoff" : {}},
    "NLM" : {"onoff" : {}},
    "NLF" : {"onoff" : {}, "dim" :{}},
    //Plugs
    "NLPO" : {"onoff" : {}},
    "NLP" : {"onoff" : {}},
    "NLPM" : {"onoff" : {}},
    //Remotes
}

const deviceCategory = ['lights', 'plugs', 'energymeters', 'remotes', 'heathers', 'automations'];

class LegrandHomeyConversion{

    //FOR LegrandDevices

    //Conversion of device's state data for API comprehension
    static deviceStatusToApi  (capabilitiesValues) {
        let body = {};
        for (let [key, value] of Object.entries(capabilitiesValues)){
            if (key === 'dim') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = value);
            else(body[deviceCapabilityTranslationFromHomeyToAPI[key]] = deviceCapabilityValueTranslationFromHomeyToAPI[value])
        }
        return body;
    }

    static multipleDeviceStatusToApi  (deviceData) {
        let body = {};
        for (let [key, value] of Object.entries(capabilitiesValues)){
            if (key === 'dim') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = value);
            else(body[deviceCapabilityTranslationFromHomeyToAPI[key]] = deviceCapabilityValueTranslationFromHomeyToAPI[value])
        }
        return body;
    }
    //Function that extract data from api request for device statuses for homey capabilities
    static wrapDeviceData(json){
        let res = {};
        for (let [key, value] of Object.entries(deviceCapabilityTranslationFromApiToHomey)){
            if (key === 'consumptions' && json[key] !== undefined) (res[value] = json[key][0]['value']);
            else if (key === 'reachable') (res[value] = json[key]);
            else if (key === 'level' && json[key] !== undefined) (res[value] = json[key]);
            else if (json[key] !== undefined) (res[value] = deviceCapabilityValueTranslationFromApiToHomey[json[key]]);
        }
        return res;
    }
    //Conversion of device's state data for Homey comprehension
    static deviceStatusFromApi(json){
        let res;
        for(let item of deviceCategory){
            if (json[item] !== null && json[item] !== undefined){
                res = json[item][0];
            }
        }
        return LegrandHomeyConversion.wrapDeviceData(res);
    }
    //The same as before but the data is differently wrapped
    static plantDeviceStatusFromApi(json, emitter){
        const res = json['modules'];
        for (let key of Object.keys(res)){
            if (key !== 'automations'){
                for (let item of res[key]){
                    const moduleId = item['sender']['plant']['module']['id'];
                    emitter.emit('state_device_changed', moduleId, LegrandHomeyConversion.wrapDeviceData(item));
                }
            }
        }
    }

    //For LegrandDriver
    static wrapModuleData(module){
        const form = {
            name: module.name,
            data: {
                id: module.id,
            },
            store: { hwType: module.hwType, plantId: module.plantId, device: module.device },
            capabilities : capabilitiesPerType[module.hwType],
            capabilitiesOptions: capabilitiesOptionsPerType[module.hwType]
        }; // fin form

        return form;
    }

    static wrapPlantData(plant, plantDetail){
        for (let item of plantDetail['ambients']) {
            const room = new LegrandRoom(item['name'], item['id'], item['type'], plant['id']);
            plant.addRoomToPlant(room);

            for (let moduleOfItem of item['modules']) {
                const module = new LegrandModule(moduleOfItem['name'], moduleOfItem['id'], moduleOfItem['device'], moduleOfItem['hw_type'], room.id, plant.id);
                plant.addModuleToRoom(module, room.id);
            }
        }
        for (let item of plantDetail['modules']) {
            if (item !== undefined) {
                const module = new LegrandModule(item['name'], item['id'], item['device'], item['hw_type'], undefined, plant.id);
                plant.addModuleToPlant(module);
            }
        }
    }

}

module.exports = LegrandHomeyConversion;