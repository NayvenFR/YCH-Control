'use strict';

const Homey = require('homey');
const events = require('events');
const LegrandAPI = require('/legrand-homey/LegrandAPI');
const LegrandBuffer = require('/legrand-homey/LegrandBuffer');
const Logger = require('/legrand-homey/lib/Logger');
const fullDayMs = 24*60*60*1000;
const access_Token_Timeout = 3600 * 1000;
const refresh_Token_Timeout = 7776000 * 1000;
const default_sync_speed = 10*60000;
const default_delay_speed = 5000;
const default_send_speed = 2000;

class YchApp extends Homey.App {

    //Fonction contenant l'affectation des variables néscéssaires au bon fonctionnement du programme
    startupOperations() {

        //Dictionnaire global contenant les différentes valeurs néscéssaires pour communiquer avec l'API Legrand
        this.GLOBAL_AUTH_MAP = {
            client_id: Homey.env.CLIENT_ID,
            client_secret: Homey.env.CLIENT_SECRET,
            subscription_key: Homey.env.SUBSCRIPTION_KEY,
            access_token: this.getStoredSettings('access_token'),
            refresh_token: this.getStoredSettings('refresh_token'),
            code: undefined,
        };

        //Emitter néscessaire (ou pas, à voir si homey l'intègre directement) pour dire aux instances devices que leur status
        //a été refreshed
        this.emitter = new events.EventEmitter();

        //Instanciations globale de cette classe statique car elle intègre les méthodes pour intéragir avec l'api
        this.legrand_api = LegrandAPI;
        this.legrandBuffer = LegrandBuffer;
        this.logger = new Logger(this);
        this.legrandBuffer.startup(this);

        this.initSpeeds(this);
        this.checkRequestCounts();
        this.periodicalRefreshStatus(this, this.syncSpeed);
    }

    clearInterval(){
        this.homey.clearInterval(this.interval);
    }

    onChangePeriodicalRefreshStatusTimeout(delay){
        this.clearInterval();
        this.periodicalRefreshStatus(this, delay);
    }

    updateRequestCounts(){
        this.checkRequestCounts();
        let requestCounts = this.getStoredSettings('requestsCounts');
        requestCounts = requestCounts + 1;
        this.updateStoredSettings('requestsCounts', requestCounts);
    }

    checkRequestCounts(){
        const latestDateRegistered = this.getStoredSettings('countDate');
        const now = Date.now();

        if (now - latestDateRegistered > fullDayMs){
            this.updateStoredSettings('countDate', now);
            const requestCounts = 0;
            this.updateStoredSettings('requestsCounts', requestCounts);
        }
        else if (latestDateRegistered === null) {
            this.updateStoredSettings('countDate', now);
            const requestCounts = 0;
            this.updateStoredSettings('requestsCounts', requestCounts);
        }

    }

    initSpeeds() {
        if (this.getStoredSettings('sync_speed') == null){
            this.syncSpeed = default_sync_speed;
            this.updateStoredSettings('sync_speed', this.syncSpeed);
        }
        else{
            this.syncSpeed = this.getStoredSettings('sync_speed');
        }

        if (this.getStoredSettings('delay_speed') == null){
            this.delaySpeed = default_delay_speed;
            this.updateStoredSettings('delay_speed', this.delaySpeed);
        }
        else{
            this.delaySpeed = this.getStoredSettings('delay_speed');
        }

        if (this.getStoredSettings('send_speed') == null){
            this.sendSpeed = default_send_speed;
            this.updateStoredSettings('send_speed', this.sendSpeed);
        }
        else{
            this.sendSpeed = this.getStoredSettings('send_speed');
        }

        const context = this;
        this.homey.settings.on('set', function (key) {
            if (key === 'sync_speed'){
                context.syncSpeed = context.getStoredSettings('sync_speed');
                context.onChangePeriodicalRefreshStatusTimeout(context.syncSpeed);
            }
            else if (key === 'delay_speed'){
                context.delaySpeed = context.getStoredSettings('delay_speed');
            }
            else if (key === 'send_speed'){
                context.sendSpeed = context.getStoredSettings('send_speed');
            }
        })
    }

    periodicalRefreshStatus(context, delay){
        this.interval = this.homey.setInterval(function () {
            context.emitter.emit('refresh-status');
        }, delay);
    }

    //Méthode qui permet de rafraîchir les token s'ils sont outated ou simplement de renvoyer que tout est bon
    //Elle passe Global_Auth_Map dans ses resolve
    refreshAccessToken() {
        return new Promise((resolve, reject) => {
            this.checkTokensTimeout().then(res => {
                this.updateRequestCounts();
                this.log(res);
                resolve(this.GLOBAL_AUTH_MAP);
            }).catch(err => {
                if (err === 'refresh_token') {
                    this.legrand_api.getAccessToken(this.GLOBAL_AUTH_MAP).then(res => {
                        this.registerTokens(res);
                        this.log('[TOKEN] Tokens Refreshed');
                        this.updateRequestCounts();
                        resolve(this.GLOBAL_AUTH_MAP);
                    }).catch(error => {
                        reject(error);
                        this.logger.log(error);
                    });
                } else {
                    reject(err);
                    this.logger.log(err);
                }
            });
        });
    }

    //Cette méthode compare avec les constantes au début du programme, le moment ou les Tokens ont été enregistré en mémoire
    async checkTokensTimeout() {
        const now = Date.now();
        const lastToken = await this.getStoredSettings('last_token_date');
        const signed = await this.getStoredSettings('signed');
        const accessToken = await this.getStoredSettings('access_token');

        return new Promise((resolve, reject) => {
            //On regarde premièrement si l'utilisateur s'est déja log pour enregistrer ses tokens
            if (lastToken === undefined || signed === false || accessToken === undefined) {
                this.log('No tokens stored, setting "signed" parameter to false');
                this.updateStoredSettings('signed-in', false);
                reject('please log-in');
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
}

module.exports = YchApp;