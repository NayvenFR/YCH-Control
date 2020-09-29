'use strict';

class LegrandDevices {

    static onInitLegrand(HomeyDevice){
        HomeyDevice.log('Device init');
        HomeyDevice.log('Name', HomeyDevice.getName());
        HomeyDevice.log('Class', HomeyDevice.getClass());

        HomeyDevice.data = LegrandDevices.getDeviceMap(HomeyDevice);
        HomeyDevice.timer;
        HomeyDevice.homey.app.refreshAllDevicesStatus();
        LegrandDevices.registerDeviceCapabilitiesListener(HomeyDevice);

        //Listener for device state change
        HomeyDevice.homey.app.emitter.on('state_device_changed', (key, data) => {
            if (key === HomeyDevice.data['id']) (LegrandDevices.onRefreshDeviceStatus(HomeyDevice, data));
        });

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

    //Write on homey device statuses result query
    static setStatus (HomeyDevice, res){

        return new Promise((resolve, reject) => {
            for (let key of Object.keys(res)){
                if (key === 'availability') {
                    LegrandDevices.setAvaibility(HomeyDevice, res[key]).then(mess => {
                        HomeyDevice.log(mess);
                    }).catch(err => reject(err));
                }
                else {
                    HomeyDevice.setCapabilityValue(key, res[key]).catch(err => reject(err));
                    HomeyDevice.log(key +': ', res[key]);
                }
            }
            resolve('Statuses correclty sets');
        });
    }

    static getDeviceStatus(HomeyDevice) {
        HomeyDevice.homey.app.refreshAccessToken().then(auth => {
            HomeyDevice.homey.app.legrand_api.getDeviceStatus(auth, HomeyDevice.data).then(res => {
                LegrandDevices.setStatus(HomeyDevice, res).then(mess => {
                    HomeyDevice.log(mess);
                }).catch(err => HomeyDevice.log(err));
            }).catch(err => HomeyDevice.log(err));
        }).catch(err => HomeyDevice.log(err))
}
    static getStatusDebounceCall(HomeyDevice ,delay) {
        HomeyDevice.homey.app.clearTimeout();
        HomeyDevice.homey.clearTimeout(HomeyDevice.timer);
        HomeyDevice.timer = HomeyDevice.homey.setTimeout(function(){
            LegrandDevices.getDeviceStatus(HomeyDevice);
        }, delay);
    }

    static registerDeviceCapabilitiesListener(HomeyDevice){
        HomeyDevice.registerMultipleCapabilityListener(HomeyDevice.getCapabilities(), ( capabilityValues, capabilityOptions ) => {
            LegrandDevices.onCapabilityChange(HomeyDevice, capabilityValues ,capabilityOptions)
                .then(res => {
                    LegrandDevices.getStatusDebounceCall(HomeyDevice, HomeyDevice.homey.app.delaySpeed);
                    HomeyDevice.log(res);
                })
                .catch(err => {
                    HomeyDevice.log(err);
                    HomeyDevice.setUnavailable().catch(err => reject(err)); //Peut etre trouver une condition pour éviter des bogues
                });
        }, 1000);
    }

    static async onCapabilityChange(HomeyDevice, capabilityValues, opts) {
        return new Promise((resolve, reject) => {
            HomeyDevice.homey.app.refreshAccessToken().then(async auth => {
                HomeyDevice.homey.app.legrand_api.setDeviceStatus(auth, HomeyDevice.data, capabilityValues).then(res => {
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