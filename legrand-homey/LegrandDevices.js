'use strict';

class LegrandDevices {

    static onInitLegrand(HomeyDevice){
        HomeyDevice.log('Device init');
        HomeyDevice.log('Name', HomeyDevice.getName());
        HomeyDevice.log('Class', HomeyDevice.getClass());

        HomeyDevice.data = LegrandDevices.getDeviceMap(HomeyDevice);
        LegrandDevices.registerDeviceCapabilitiesListener(HomeyDevice);

        //Listener for device state change
        LegrandDevices.deviceListener(HomeyDevice);

        LegrandDevices.refreshDeviceStatus(HomeyDevice);
        HomeyDevice.log(HomeyDevice.getName(), 'has been inited');
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
                }
            }
            resolve('['+name+'] / '+'Statuses correclty sets');
        });
    }
    static refreshDeviceStatus(HomeyDevice){
        HomeyDevice.homey.app.refreshAccessToken().then(auth => {
            HomeyDevice.homey.app.requestBuffer.getRequestBuffer(HomeyDevice.data, auth).catch(err => HomeyDevice.log(err));
        }).catch(err => HomeyDevice.log(err))
    }
    static getDeviceStatus(HomeyDevice) {
        HomeyDevice.homey.app.refreshAccessToken().then(auth => {
            HomeyDevice.homey.app.requestBuffer.getRequestBuffer(HomeyDevice.data, auth).then(res => {
                LegrandDevices.setStatus(HomeyDevice, res).then(mess => {
                    HomeyDevice.log(mess);
                }).catch(err => HomeyDevice.log(err));
            }).catch(err => HomeyDevice.log(err));
        }).catch(err => HomeyDevice.log(err))
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
                    //Lors d'une erreur dans la requête même si l'appareil est dispo il est désactiver
                    //todo : il faut créer une fonction qui lit le contenu de l'érreur et qui traite ça
                    //HomeyDevice.setUnavailable().catch(err => reject(err)); //Peut etre trouver une condition pour éviter des bogues
                });
        }, 500);
    }
    static async onCapabilityChange(HomeyDevice, capabilityValues) {
        return new Promise((resolve, reject) => {
            HomeyDevice.homey.app.refreshAccessToken().then(async auth => {
                HomeyDevice.homey.app.requestBuffer.postRequestBuffer(HomeyDevice.data, capabilityValues, auth).then(res => {
                    resolve(res);
                }).catch(err => reject(err));
            }).catch(err => {
                reject(err);
            });
        });
    }
    static onRefreshDeviceStatus(HomeyDevice, data) {
        LegrandDevices.setStatus(HomeyDevice, data).then(mess => {
            HomeyDevice.log(mess);
        }).catch(err => HomeyDevice.log(err));
    }
    static getDeviceMap(HomeyDevice) {
        const data = [HomeyDevice.getData(), HomeyDevice.getStore()];
        let res = {};

        for (const item of data) {
            for (const property of Object.keys(item)) {
                res[property] = item[property];
            }
        }
        return res;
    }
}

module.exports = LegrandDevices;