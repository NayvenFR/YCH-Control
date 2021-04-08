'use strict';

const request = require('./lib/LegrandRequest');

class LegrandBuffer {

    static startup(HomeyApp) {

        this.pTimer;
        this.gTimer;

        //GET REQUEST VAR
        this.getBuffer = {"requestPerId" : {}, "moduleDataPerId" : {}};
        this.lastModuleId2 = null;
        this.getReqCount = 0;

        //POST REQUEST VAR
        this.postBuffer = {"idPerDevice" : {}, "requestPerId" : {}};
        this.lastModuleId = [];
        this.postReqCount = 0;

        this.ych = HomeyApp;
    }

    //GROUPE LES DEVICE ID PAR ID DE REQUETES
    static orderIds(key){
        return new Promise(resolve => {
            let ids = [];
            for (let [id, val] of Object.entries(this.postBuffer.idPerDevice)){
                if (key == val) {ids.push(id);}
            }
            resolve(ids);
        })
    }

    //VIDE LE BUFFER
    static clearPostBuffer(){
        this.postBuffer = {"idPerDevice" : {}, "requestPerId" : {}};
        this.lastModuleId = [];
        this.postReqCount = 0;
    }
    static clearGetBuffer(){
        this.getBuffer = {"requestPerId" : {}, "moduleDataPerId" : {}};
        this.lastModuleId2 = null;
        this.getReqCount = 0;
    }

    //REGARDE SI UNE REQUETE EXISTE DEJA
    static checkRequestExist(buffer, req) {
        for (let [key, value] of Object.entries(buffer.requestPerId)) {
            if (value.equals(req)) {
                return key;
            }
        }
        return -1;
    }

    static postRequestBuffer(data, capabilityValue) {
        this.ych.homey.clearTimeout(this.pTimer);

        const req = new request(data.device, data.plantId, capabilityValue);
        if (!this.lastModuleId.includes(data.id)){
            this.lastModuleId.push(data.id);
            this.postReqCount = this.postReqCount + 1;
        }
        let key = this.checkRequestExist(this.postBuffer,req);

        //On check si la requete existe dejà
        if (key === -1){
            //Elle n'existe pas on la créer
            this.postBuffer.requestPerId[this.postReqCount] = req;
            key = this.postReqCount;
        }
        //On met à jour la requete liée au device
        this.postBuffer.idPerDevice[data.id] = key;

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
            if (this.postReqCount >= 2) {
                    for (let [key, request] of Object.entries(this.postBuffer.requestPerId)) {
                        await this.orderIds(key).then(ids => {
                            if (ids !== []){
                                this.ych.homey.app.refreshAccessToken().then(async auth =>{
                                    await this.ych.homey.app.legrand_api.setMultipleDeviceStatus(auth, request, ids).then(res => {
                                        this.ych.homey.app.log(res);
                                    }).catch(err => reject(err));
                                }).catch(err => reject(err));
                            }
                        })
                    }
                    this.ych.homey.app.emitter.emit('refresh-status');
            }
            else
            {
                const body = this.postBuffer.requestPerId[1].capabilityValue;
                const deviceData = {"device" : this.postBuffer.requestPerId[1].deviceType, "plantId" : this.postBuffer.requestPerId[1].plantId, "id" : this.lastModuleId};
                this.ych.homey.app.refreshAccessToken().then(async auth => {
                    await this.ych.homey.app.legrand_api.setDeviceStatus(auth, deviceData, body).then(res => {
                        this.ych.homey.app.log(res);
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            }
            resolve('OK');
        });
    }

    static getRequest() {
        return new Promise((resolve, reject) => {
                if (this.getReqCount >= 2) {
                    for (let val of Object.values(this.getBuffer.requestPerId)){
                        this.ych.homey.app.refreshAccessToken().then(async auth => {
                            this.ych.homey.app.legrand_api.getPlantsDeviceStatus(auth, val.plantId, this.ych.homey.app.emitter).then(res => {
                                resolve("OK");
                            }).catch(err => reject(err));
                        }).catch(err => reject(err));
                    }
                } else {
                    this.ych.homey.app.refreshAccessToken().then(async auth => {
                        this.ych.homey.app.legrand_api.getDeviceStatus(auth, this.getBuffer.moduleDataPerId[1]).then(res => {
                            resolve(res);
                        }).catch(err => {
                            reject(err);
                        });
                    }).catch(err => reject(err))
                }
        });
    }

    static getRequestBuffer(data) {
        this.ych.homey.clearTimeout(this.gTimer);

        if(data.id !== this.lastModuleId2){
            this.getReqCount = this.getReqCount + 1;
        }
        this.lastModuleId2 = data.id;

        const req = new request(null, data.plantId,null);
        req.type = "get";
        let key = this.checkRequestExist(this.getBuffer,req);

        //On check si la requete existe dejà
        if (key === -1){
            //Elle n'existe pas on la créer
            this.getBuffer.requestPerId[this.getReqCount] = req;
            key = this.getReqCount;
        }
        //On met à jour la requete liée au device
        this.getBuffer.moduleDataPerId[key] = data;

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