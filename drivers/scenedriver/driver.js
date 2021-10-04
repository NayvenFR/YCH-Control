'use strict';

const Homey = require('homey');
const LegrandDriver = require('../../legrand-homey/LegrandDriver');

class SceneDriver extends Homey.Driver {

  onInit() {
    this.homey.app.refreshAccessToken().then(auth => {
      if (!events_subscribed){
        this.homey.app.legrand_api.subscribePlantEvents(auth);
      }
    }).catch(err => this.log(err));
    
    this.homey.flow.getDeviceTriggerCard('scene_launched');
    this.registerWebHook(this,this.homey.app.getStoredSettings('plants'))
    this.log('Driver has been inited');
  }

  async onPair(session) {
    let scenes;

    this.log('Pairing session started');
    const apiUrl = `https://partners-login.eliotbylegrand.com/authorize?client_id=${Homey.env.CLIENT_ID}&redirect_uri=https://callback.athom.com/oauth2/callback/&response_type=code`;
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
      
      //webhook registration
      LegrandDriver.registerWebHook(this, this.homey.app.getStoredSettings('plants'));
      //On envoie au front end la liste des devices
      await session.emit('list_devices', scenes);
      this.log('Pairing session terminated');

      return scenes;
    });
  }

  async registerWebHook(HomeyDriver, plants){
    HomeyDriver.log("registerWebHook")
    if (this._webhook) {
        await this.unregisterWebhook(HomeyDriver).catch(this.error);
    }
    
    const plantsId = [];
    for (const plant of plants) {
      plantsId.push(plant.id)
    }
    
    let webhook_data;
    webhook_data = {
      $keys: plantsId,
    }
    
    HomeyDriver.log(webhook_data);
    this._webhook = await HomeyDriver.homey.cloud.createWebhook(HomeyDriver.homey.app.GLOBAL_AUTH_MAP['webhook_id'], HomeyDriver.homey.app.GLOBAL_AUTH_MAP['webhook_secret'], webhook_data);
    
    this._webhook.on('message',args =>{
      
      const triggeredDevice = args.body[0].data.sender.plant.module.id;

      const device = this.getDevices().find(device => device.getData().id === triggeredDevice);
      const sceneLaunched = this.homey.flow.getTriggerCard("scene_launched")
      sceneLaunched.trigger(device)
      
    });
    //HomeyDriver.log(this._webhook)
  }

  async unregisterWebhook(HomeyDriver) {
    if (this._webhook) {
        await this._webhook.unregister();
        HomeyDriver.log('Webhook unregistered');
    }
  }
}

module.exports = SceneDriver;