conversion = require('./LegrandHomeyConversion');

class Buffer{
    
    constructor() {
        this.queue = [];
        //key : device id ; value : Index in queue
        this.index = {};
        this.inc = 0;
    }
    
    increment() {
        this.inc = this.inc + 1;
    }

    addToBuffer(request){
        if(!this.idAlreadyInqueue(request.deviceId)){
            this.queue.push(request);
            this.index[request.deviceId] = this.inc;
            this.increment();
        }
       else{
           const index = this.indexOfRequest(request);
           this.queue[index].update(request);
        }
    }
    
    removeRequest(request){
        const index = this.indexOfRequest(request);
        this.queue.slice(index,1);
        this.inc = this.inc - 1;
    }
    
    indexOfRequest(req){
        return this.index[req.deviceId];
    }

    idAlreadyInqueue (deviceId){
        return this.index.hasOwnProperty(deviceId);
    }
    
    clear(){
        this.queue = [];
        this.index = {};
        this.inc = 0;
    }
    
    printBuffer(){
        console.log(this.queue, this.index, this.inc);
    }

    getModuleIds(){
        let res = [];
        for (const item of this.queue){
            res.push(item.deviceId)
        }
        return res;
    }

    getPlantsIds(){
        let res = [];
        for (const item of this.queue){
            if (!Buffer.hasElement(res, item.plantId)) (res.push(item.plantId))
        }
        return res;
    }

    static hasElement(array, element){
        for (const item of array){
            if(item === element) return true;
        }
        return false;
    }

     async toBody(plantId){
        return new Promise((resolve, reject) => {
            let body = {"home": {"id": plantId}};
            let modules = [];
            for (const req of this.queue){
                if (req.plantId === plantId){
                    const form = {
                        "id" : req.deviceId,
                        "bridge": req.bridge
                    }
                    modules.push(conversion.jsonConcat(form, conversion.deviceStatusToApi(req.capabilityValue)));
                }
            }
            body["home"]["modules"]=modules;
            resolve(body);
        });
    }

}

module.exports = Buffer;