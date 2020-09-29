'use strict';

class LegrandDriver {

  //Méthode statique d'appairage des modules, la même pour chacun des drivers.
  static async onPairLegrand(session, HomeyDriver, Homey) {
    const apiUrl = `https://partners-login.eliotbylegrand.com/authorize?client_id=${Homey.env.CLIENT_ID}&redirect_uri=https://callback.athom.com/oauth2/callback/&response_type=code`;
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
                .catch(err => HomeyDriver.log(err));
            await session.emit('authorized');
          });
    }

    //Après la vérification du log ou le log de l'utilisateur on renvoie la liste des devices
    //On récupère par la meme la map des plants afin de l'enregistrer en mémoire
    session.setHandler('list_devices', async data => {
      [devices, plants] = await LegrandDriver.driverGetDevicesList(HomeyDriver)
          .catch(err => HomeyDriver.log(err));
      LegrandDriver.storePlantAndDevicesData(HomeyDriver, plants);
      //On envoie au front end la liste des devices
      await session.emit('list_devices', devices);
      HomeyDriver.log('Pairing session terminated');

      return devices;
    });
  }

  static driverGetDevicesList(HomeyDriver) {
    return new Promise((resolve, reject) => {
      HomeyDriver.homey.app.refreshAccessToken().then(auth => {
        HomeyDriver.homey.app.legrand_api.getDevicesList(auth, HomeyDriver.driver_type).then(devices => {
          resolve(devices);
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

}

module.exports = LegrandDriver;