'use strict';

class LegrandDevices {

    static onInitLegrand(HomeyDevice){
        HomeyDevice.log('Device init');
        HomeyDevice.log('Name', HomeyDevice.getName());
        HomeyDevice.log('Class', HomeyDevice.getClass());

        HomeyDevice.data = LegrandDevices.getDeviceMap(HomeyDevice);
        //HomeyDevice.log(HomeyDevice.data);
        LegrandDevices.registerDeviceCapabilitiesListener(HomeyDevice);

        //Listener for device state change
        LegrandDevices.deviceListener(HomeyDevice);

        LegrandDevices.refreshDeviceStatus(HomeyDevice);
        HomeyDevice.log(HomeyDevice.getName(), 'has been inited');

        //Code pour les Flows
        const capa = HomeyDevice.getCapabilities();
        for (let item of capa){
            if (item === 'windowcoverings_level'){
                HomeyDevice.flowProperty = {"cap" : 'windowcoverings_level', "lastState": 0};
            }
            else if (item === 'wiredpilot_mode'){
                HomeyDevice.flowProperty = {"cap" : 'wiredpilot_mode', "lastState": "cool"};
            }
            else (HomeyDevice.flowProperty = undefined)
        }
    }

    static onAddedSync(HomeyDevice){
        LegrandDevices.getDeviceStatus(HomeyDevice);
    }

    static setAvaibility(HomeyDevice, res ){
        return new Promise((resolve, reject) => {
            if (res === true) {
                HomeyDevice.setAvailable().catch(err => reject(err));
                resolve(HomeyDevice.getName() + ' Availaible');
            }
            else{
                HomeyDevice.setUnavailable().catch(err => reject(err));
                resolve(HomeyDevice.getName() + ' Unavailaible');
            }
        })
    }

    static deviceListener (HomeyDevice) {
        HomeyDevice.homey.app.emitter.on('state_device_changed', (key, data) => {
            if (key === HomeyDevice.data['id']) (LegrandDevices.onRefreshDeviceStatus(HomeyDevice, data));
        });
        HomeyDevice.homey.app.emitter.on('refresh-status', (key, data) => {
            LegrandDevices.refreshDeviceStatus(HomeyDevice);
        });
    }

    //Write on homey device statuses result query
    static setStatus (HomeyDevice, res){
        const name = HomeyDevice.getName();
        return new Promise((resolve, reject) => {
            for (let [key,value] of Object.entries(res)){
                if (key === 'avaibility') {
                    LegrandDevices.setAvaibility(HomeyDevice, value).then(mess => {
                        HomeyDevice.log(mess);
                    }).catch(err => reject(err));
                }
                else {
                    HomeyDevice.setCapabilityValue(key, value).catch(err => reject(err));
                    HomeyDevice.log('['+name+'] / '+key +': ', value);

                    //Code pour trigger les custom flows
                    HomeyDevice.log(HomeyDevice.flowProperty);
                    if (HomeyDevice.flowProperty !== undefined){
                        if (key === HomeyDevice.flowProperty.cap && value !== HomeyDevice.flowProperty.lastState){
                            HomeyDevice.flowProperty.lastState = value;
                            HomeyDevice.driver.triggerMyFlow(HomeyDevice, value);
                        }
                    }
                }
            }
            resolve('['+name+'] / '+'Statuses correclty sets');
        });
    }

    static runScene(HomeyDevice, data){
        return new Promise((resolve, reject) => {
            HomeyDevice.homey.app.refreshAccessToken().then(async auth => {
                await HomeyDevice.homey.app.legrand_api.runScene(auth, data).then(res => {
                    resolve(res);
                }).catch(err => reject (err));
            }).catch(err => reject (err));
        })
    }

    static refreshDeviceStatus(HomeyDevice){
        HomeyDevice.homey.app.legrandBuffer.getRequestBuffer(HomeyDevice.data).catch(err => {
            HomeyDevice.log(err);
            HomeyDevice.homey.app.logger.log("["+HomeyDevice.data.name+"] " +err);
        });
    }

    static getDeviceStatus(HomeyDevice) {
        HomeyDevice.homey.app.legrandBuffer.getRequestBuffer(HomeyDevice.data).then(res => {
            LegrandDevices.setStatus(HomeyDevice, res).then(mess => {
                HomeyDevice.log(mess);
            }).catch(err => {
                HomeyDevice.log(err);
                HomeyDevice.homey.app.logger.log("["+HomeyDevice.data.name+"] " +err);
            });
        }).catch(err => {
            HomeyDevice.log(err);
            HomeyDevice.homey.app.logger.log("["+HomeyDevice.data.name+"] " +err);
        });
}

    static registerDeviceCapabilitiesListener(HomeyDevice){
        HomeyDevice.registerMultipleCapabilityListener(HomeyDevice.getCapabilities(), ( capabilityValues) => {
            LegrandDevices.onCapabilityChange(HomeyDevice, capabilityValues)
                .then(res => {
                    LegrandDevices.getDeviceStatus(HomeyDevice);
                    HomeyDevice.log(res);
                })
                .catch(err => {
                    HomeyDevice.log(err);
                    HomeyDevice.homey.app.logger.log("["+HomeyDevice.data.name+"] " +err);
                    //Lors d'une erreur dans la requête même si l'appareil est dispo il est désactiver
                    //todo : il faut créer une fonction qui lit le contenu de l'érreur et qui traite ça
                    //HomeyDevice.setUnavailable().catch(err => reject(err)); //Peut etre trouver une condition pour éviter des bogues
                });
        }, 500);
    }
    static async onCapabilityChange(HomeyDevice, capabilityValues) {
        return new Promise((resolve, reject) => {
            HomeyDevice.homey.app.legrandBuffer.postRequestBuffer(HomeyDevice.data, capabilityValues).then(res => {
                resolve(res);
            }).catch(err => reject(err));
        });
    }
    static onRefreshDeviceStatus(HomeyDevice, data) {
        LegrandDevices.setStatus(HomeyDevice, data).then(mess => {
            HomeyDevice.log(mess);
        }).catch(err => {
            HomeyDevice.log(err)
            HomeyDevice.homey.app.logger.log("["+HomeyDevice.data.name+"] " +err);
        });
    }

    static getDeviceMap(HomeyDevice) {
        const data = [HomeyDevice.getData(), HomeyDevice.getStore()];
        let res = {"name": HomeyDevice.getName()};

        for (const item of data) {
            for (const property of Object.keys(item)) {
                res[property] = item[property];
            }
        }
        return res;
    }
}

module.exports = LegrandDevices;