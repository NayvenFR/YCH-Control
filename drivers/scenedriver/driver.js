'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');
const scope = "&scope=read_magellan write_magellan read_bubendorff write_bubendorff";

class SceneDriver extends Homey.Driver {

  onInit() {
    this.log('Driver has been inited');
  }

  async onPair(session) {
    let scenes;

    this.log('Pairing session started');
    const apiUrl = `https://api.netatmo.com/oauth2/authorize?client_id=${Homey.env.CLIENT_ID}&redirect_uri=https://callback.athom.com/oauth2/callback/${scope}&response_type=code]`;
    const myOAuth2Callback = await this.homey.cloud.createOAuth2Callback(apiUrl);

    //On vérifie si l'utilisateur s'est déjà loggé auparavant
    if (this.homey.app.getStoredSettings('signed') === true){
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
            await LegrandDriver.driverGetAccessToken(this, code)
                .catch(err => {
                  this.log(err);
                  this.logger.log(err);
                });
            await session.emit('authorized');
          });
    }

    //Après la vérification du log ou le log de l'utilisateur on renvoie la liste des devices
    //On récupère par la meme la map des plants afin de l'enregistrer en mémoire
    session.setHandler('list_devices', async data => {
      scenes = await LegrandDriver.driverGetScenesList(this)
          .catch(err => {
            this.log(err);
            this.logger.log(err);
          });
      
      //On envoie au front end la liste des devices
      await session.emit('list_devices', scenes);
      this.log('Pairing session terminated');

      return scenes;
    });
  }
}

module.exports = SceneDriver;