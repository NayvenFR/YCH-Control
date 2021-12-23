'use strict';

const request = require('./lib/LegrandRequest');
const Buffer = require('./lib/Buffer');

class LegrandBuffer {

    static startup(HomeyApp) {

        this.pTimer;
        this.gTimer;

        //GET REQUEST VAR
        this.getBuffer = new Buffer();
        //POST REQUEST VAR
        this.postBuffer = new Buffer();

        this.ych = HomeyApp;
    }

    //VIDE LE BUFFER
    static clearPostBuffer(){
        this.postBuffer.clear();
    }
    static clearGetBuffer(){
        this.getBuffer.clear();
    }


    static postRequestBuffer(data, capabilityValue) {
        this.ych.homey.clearTimeout(this.pTimer);

        const req = new request(data.type,data.bridge, data.id, data.plantId, capabilityValue);

        this.postBuffer.addToBuffer(req);

        const context = this;
        return new Promise((resolve, reject) => {
            this.pTimer = this.ych.homey.setTimeout(function () {
                LegrandBuffer.postRequest().then(res => {
                    context.clearPostBuffer();
                    resolve(res);
                }).catch(err => {
                    context.clearPostBuffer();
                    reject(err)
                });
            }, this.ych.homey.app.sendSpeed);
        });

    }

    static postRequest() {

        return new Promise(async (resolve, reject) =>  {
            for (const plant of this.postBuffer.getPlantsIds()){
                const body = await this.postBuffer.toBody(plant);
                this.ych.homey.app.refreshAccessToken().then(async auth =>{
                    await this.ych.homey.app.legrand_api.setDeviceStatus(auth, body).then(res => {
                        this.ych.homey.app.log(res);
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            }
            this.ych.homey.app.emitter.emit('refresh-status');
            resolve('OK');
        });
    }

    static getRequest() {
        return new Promise((resolve, reject) => {
            for (let plantId of this.getBuffer.getPlantsIds()){
                this.ych.homey.app.refreshAccessToken().then(async auth => {
                    this.ych.homey.app.legrand_api.getPlantsDeviceStatus(auth, plantId, this.ych.homey.app.emitter).then(res => {
                        resolve("OK");
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            }
        });
    }

    static getRequestBuffer(data) {
        this.ych.homey.clearTimeout(this.gTimer);

        const req = new request(data.type, data.bridge, data.id, data.plantId, undefined);

        this.getBuffer.addToBuffer(req);

        const context = this;
        return new Promise((resolve, reject) => {
            this.gTimer = this.ych.homey.setTimeout(function () {
                LegrandBuffer.getRequest().then(res => {
                    context.clearGetBuffer();
                    resolve(res);
                }).catch(err => {
                    context.clearGetBuffer();
                    reject(err)
                });
            }, this.ych.homey.app.delaySpeed);
        });
    }

}

module.exports = LegrandBuffer;