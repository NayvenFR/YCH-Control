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
          expires_in: res['expires_in']
        };
        resolve(resMap);
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

  static setDeviceStatus(auth, body) {

    return new Promise((resolve, reject) => {
      let res;

        const args = {
          "AUTH_MAP": auth,
          "VALUE_BODY": body,
        };

        LegrandAPI.globalQuery(LegrandQuery.QueryDevice, args).catch(err => {
          reject(err);
        })
      resolve("Multiple devices states changed");
    })
    }

  // return user plants

  static getPlants (auth) {
    const args = {"AUTH_MAP" : auth};
    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {

        const plantsArray = [];
        const p = res['body']['homes']

        for (const item of p) {
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
    const args = {"AUTH_MAP" : auth};
    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryPlant, args).then(res => {

        const plantsArray = [];
        const p = res['body']['homes']

        for (const item of p) {
          const plant = new LegrandPlant(item['name'], item['id'], item['country']);
          plantsArray.push(plant);
        }

        conversion.wrapPlantData(plantsArray, res);
        resolve(plantsArray);
      }).catch(err => {
        reject(err);
      })
    })
  }


  static getDevicesList(auth, deviceType, driverClass) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlantsTopology(auth).then(plants => {
        let devices = [];
        for (const plant of plants) {
          const modules = plant.getPlantsModules();
          for (const module of modules) {
            if (deviceType.hasOwnProperty(module.type) && module.applianceType === deviceType[module.type]) {
              devices.push(conversion.wrapModuleData(module));
            }
            else if (deviceType.hasOwnProperty(module.type) && driverClass === "socket"){
              const applianceTable = ["fridge_freezer", "oven", "washing_machine","tumble_dryer","dishwasher","multimedia","router", "other", "electric_charger", "water_heater", "radiator_without_pilot_wire", "cooking"];
              for (const k of applianceTable ){
                if (k === module.applianceType) devices.push(conversion.wrapModuleData(module));
              }
            }
          }
        }
        resolve([devices, plants]);
      }).catch(err => reject(err));
    });
  }

  static runScene(auth, sceneData){
    const args = {"AUTH_MAP" : auth, "data" : sceneData, "method" : 'post'};

    return new Promise((resolve, reject) => {
      LegrandAPI.globalQuery(LegrandQuery.QueryScene, args).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      })
    })
  }

  static getPlantScenes (auth, plant) {

    const args = {"AUTH_MAP" : auth, "plantId" : plant, "method" : 'get'};

    return new Promise(async (resolve, reject) => {
      await LegrandAPI.globalQuery(LegrandQuery.QueryScene, args).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      })
    })
  }

  static getScenesList (auth,homeyDriver) {
    return new Promise( (resolve, reject) => {
      LegrandAPI.getPlantsTopology(auth).then(async plants => {
        let scenes = [];
        for (const plant of plants) {
          await LegrandAPI.getPlantScenes(auth, plant.id).then(res => {
            const listScene = res["scenes"];
            for (let item of listScene){
              scenes.push(conversion.wrapSceneData(item, plant.id,homeyDriver));
            }
          }).catch(err => reject (err));
        }
        resolve(scenes);
      }).catch(err => reject(err));
    });
  }


  ////////////////
  static subscribePlantEvents (auth) {
    return new Promise((resolve, reject) => {
      LegrandAPI.getPlants(auth).then(async plants => {
        const plantsArray = plants;
        for (const plant of plantsArray) {
          let body = {};
          body['plantid'] = plant.id;
          const args = {"AUTH_MAP" : auth,  "VALUE_BODY": body, "method" : "POST"};
          await LegrandAPI.globalQuery(LegrandQuery.SubscribeEvents, args).then(res => {
             events_subscribed = true
          }).catch(err => {
            reject(err);
          })
        }
        resolve(`Events subscribed`);
      }).catch(err => {
        reject(err);
      })
    });
  }

}

module.exports = LegrandAPI;