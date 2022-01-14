'use strict';

const LegrandRoom = require('./LegrandRoom');
const LegrandModule = require('./LegrandModule');
const {app} = require("homey");

//The goal of the following functions are to extract or re assemble informations from API for Homey and vice versa


const deviceCapabilityTranslationFromHomeyToAPI = {
    'onoff': 'on',
    'dim' : 'brightness',
    'windowcoverings_state' : 'target_position:step:',
    'windowcoverings_level' : 'target_position',
    'wiredpilot_mode' : 'mode'
};
const deviceCapabilityValueTranslationFromHomeyToAPI = {
    true: true,
    false: false,
    'up' : 100,
    'down' : 0,
    'idle' : 50,
    'heat' : 'comfort',
    'cool' : 'away',
    'off': 'frost_guard',
};

const deviceCapabilityTranslationFromApiToHomey = {
    'on': 'onoff',
    "brightness":'dim',
    'current_position' : ['windowcoverings_state', 'windowcoverings_level'],
    'power' : 'measure_power',
    'reachable' : 'avaibility',
    "mode" : 'wiredpilot_mode'
};
const deviceCapabilityValueTranslationFromApiToHomey = {
    true: true,
    false: false,
    'frost_guard' : 'off',
    'away' : 'cool',
    'comfort':'heat'
};

const capabilitiesPerType = {
    //Lights
    "NLPT" : {"all" : ["onoff", "measure_power"]},
    "NLM" : {"all" : ["onoff", "measure_power"]},
    "NLL" : {"all" : ["onoff", "measure_power"]},
    "NLF" : {"all": ["onoff", "measure_power", "dim"]},
    "NLFN" : {"all": ["onoff", "measure_power", "dim"]},
    //Plugs
    "NLPO" : {"all" : ["onoff", "measure_power"]},
    "NLP" : {"all" : ["onoff", "measure_power"]},
    "NLPBS": {"all" : ["onoff", "measure_power"]},
    "NLPM" : {"all" : ["onoff", "measure_power"]},
    "NLC" : {'other' : ["onoff", "measure_power"],'cooking' : ["onoff", "measure_power"],'water_heater' : ["onoff", "measure_power"],'radiator_without_pilot_wire' : ["onoff", "measure_power"], 'radiator' : ["measure_power", "wiredpilot_mode"]},
    //VR
    "NLV" : {"all": ["windowcoverings_state"]},
    "NLLV" : {"all": ["windowcoverings_level"]},
    "NLLM" : {"all": ["windowcoverings_state"]},
    "NLVI" : {"all": ["windowcoverings_state"]},
    "NBR" : {"all": ["windowcoverings_state"]},
    "NBO" : {"all": ["windowcoverings_state"]},
    "NBS" : {"all": ["windowcoverings_state"]},

    //Energy Meters
    "NLPC" : {"all": ["measure_power"]},

}

const capabilitiesOptionsPerType = {
    //Lights
    "NLPT" : {'all': {"onoff" : {}}},
    "NLM" : {'all': {"onoff" : {}}},
    "NLL" : {'all': {"onoff" : {}}},
    "NLF" : {'all': {"onoff" : {}, "dim" :{"min":0, "max":100, "step":1, "decimals" : 0, "$flow": {"actions": [{"args":{"min": 0,"max": 100, "step": 1, "value": 50, "label": "%", "labelMultiplier": 1, "labelDecimals": 0}}]}}}},
    "NLFN" : {'all': {"onoff" : {}, "dim" :{"min":0, "max":100, "step":1, "decimals" : 0, "$flow": {"actions": [{"args":{"min": 0,"max": 100, "step": 1, "value": 50, "label": "%", "labelMultiplier": 1, "labelDecimals": 0}}]}}}},
    //Plugs
    "NLPO" : {'all': {"onoff" : {}}},
    "NLP" : {'all': {"onoff" : {}}},
    "NLPBS" : {'all': {"onoff" : {}}},
    "NLPM" : {'all': {"onoff" : {}}},
    "NLC" : {'other' : {"onoff" : {}},'cooking' : {"onoff" : {}},'water_heater' : {"onoff" : {}},'radiator_without_pilot_wire' : {"onoff" : {}}, 'radiator' : {}},
    //VR
    "NLV" : {'all':{"windowcoverings_state":{}}},
    "NLLV" : {'all':{"windowcoverings_level": {"min":0, "max":100, "step":1}}},
    "NLLM" : {'all':{"windowcoverings_state":{}}},
    "NLVI": {'all':{"windowcoverings_state":{}}},
    "NBR": {'all':{"windowcoverings_state":{}}},
    //Energy Meters
    "NLPC" :{'all':{"measure_power":{}}},

}


const deviceCategory = ['lights', 'plugs', 'energymeters', 'remotes', 'heaters', 'automations'];

class LegrandHomeyConversion{

    static jsonConcat(o1, o2) {
        for (let key in o2) {
            o1[key] = o2[key];
        }
        return o1;
    }

    //FOR LegrandDevices
    //Conversion of device's state data for API comprehension
    static deviceStatusToApi  (capabilitiesValues) {
        let body = {};
        for (let [key, value] of Object.entries(capabilitiesValues)){
            if (key === 'dim' || key === 'windowcoverings_level') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = value);
            else if (key === 'windowcoverings_state') {
                if (value === 'up') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 100);
                else if (value === 'idle') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 50);
                else if (value === 'down') (body[deviceCapabilityTranslationFromHomeyToAPI[key]] = 0);
            }
            else(body[deviceCapabilityTranslationFromHomeyToAPI[key]] = deviceCapabilityValueTranslationFromHomeyToAPI[value]);
        }
        return body;
    }

    static multipleDeviceStatusToApi  (ids, request) {
        let body = {"home":{"id": request.plantId}};
        let modules = [];

        body['ids'] = ids;

        modules = jsonConcat(modules, LegrandHomeyConversion.deviceStatusToApi(request.capabilityValue));

        return [body];
    }

    //Function that extract data from api request for device statuses for homey capabilities
    static wrapDeviceData(json){
        let res = {};
        for (let [key, value] of Object.entries(deviceCapabilityTranslationFromApiToHomey)){
            if(json[key] !== undefined && key==='power'){res[value] = json[key]}
            else if (key === 'reachable') (res[value] = json[key]);
            //VR
            else if (key === 'current_position' && json[key] !== undefined && json.hasOwnProperty('target_position:step')) {
                /*if (json[key] === 0) {res[value[0]] = 'down';}
                else if (json[key] === 100) {res[value[0]] = 'up';}
                else if (json[key] === 50) {res[value[0]] = 'idle';}
                //For VR with position control
                else{res[value[1]] = json[key]}*/
                res[value[1]] = json[key];
            }
            //Dimmer
            else if (key === 'brightness' && json[key] !== undefined) (res[value] = json[key]);
            //Others
            else if (json[key] !== undefined) (res[value] = deviceCapabilityValueTranslationFromApiToHomey[json[key]]);
        }
        return res;
    }
    //Conversion of device's state data for Homey comprehension
    static plantDeviceStatusFromApi(json, emitter){
        const res = json['body']['home']['modules'];
        for (const item of res){
            const moduleId = item['id']
            emitter.emit('state_device_changed', moduleId, LegrandHomeyConversion.wrapDeviceData(item));
        }
    }

    //For LegrandDriver
    static wrapModuleData(module){

        let appliance = module.applianceType;

        if(capabilitiesPerType[module.type].hasOwnProperty('all')){
            appliance = 'all';
        }

        const capabilities = capabilitiesPerType[module.type][appliance];
        const capabilitiesOptions = capabilitiesOptionsPerType[module.type][appliance];

        const form = {
            name: module.name,
            data: {
                id: module.id,
            },
            store: { type: module.type, appliance_type: module.applianceType, room_id: module.roomId, bridge: module.bridge, plantId: module.plantId },
            capabilities : capabilities,
            capabilitiesOptions: capabilitiesOptions
        }; // fin form

        return form;
    }

    static wrapSceneData(scene, plant,gateway_ID,homeyDriver){
        const name = homeyDriver.homey.__(scene["id"]);
        const id = scene["id"];
        const friendlyName = scene["name"]
        const plantId = plant;
        const gateway_id=gateway_ID;


        const form = {
            name: friendlyName !== undefined ? friendlyName : name,
            data: {
                id: id,
                gateway_id: gateway_id,
            },
            store: { plantId: plantId},
        }; // fin form
        return form;
    }

    static wrapPlantData(plantArray, plantDetail){

        const data = plantDetail['body']['homes']

        for (const plant of plantArray){
            for (const detail of data){
                if (detail['id'] === plant.id){
                    for (let item of detail['rooms']) {
                        const room = new LegrandRoom(item['name'], item['id'], item['type'], plant['id']);
                        plant.addRoomToPlant(room);

                    }
                    for (let item of detail['modules']) {
                        if (item !== undefined) {
                            const module = new LegrandModule(item['name'], item['id'], item['type'], item['appliance_type'], item['room_id'], item['bridge'], plant.id);
                            plant.addModuleToPlant(module,item['room_id'] );
                        }
                    }
                }
            }
        }
    }

}

module.exports = LegrandHomeyConversion;
