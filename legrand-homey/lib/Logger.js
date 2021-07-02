class Logger{

    constructor(HomeyApp) {
        //KEY : ENTRY NUMBER // VAL : ENTRY
        this.ych = HomeyApp;
    }

    log(entry) {
        const event = new Date();
        this.ych.homey.app.log(event.toLocaleString() + " : " + entry);
        this.ych.homey.app.updateStoredSettings('logDevice', event.toLocaleString() + " : " + entry);
    }

}

module.exports = Logger;
