'use strict';

const DEFAULT_VALUE_MAP = {
    onoff : false,
    dim: 0
}

class LegrandDevices {

    static onInitLegrand(HomeyDevice){
        HomeyDevice.log('Device init');
        HomeyDevice.log('Name', HomeyDevice.getName());
        HomeyDevice.log('Class', HomeyDevice.getClass());

        HomeyDevice.data = LegrandDevices.getDeviceMap(HomeyDevice);
        HomeyDevice.valueMap = LegrandDevices.setDeviceValuesMap(HomeyDevice);
        HomeyDevice.timer;

        HomeyDevice.homey.app.refreshAllDevicesStatus();
        LegrandDevices.registerDeviceCapabilitiesListener(HomeyDevice);

        HomeyDevice.homey.app.emitter.on('state_device_changed', (key, data) => {
            if (key === HomeyDevice.data['id']) (LegrandDevices.onRefreshDeviceStatus(HomeyDevice, data));
        });

        HomeyDevice.log(HomeyDevice.getName(), 'has been inited');
    }

    static getStatusDebounceCall(HomeyDevice ,delay) {
        HomeyDevice.homey.app.clearTimeout();
        HomeyDevice.homey.clearTimeout(HomeyDevice.timer);
        HomeyDevice.timer = HomeyDevice.homey.setTimeout(function(){
            LegrandDevices.getDeviceStatus(HomeyDevice);
        }, delay);
    }

    // res est le resFrom['availability']
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
        HomeyDevice.homey.app.refreshAccessToken().then(res => {
            const AUTH_MAP = res;
            HomeyDevice.homey.app.legrand_api.getDeviceStatus(AUTH_MAP, HomeyDevice.data).then(res => {
                LegrandDevices.setStatus(HomeyDevice, res).then(mess => {
                    HomeyDevice.log(mess);
                }).catch(err => HomeyDevice.log(err));
            }).catch(err => HomeyDevice.log(err));
        }).catch(err => HomeyDevice.log(err))
}

    static registerDeviceCapabilitiesListener(HomeyDevice){
        HomeyDevice.registerMultipleCapabilityListener(HomeyDevice.getCapabilities(), ( capabilityValues, capabilityOptions ) => {
            LegrandDevices.onCapabilityChange(HomeyDevice, HomeyDevice.getCapabilities(), capabilityValues,capabilityOptions)
                .then(nothingIsPassed => {return Promise.resolve()})
                .catch(err => Promise.reject(err));
            LegrandDevices.getStatusDebounceCall(HomeyDevice, 1000);
        }, 1000);
    }

    static onRefreshDeviceStatus(HomeyDevice, data) {
        LegrandDevices.setStatus(HomeyDevice, data).then(mess => {
            HomeyDevice.log(mess);
        }).catch(err => HomeyDevice.log(err));
    }

    static getDeviceMap(HomeyDevice) {
        const data = [HomeyDevice.getData(), HomeyDevice.getStore()];

        const res = {};

        for (const item of data) {
            for (const property of Object.keys(item)) {
                res[property] = item[property];
            }
        }
        return res;
    }

    static setDeviceValuesMap(HomeyDevice){
        let res = new Map();
        const capabilities = HomeyDevice.getCapabilities();
        for (let capability of capabilities){
            res.set(capability, DEFAULT_VALUE_MAP[capability]);
        }
        return res;
    }

    static changeDeviceValuesMap(HomeyDevice,capabilitiesIdArray, valuesArray) {
        for (let capability of capabilitiesIdArray){
            HomeyDevice.valueMap.set(capability, valuesArray[capability]);
        }
    }

    static async onCapabilityChange(HomeyDevice, capabilitiesIdArray, valuesArray, opts) {
        HomeyDevice.homey.app.refreshAccessToken().then(async res => {
            const AUTH_MAP = res;
            LegrandDevices.changeDeviceValuesMap(HomeyDevice, capabilitiesIdArray, valuesArray);

            HomeyDevice.homey.app.legrand_api.setDeviceStatus(AUTH_MAP, HomeyDevice.data, HomeyDevice.valueMap).then(res => {
                HomeyDevice.log(res);
                return Promise.resolve();
            }).catch(err => HomeyDevice.log(err));

        }).catch(err => {
            return Promise.reject(err)
        });
    }
}

module.exports = LegrandDevices;