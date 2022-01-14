'use strict';

const scope = "&scope=read_magellan write_magellan read_bubendorff write_bubendorff";
const LegrandDevices = require('./LegrandDevices');

class LegrandDriver {

  //Méthode statique d'appairage des modules, la même pour chacun des drivers.
  static async onPairLegrand(session, HomeyDriver, Homey) {
    const apiUrl = `https://api.netatmo.com/oauth2/authorize?client_id=${Homey.env.CLIENT_ID}&redirect_uri=https://callback.athom.com/oauth2/callback/${scope}&response_type=code]`;
    const myOAuth2Callback = await HomeyDriver.homey.cloud.createOAuth2Callback(apiUrl);
    let devices;
    let plants;

    //On vérifie si l'utilisateur s'est déjà loggé auparavant
    if (HomeyDriver.homey.app.getStoredSettings('signed') === true){
      myOAuth2Callback
          .on('url', async url => {
            //Si c'est le cas on envoie au socket session, l'event suivant pour dire au front end de passer
            //A l'affichage de la liste des devices
            await session.emit('authorized');
          })
    }
    else{
      myOAuth2Callback
          .on('url', url => {
            // dend the URL to the front-end to open a popup
            session.emit('url', url);
          })
          .on('code', async code => {
            await LegrandDriver.driverGetAccessToken(HomeyDriver, code)
                .catch(err => {
                  HomeyDriver.log(err);
                });
            await session.emit('authorized');
          });
    }

    //Après la vérification du log ou le log de l'utilisateur on renvoie la liste des devices
    //On récupère par la meme la map des plants afin de l'enregistrer en mémoire
    session.setHandler('list_devices', async data => {
      [devices, plants] = await LegrandDriver.driverGetDevicesList(HomeyDriver)
          .catch(err => {
            HomeyDriver.log(err);
            HomeyDriver.logger.log(err);
          });

      //devices = await LegrandDriver.filterDevicesList(HomeyDriver, devices);

      LegrandDriver.storePlantAndDevicesData(HomeyDriver, plants);

      //On envoie au front end la liste des devices
      await session.emit('list_devices', devices);
      HomeyDriver.log('Pairing session terminated');

      return devices;
    });
  }

  static async filterDevicesList(HomeyDriver, devicesList){
      const registeredDevices = HomeyDriver.getDevices();
      let res = [];
      if (registeredDevices !== []){
          for (const item of registeredDevices){
              const data = LegrandDevices.getDeviceMap(item);
              for (const dev of devicesList){
                  if (data.id !== dev["data"].id) res.push(dev);

              }
          }
          return res;
      }
      else return devicesList;
  }

  static driverGetDevicesList(HomeyDriver) {
    return new Promise((resolve, reject) => {
      HomeyDriver.homey.app.refreshAccessToken().then(auth => {
        HomeyDriver.homey.app.legrand_api.getDevicesList(auth, HomeyDriver.driver_type, HomeyDriver.driver_class).then(devices => {
          resolve(devices);
        }).catch(err => reject(err));
      }).catch(err => reject(err));
    });
  }

  static driverGetScenesList(HomeyDriver) {
    return new Promise((resolve, reject) => {
      HomeyDriver.homey.app.refreshAccessToken().then(auth => {
        HomeyDriver.homey.app.legrand_api.getScenesList(auth, HomeyDriver).then(res => {
          resolve(res);
        }).catch(err => reject(err));
      }).catch(err => reject(err));
    });
  }

  static driverGetAccessToken(HomeyDriver, code) {
    return new Promise((resolve, reject) => {
      const AUTH_MAP = HomeyDriver.homey.app.GLOBAL_AUTH_MAP;
      AUTH_MAP['code'] = code;
      HomeyDriver.homey.app.legrand_api.getAccessToken(AUTH_MAP, 'authorization_code').then(async json => {
        HomeyDriver.homey.app.registerTokens(json);
        HomeyDriver.homey.app.updateStoredSettings('signed', true);
        resolve();
      }).catch(err => {
        reject(err);
      });
    });
  }

  static storePlantAndDevicesData (HomeyDriver, plants){
    HomeyDriver.homey.app.updateStoredSettings('plants', plants);
  }

  static async onRepairLegrand(session,device, HomeyDriver, Homey) {

    HomeyDriver.homey.app.updateStoredSettings("signed", false);
    const apiUrl = `https://api.netatmo.com/oauth2/authorize?client_id=${Homey.env.CLIENT_ID}&redirect_uri=https://callback.athom.com/oauth2/callback/${scope}&response_type=code]`;
    const myOAuth2Callback = await HomeyDriver.homey.cloud.createOAuth2Callback(apiUrl);
    let devices;
    let plants;

    if (HomeyDriver.homey.app.getStoredSettings('signed') === true){
      myOAuth2Callback
          .on('url', async url => {
            //Si c'est le cas on envoie au socket session, l'event suivant pour dire au front end de passer
            //A l'affichage de la liste des devices
            await session.emit('authorized');
          })
    }
    else{
      myOAuth2Callback
          .on('url', url => {
            // dend the URL to the front-end to open a popup
            session.emit('url', url);
          })
          .on('code', async code => {
            await LegrandDriver.driverGetAccessToken(HomeyDriver, code)
                .catch(err => {
                  HomeyDriver.log(err);
                });
            await session.emit('authorized');
          });
    }

    session.setHandler('showView', async view => {

       if (view === 'loading'){

           [devices, plants] = await LegrandDriver.driverGetDevicesList(HomeyDriver)
               .catch(err => {
                   HomeyDriver.log(err);
                   HomeyDriver.logger.log(err);
               });

           await LegrandDriver.repairDevice(device, devices);

           LegrandDriver.storePlantAndDevicesData(HomeyDriver, plants);
           HomeyDriver.log(device.data);

           await session.done()
           HomeyDriver.log('repairing session terminated');
      }
    });
  }

  static async repairDevice(device, devicesList){

      const module = await LegrandDriver.findModuleById(devicesList, device);

      await device.unsetStoreValue('hwType');
      await device.unsetStoreValue('device');

      await device.setStoreValue("type", module["store"].type);
      await device.setStoreValue("appliance_type", module["store"].applianceType);
      await device.setStoreValue("room_id", module["store"].roomId);
      await device.setStoreValue("bridge", module["store"].bridge);
      await device.setStoreValue("newId", module["data"].id);
      await device.setStoreValue("plantId", module["store"].plantId);

      device.data = LegrandDevices.getDeviceMap(device);
  }

   static getNewId(device){
      return new Promise(  resolve => {
          let res = "";
          let k = 0;
          const data =  LegrandDevices.getDeviceMap(device);
          const oldId = data.id;
          for (let i = 4; i < 10; i++)
          {
              res = res + oldId[i];
              k = k + 1;
              if (k === 2) {
                  res = res + ":";
                  k = 0;
              }
          }
          for (let i = 22; i < oldId.length; i++)
          {
              res = res + oldId[i];
              k = k + 1;
              if (k === 2 && i !== 31) {
                  res = res + ":";
                  k = 0;
              }
          }
          resolve(res);
      })
  }

   static findModuleById(modules, device){
      return new Promise(async resolve => {
          const newId = await LegrandDriver.getNewId(device);
          for (const item of modules){
              if (item["data"].id === newId) resolve (item);
          }
      })
  }

}

module.exports = LegrandDriver;
