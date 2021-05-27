'use strict';

const LegrandRoom = require('./LegrandRoom');
const LegrandModule = require('./LegrandModule');

//The goal of the following functions are to extract or re assemble informations from API for Homey and vice versa


const deviceCapabilityTranslationFromHomeyToAPI = {
    'onoff': 'status',
    'dim' : 'level',
    'windowcoverings_state' : 'level',
    'windowcoverings_level' : 'level',
    'wiredpilot_mode' : 'mode'
};
const deviceCapabilityValueTranslationFromHomeyToAPI = {
    true: 'on',
    false: 'off',
    'up' : 100,
    'down' : 0,
    'idle' : 50,
    'heat' : 'comfort',
    'cool' : 'away',
    'off': 'frost_guard',
};

const deviceCapabilityTranslationFromApiToHomey = {
    'status': 'onoff',
    'level' : ['dim', 'windowcoverings_state', 'windowcoverings_level'],
    'consumptions' : 'measure_power',
    'reachable' : 'avaibility',
    "mode" : 'wiredpilot_mode'
};
const deviceCapabilityValueTranslationFromApiToHomey = {
    'on': true,
    'off': false,
    'frost_guard' : 'off',
    'away' : 'cool',
    'comfort':'heat'
};

const capabilitiesPerType = {
    //Lights
    "NLPT" : ["onoff", "measure_power"],
    "NLM" : ["onoff", "measure_power"],
    "NLL" : ["onoff", "measure_power"],
    "NLF" : ["onoff", "measure_power", "dim"],
    "NLFN" : ["onoff", "measure_power", "dim"],
    //Plugs
    "NLPO" : ["onoff", "measure_power"],
    "NLP" : ["onoff", "measure_power"],
    "NLPBS": ["onoff", "measure_power"],
    "NLPM" : ["onoff", "measure_power"],
    "NLC" : {'plug' : ["onoff", "measure_power"], 'heater' : ["measure_power", "wiredpilot_mode"]},
    //VR
    "NLV" : ["windowcoverings_state"],
    "NLLV" : ["windowcoverings_level"],
    "NLLM" : ["windowcoverings_state"],
    "NLVI" : ["windowcoverings_state"],
    //Energy Meters
    "NLPC" : ["measure_power"]

}

const capabilitiesOptionsPerType = {
    //Lights
    "NLPT" : {"onoff" : {}},
    "NLM" : {"onoff" : {}},
    "NLL" : {"onoff" : {}},
    "NLF" : {"onoff" : {}, "dim" :{"min":0, "max":100, "step":1}},
    "NLFN" : {"onoff" : {}, "dim" :{"min":0, "max":100, "step":1}},
    //Plugs
    "NLPO" : {"onoff" : {}},
    "NLP" : {"onoff" : {}},
    "NLPBS" : {"onoff" : {}},
    "NLPM" : {"onoff" : {}},
    "NLC" : {'plug' : {"onoff" : {}} ,'heater' : {}},
    //VR
    "NLV" : {"windowcoverings_state":{}},
    "NLLV" : {"windowcoverings_level": {"min":0, "max":100, "step":1}},
    "NLLM" : {"windowcoverings_state":{}},
    "NLVI": {"windowcoverings_state":{}},
    //Energy Meters
    "NLPC" : {}

}

function jsonConcat(o1, o2) {
    for (let key in o2) {
        o1[key] = o2[key];
    }
    return o1;
}

const deviceCategory = ['lights', 'plugs', 'energymeters', 'remotes', 'heaters', 'automations'];

class LegrandHomeyConversion{

    //FOR LegrandDevices

    //Conversion of device's state data for API comprehension
    static deviceStatusToApi  (capabilitiesValues) {
        let body = {};
        for (let [key, value] of Object.entries(capabilitiesValues)){
            if (key === 'dim') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = value);
            else if (key === 'windowcoverings_state') {
                if (value === 'up') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 100);
                else if (value === 'idle') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 50);
                else if (value === 'down') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 0);
            }
            else if (key === 'windowcoverings_level') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = value);
            else(body[deviceCapabilityTranslationFromHomeyToAPI[key]] = deviceCapabilityValueTranslationFromHomeyToAPI[value]);
        }
        return body;
    }

    static multipleDeviceStatusToApi  (ids, request) {
        let body = {};
        let deviceData = {"device" : request.deviceType, "plantId" : request.plantId};

        body['ids'] = ids;

        body = jsonConcat(body, LegrandHomeyConversion.deviceStatusToApi(request.capabilityValue));

        return [body, deviceData];
    }

    //Function that extract data from api request for device statuses for homey capabilities
    static wrapDeviceData(json){
        let res = {};
        for (let [key, value] of Object.entries(deviceCapabilityTranslationFromApiToHomey)){
            if (key === 'consumptions' && json[key] !== undefined) (res[value] = json[key][0]['value']);
            else if (key === 'reachable') (res[value] = json[key]);
            //VR
            else if (key === 'level' && json[key] !== undefined && json.hasOwnProperty('step')) {
                if (json[key] === 0) {res[value[1]] = 'down';}
                else if (json[key] === 100) {res[value[1]] = 'up';}
                else if (json[key] === 50) {res[value[1]] = 'idle';}
                //For VR with position control
                else{res[value[2]] = json[key]}
            }
            //Dimmer
            else if (key === 'level' && json[key] !== undefined) (res[value[0]] = json[key]);
            //Others
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
    //The same as before but the input data is differently wrapped
    static plantDeviceStatusFromApi(json, emitter){
        const res = json['modules'];
        for (let key of Object.keys(res)){
            for (let item of res[key]){
                const moduleId = item['sender']['plant']['module']['id'];
                emitter.emit('state_device_changed', moduleId, LegrandHomeyConversion.wrapDeviceData(item));
            }
        }
    }

    //For LegrandDriver
    static wrapModuleData(module){

        let capabilities = {};
        let capabilitiesOptions = {};

        if (module.device === 'heater' && module.hwType === 'NLC'){
            capabilities = capabilitiesPerType[module.hwType]['heater'];
            capabilitiesOptions = capabilitiesOptionsPerType[module.hwType]['heater'];
        }
        else if (module.device === 'plug' && module.hwType === 'NLC'){
            capabilities = capabilitiesPerType[module.hwType]['plug'];
            capabilitiesOptions = capabilitiesOptionsPerType[module.hwType]['plug'];
        }
        else {
            capabilities = capabilitiesPerType[module.hwType];
            capabilitiesOptions = capabilitiesOptionsPerType[module.hwType];
        }

        const form = {
            name: module.name,
            data: {
                id: module.id,
            },
            store: { hwType: module.hwType, plantId: module.plantId, device: module.device },
            capabilities : capabilities,
            capabilitiesOptions: capabilitiesOptions
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