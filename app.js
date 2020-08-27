'use strict';

const Homey = require('homey');
const LegrandAPI = require('./legrand-homey/LegrandAPI');
const events = require('events');

//Constantes qui représentent la durée maximale de validité des tokens, utilisés dans la fonction checkaccesstoken
const access_Token_Timeout = 3600 * 1000;
const refresh_Token_Timeout = 7776000 * 1000;

class YchControl extends Homey.App {

  onInit() {
    this.startupOperations();
    this.log('Legrand Home Control API integration for Homey is running...');
  }

  //Fonction contenant l'affectation des variables néscéssaires au bon fonctionnement du programme
  async startupOperations() {
    //Dictionnaire global contenant les différentes valeurs néscéssaires pour communiquer avec l'API Legrand
    this.GLOBAL_AUTH_MAP = {
      client_id: Homey.env.CLIENT_ID,
      client_secret: Homey.env.CLIENT_SECRET,
      subscription_key: Homey.env.SUBSCRIPTION_KEY,
      access_token: this.getStoredSettings('access_token'),
      refresh_token: this.getStoredSettings('refresh_token'),
      code: undefined,
    };

    //Timer global afin de pouvoir debounce la fonction refreshAllDevicesStatuses, qui est appellée dans chaque instances
    //de driver pour refresh leur status, d'ou le call debounced
    this.timer;
    //Emitter néscessaire (ou pas, à voir si homey l'intègre directement) pour dire aux instances devices que leur status
    //a été refreshed
    this.emitter = new events.EventEmitter();
    //Instanciations globale de cette classe statique car elle intègre les méthodes pour intéragir avec l'api
    this.legrand_api = LegrandAPI;
    await this.refreshAccessToken().catch(err => this.log(err));
    this.periodicalRefreshStatus(this);
  }

  //Cette méthode permet de reset le timer
  clearTimeout(){
    this.homey.clearTimeout(this.timer);
  }

  //Cette fait un appel périodique de refreshAllDevicesStatuses
  //Elle prend en paramètre une référence à l'instance Legrand, pour accéder à ses méthodes
  //Obligatoire parce que le callback de setInterval ne permet pas d'utiliser le key word "this".
  periodicalRefreshStatus(context){
    this.homey.setInterval(function () {
      context.refreshAllDevicesStatus();
    }, 10*60000);
  }

  //Cette méthode permet d'accéder aux status de tous les devices, avec un workaround particulier
  //Car l'appel de l'emmiter se fait au sain de getPlantsDevicesStatus
  //La méthode renvoie des dictionnaires contenants les memes valeurs pour chaques clés, à regler...
  refreshAllDevicesStatus(){
    //On commence par voir si des devices ont été ajoutés dans Homey, sinon on arrete
    const plants = this.getStoredSettings('plants');
    if (plants === null) {
      return false;
    }
    //On place une reference context à l'instance
    const context = this;
    //Ici on debounce l'appel de la méthode
    this.clearTimeout();
    //Le callback est ultimement appelé à la fin du timer.
    this.timer = context.homey.setTimeout(function(){
      //On check si les tokens sont toujours valide, la réponse est passée sous forme de promesse
      context.refreshAccessToken().then(auth => {
        //Pour les besoins de la méthode getPlantsDevicesStatus on récupère un dico contenant le HwType par id de module
        const HwTypeArray = context.getStoredSettings('HwTypeArray');
        //On fini par faire un appel de getPlantsDevicesStatus dans une boucle si l'utilisateur à plusieurs "Plants" enregistrés
        for (let plant of plants){
          context.legrand_api.getPlantsDeviceStatus(auth, plant.id, HwTypeArray, context).then(res => {
            context.log(res);
          }).catch(err => context.log(err));
        }
      }).catch(err => context.log(err));
    }, 5000);
  }

  //Méthode qui permet de rafraîchir les token s'ils sont outated ou simplement de renvoyer que tout est bon
  //Elle passe Global_Auth_Map dans ses resolve
  refreshAccessToken() {
    return new Promise((resolve, reject) => {
      this.checkTokensTimeout().then(res => {
        this.log(res);
        resolve(this.GLOBAL_AUTH_MAP);
      }).catch(err => {
        if (err === 'refresh_token') {
          this.legrand_api.getAccessToken(this.GLOBAL_AUTH_MAP).then(res => {
            this.registerTokens(res);
            this.log('[TOKEN] Tokens Refreshed');
            resolve(this.GLOBAL_AUTH_MAP);
          }).catch(error => {
            reject(error);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  //Cette méthode compare avec les constantes au début du programme, le moment ou les Tokens ont été enregistré en mémoire
  async checkTokensTimeout() {
	  const now = Date.now();
	  const lastToken = await this.getStoredSettings('last_token_date');
	  const signed = await this.getStoredSettings('signed');
	  const accessToken = this.getStoredSettings('access_token');

    return new Promise((resolve, reject) => {
      //On regarde premièrement si l'utilisateur s'est déja log pour enregistrer ses tokens
      if (lastToken === undefined || signed === false || accessToken === undefined) {
        this.log('No tokens stored, setting "signed" parameter to false');
        this.updateStoredSettings('signed-in', false);
        reject('log-in');
      }
      if (now - lastToken > access_Token_Timeout) {
        this.log('[TOKEN] Access Token Outated, refreshing tokens ...');
        if (now - lastToken > refresh_Token_Timeout) {
          this.log('[TOKEN] Refresh Token Outated, please log again');
          this.updateStoredSettings('signed', false);
          reject('log-again');
        }
        reject('refresh_token');
      }

      resolve('[TOKEN] Access and Refresh Tokens are still good');
    });
  }

  registerTokens(json) {
    this.updateStoredSettings('last_token_date', Date.now());
    this.updateStoredSettings('access_token', json['access_token']);
    this.updateStoredSettings('refresh_token', json['refresh_token']);
    this.GLOBAL_AUTH_MAP['access_token'] = json['access_token'];
    this.GLOBAL_AUTH_MAP['refresh_token'] = json['refresh_token'];
  }

  getStoredSettings(key) {
    return this.homey.settings.get(key);
  }

  updateStoredSettings(key, value) {
    this.homey.settings.set(key, value);
  }

  makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

}

module.exports = YchControl;