'use strict';

const Homey = require('homey');
const LegrandQuery = require('./lib/LegrandQuery');
const LegrandRoom = require('./lib/LegrandRoom');
const LegrandPlant = require('./lib/LegrandPlant');
const LegrandModule = require('./lib/LegrandModule');

// Replace Homey Capabilities Id by Legrand API capabilities
const DEVICE_CAPABILITY_VALUE = {
  'onoff': 'status',
  'availability' : 'reachable',
  'dim' : 'level'
};

//FROM API to THIS
const DEVICE_STATUS_TRANSLATION = {
  'on': true,
  'off': false
};

// Same than before, but with capabilities values
//FROM this to API
const REVERSE_DEVICE_STATUS_TRANSLATION = {
  true: 'on',
  false: 'off',
};


const CAPABILITIES_PER_DEVICE_TYPE = {
  //Lights
  "NLPT" : ["onoff", "measure_power"],
  "NLM" : ["onoff"],
  "NLF" : ["onoff", "measure_power", "dim"],
  //Plugs
  "NLPO" : ["onoff", "measure_power"],
  "NLP" : ["onoff", "measure_power"],
  "NLPM" : ["onoff", "measure_power"],
  //Remotes
  "":""
}

const CAPABILITIES_OPTIONS_PER_DEVICE_TYPE = {
  //Lights
  "NLPT" : {"onoff" : {}},
  "NLM" : {"onoff" : {}},
  "NLF" : {"onoff" : {}, "dim" :{}},
  //Plugs
  "NLPO" : {"onoff" : {}},
  "NLP" : {"onoff" : {}},
  "NLPM" : {"onoff" : {}},
}

const PER_DEVICE_RESFORM = {
  //Lights
  'NLPT' : { availability: false, 'onoff': false, "measure_power" : 0},
  'NLM' : { availability: false, 'onoff': false },
  'NLF' : { availability: false, 'onoff': false , 'dim':0},
  //plugs
  'NLPO' : { availability: false, 'onoff': false, "measure_power" : 0},
  'NLP' : { availability: false, 'onoff': false, "measure_power" : 0},
  'NLPM' : { availability: false, 'onoff': false, "measure_power" : 0}
}

const DEVICE_CLASSES = ['lights', 'plugs', 'energymeters', 'remotes', 'heathers', 'automations'];

class LegrandAPI {

  //Cette méthode gère les erreurs de requetes http
  static requestErrorHandler(message, json, deviceSetQuery = false) {
    //Vérification code d'erreur http
    if (message['status'] !== 200) {
      //Si le message peut se transformer en json pour afficher plus de détails.
      if(json['message'] !== undefined && json['message'] !== null) {
        return (`[REQUEST ERROR HANDLER] / ERROR CODE : ${message['status']} / DESCRIPTION: ${message['statusText']}, ${json['message']}`);
      }
      else{
        return (`[REQUEST ERROR HANDLER]:${message['status']}: ${message['statusText']}`);
      }
    }
    // la reqête s'est bien déroulée
    return true;
  }

  //Forme globale de l'algo pour effectuer une requete, en gérer les erreurs etc...
  static async globalQuery (usedFunction, args) {
    let res;
    let err;
    let json;

    try {
      res = await usedFunction(args);
    } catch (e) {
      err = e;
    }

    try{
      json = await res.json();
    }catch (e) {
      json = undefined;
    }
    const requestErrorHandlerResponse = LegrandAPI.requestErrorHandler(res, json);

    return new Promise((resolve, reject) => {
      if (err !== undefined) {
        reject(err);
      }

      if (requestErrorHandlerResponse === true) {
        return resolve(json);
      }
      return reject(requestErrorHandlerResponse);
    });
}
  //Cette méthode effectue les requetes pour accéder aux tokens
  static getAccessToken (AUTH_MAP, grant) {

    let grantType = '';
    if (grant === 'authorization_code') (grantType = grant);
    else (grantType = 'refresh_token');
    const args = {"AUTH_MAP" : AUTH_MAP, "grant_type" : grantType};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryToken, args).then(res => {
        const resMap = {
          access_token: res['access_token'],
          refresh_token: res['refresh_token'],
        };
        resolve(resMap);
      }).catch(err => {
        reject(err);
      })
    })
  }

  //Cette méthode effectue la requete pour accéder au dernier état d'un seul device
  static getDeviceStatus (AUTH_MAP, DEVICE_MAP) {

    const args = {"AUTH_MAP" : AUTH_MAP, "DEVICE_MAP" : DEVICE_MAP, "method" : 'get'};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).then(res => {
        resolve(LegrandAPI.returnDeviceStatusForm(res, DEVICE_MAP['Hwtype']));
      }).catch(err => {
        reject(err);
      })
    })
  }

  //Cette méthode effectue la requete pour accéder au dernier état de tous les devices d'une plant
  static getPlantsDeviceStatus(AUTH_MAP, plantId, HwTypeArray, app) {

    const args = {"AUTH_MAP" : AUTH_MAP, "plantId" : plantId, "query_type" : 'status'};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {
        LegrandAPI.emitPlantsDeviceStatusForm(res, HwTypeArray, app);
        resolve('Plant n°'+plantId+' devices statuses refreshed !');
      }).catch(err => {
        reject(err);
      })
    })
  }

  //Cette méthode envoie un signal aux instances xxxxDevices pour signaler un changement d'état, avec le resform correspondant
  static async emitPlantsDeviceStatusForm(res, HwTypeArray, app){
    const resJson = res['modules'];
    for (let key of Object.keys(resJson)){
      if (key !== 'automations'){
        const keyArray = resJson[key]; //lights array for exemple
        for (let item of keyArray){
          const moduleId = item['sender']['plant']['module']['id'];
          const moduleHwType = HwTypeArray[moduleId];
          if (moduleHwType !== undefined){

            await app.emitter.emit('state_device_changed', moduleId, LegrandAPI.wrapDeviceForm(moduleId, moduleHwType, item));
          }
        }
      }
    }
  }

  //Cette méthode effectue la requete http pour affecter un état à un device.
  static setDeviceStatus (AUTH_MAP, DEVICE_MAP, VALUE_MAP) {

    const body = LegrandAPI.mapToBody(VALUE_MAP);
    const args = {"AUTH_MAP" : AUTH_MAP, "DEVICE_MAP" : DEVICE_MAP, "method" : 'post', "VALUE_BODY": body};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).then(res => {
        resolve(`Device state changed to :${body}`);
      }).catch(err => {
        reject(err);
      })
    })
  }

  // return user plants

  static getPlants (AUTH_MAP) {

    const args = {"AUTH_MAP" : AUTH_MAP};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {
        const plantsArray = [];

        for (const item of res['plants']) {
          const plant = new LegrandPlant(item['name'], item['id'], item['country']);
          plantsArray.push(plant);
        }
        resolve(plantsArray);
      }).catch(err => {
        reject(err);
      })
    })
  }

  static getPlantsTopology (AUTH_MAP) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlants(AUTH_MAP).then(async plants => {
        const plantsArray = plants;
        let loopCount = 0;
        for (const plant of plantsArray) {
          const args = {"AUTH_MAP" : AUTH_MAP, "query_type": 'topology', "plantId" : plant.id};
          await LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {
            const plantDetail = res['plant'];
            LegrandAPI.wrapPlantData(plant, plantDetail);
          }).catch(err => {
            reject(err);
          })
        }
        resolve(plantsArray);
      }).catch(err => {
        reject(err);
      })
    });
  }

  static wrapDeviceData(resForm, result){
    const res = resForm;
    for (let key of Object.keys(res)){
      if (key === 'availability') (res[key] = result[DEVICE_CAPABILITY_VALUE[key]]);
      else if (key === 'dim') (res[key] = result[DEVICE_CAPABILITY_VALUE[key]]);
      else if (key === 'measure_power'){
        const consumption = result['consumptions'][0];
        res[key] = consumption['value'];
      }
      else (res[key] = DEVICE_STATUS_TRANSLATION[result[DEVICE_CAPABILITY_VALUE[key]]]);
    }
    return res;
  }

  static returnDeviceStatusForm(json, deviceHwType){
    let resForm = PER_DEVICE_RESFORM[deviceHwType];
    let result;

    for(let item of DEVICE_CLASSES){
      if (json[item] !== null && json[item] !== undefined){
        result = json[item][0];
      }
    }

    resForm = LegrandAPI.wrapDeviceData(resForm, result);
    return(resForm);
  }

  static wrapDeviceForm(moduleId,hwType, device) {
    const resForm = PER_DEVICE_RESFORM[hwType];
    const res = LegrandAPI.wrapDeviceData(resForm, device);
    return res;
  }

  static mapToBody(VALUE_MAP) {
    const body = {};

    for (const [key, value] of VALUE_MAP.entries()) {
      if (key === 'dim') ('todo');
      else (body[DEVICE_CAPABILITY_VALUE[key]] = REVERSE_DEVICE_STATUS_TRANSLATION[value]);
    }
    return body;
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

  static getDevicesList(AUTH_MAP, deviceType) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlantsTopology(AUTH_MAP).then(plants => {
        let devices = [];
        for (const plant of plants) {
          const modules = plant.getPlantsModules();
          for (const module of modules) {
            if (module.device === deviceType) {
              devices.push(LegrandAPI.returnModuleData(module));
            }
          }
        }
        return resolve([devices, plants]);
      }).catch(err => reject(err));
    });
  }

  static returnModuleData(module){
    const form = {
      name: module.name,
      data: {
        id: module.id,
      },
      store: { Hwtype: module.hwType, plantId: module.plantId, device: module.device },
      capabilities : CAPABILITIES_PER_DEVICE_TYPE[module.hwType],
      capabilitiesOptions: CAPABILITIES_OPTIONS_PER_DEVICE_TYPE[module.hwType]
    }; // fin form

    return form;
  }
}

module.exports = LegrandAPI;