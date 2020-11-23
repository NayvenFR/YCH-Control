'use strict';

const conversion = require('./lib/LegrandHomeyConversion');
const LegrandQuery = require('./lib/LegrandQuery');
const LegrandPlant = require('./lib/LegrandPlant');

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
        return (`[REQUEST ERROR HANDLER] / ERROR CODE : ${message['status']}: ${message['statusText']}`);
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
  static getAccessToken (auth, grant) {
    let grantType = '';
    if (grant === 'authorization_code') (grantType = grant);
    else (grantType = 'refresh_token');
    const args = {"AUTH_MAP" : auth, "grant_type" : grantType};

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
  static getDeviceStatus (auth, deviceData) {

    const args = {"AUTH_MAP" : auth, "DEVICE_MAP" : deviceData, "method" : 'get'};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).then(res => {
        resolve(conversion.deviceStatusFromApi(res));
      }).catch(err => {
        reject(err);
      })
    })
  }

  //Cette méthode effectue la requete pour accéder au dernier état de tous les devices d'une plant
  static getPlantsDeviceStatus(auth, plantId, emitter) {

    const args = {"AUTH_MAP" : auth, "plantId" : plantId, "query_type" : 'status'};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {
        conversion.plantDeviceStatusFromApi(res,emitter);
        resolve('Plant n°'+plantId+' devices statuses refreshed !');
      }).catch(err => {
        reject(err);
      })
    })
  }

  //Cette méthode effectue la requete http pour affecter un état à un device.
  static setDeviceStatus (auth, deviceData, capabilityValues) {

    const body = conversion.deviceStatusToApi(capabilityValues);
    const args = {"AUTH_MAP" : auth, "DEVICE_MAP" : deviceData, "method" : 'post', "VALUE_BODY": body, "isMultiple" : false};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).then(res => {
        resolve(`Device state changed to :${body}`);
      }).catch(err => {
        reject(err);
      })
    })
  }

  static setMultipleDeviceStatus(auth, deviceData) {

    const body = conversion.deviceStatusToApi(capabilityValues);
    const args = {"AUTH_MAP" : auth, "DEVICE_MAP" : deviceData, "method" : 'post', "VALUE_BODY": body, "isMultiple" : true};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).then(res => {
        resolve(`Device state changed to :${body}`);
      }).catch(err => {
        reject(err);
      })
    })
  }

  // return user plants

  static getPlants (auth) {
    const args = {"AUTH_MAP" : auth};
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

  static getPlantsTopology (auth) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlants(auth).then(async plants => {
        const plantsArray = plants;
        for (const plant of plantsArray) {
          const args = {"AUTH_MAP" : auth, "query_type": 'topology', "plantId" : plant.id};
          await LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {
            const plantDetail = res['plant'];
            conversion.wrapPlantData(plant, plantDetail);
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

  static getDevicesList(auth, deviceType) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlantsTopology(auth).then(plants => {
        let devices = [];
        for (const plant of plants) {
          const modules = plant.getPlantsModules();
          for (const module of modules) {
            if (module.device === deviceType) {
              devices.push(conversion.wrapModuleData(module));
            }
          }
        }
        resolve([devices, plants]);
      }).catch(err => reject(err));
    });
  }
}

module.exports = LegrandAPI;