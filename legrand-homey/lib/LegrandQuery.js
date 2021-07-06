'use strict';

const fetch = require('./node-fetch');

// URL and BODIES for Legrand API interaction

const urlList = {
  TOKEN_URL: 'https://partners-login.eliotbylegrand.com/token',
  PLANT_URL: 'https://api.developer.legrand.com/hc/api/v1.0/plants/{TOPOLOGY}',
  PLANT_URL_STATUS : 'https://api.developer.legrand.com/hc/api/v1.0/plants/{plantId}',
  DEVICE_STATUS: 'https://api.developer.legrand.com/hc/api/v1.0/{DEVICE_TYPE}/addressLocation/plants/{plantId}/modules/parameter/id/value/{moduleId}',
  TOKEN_BODY: 'grant_type={GRANT_TYPE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&{TOKEN_TYPE}',
  PLANT_DEVICE_STATUS: 'https://api.developer.legrand.com/hc/api/v1.0/{DEVICE_TYPE}/addressLocation/plants/{plantId}',
  GET_SCENE : 'https://api.developer.legrand.com/hc/api/v1.0/scene/comfort/addressLocation/plants/{plantId}',
  RUN_SCENE : 'https://api.developer.legrand.com/hc/api/v1.0/scene/comfort/addressLocation/plants/{plantId}/modules/parameter/id/value/{sceneId}'

};

// Replace in DEVICE_STATUS url the {DEVICE_TYPE} to get the right url for API interaction
//Because devices are sorted by categories and the URL to call each type is different

const deviceUrlPerType = {
  light: 'light/lighting',
  plug: 'plug/energy',
  heater: 'heater/comfort',
  remote: 'remote/remote',
  energymeter: 'meter/energy',
  automation: 'automation/automation',
};

function replaceValues(url, values) {

  const urlReplacementValues = {
    '{DEVICE_TYPE}': '{DEVICE_TYPE}',
    '{plantId}': '{plantId}',
    '{sceneId}': '{sceneId}',
    '{moduleId}': '{moduleId}',
    '{CLIENT_ID}': '{CLIENT_ID}',
    '{CLIENT_SECRET}': '{CLIENT_SECRET}',
    '{TOKEN_TYPE}': '{TOKEN_TYPE}',
    '{GRANT_TYPE}': '{GRANT_TYPE}',
    '{TOPOLOGY}': '{TOPOLOGY}',
  };

  for (const key of Object.keys(urlReplacementValues)) {
    if (values[urlReplacementValues[key]] !== undefined) {
      url = url.replace(urlReplacementValues[key], values[urlReplacementValues[key]]);
    }
  }
  return url;
}

function QueryToken(args) {
  const auth = args["AUTH_MAP"];
  const grantType = args["grant_type"];
  let body;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (auth['code'] !== undefined) {
    (
      body = replaceValues(urlList['TOKEN_BODY'], {
        '{GRANT_TYPE}': grantType, '{CLIENT_ID}': auth['client_id'], '{CLIENT_SECRET}': auth['client_secret'], '{TOKEN_TYPE}': `code=${auth['code']}`,
      })
    );
  } else if (auth['refresh_token'] !== undefined) {
    (
      body = replaceValues(urlList['TOKEN_BODY'], {
        '{GRANT_TYPE}': grantType, '{CLIENT_ID}': auth['client_id'], '{CLIENT_SECRET}': auth['client_secret'], '{TOKEN_TYPE}': `refresh_token=${auth['refresh_token']}`,
      })
    );
  }

  const options = { method: 'post', body, headers };

  return new Promise((resolve, reject) => {
    fetch(urlList['TOKEN_URL'], options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err)
    });
  });
}

function QueryPlant(args) {
  const auth = args["AUTH_MAP"];
  const queryType = args["query_type"];
  const plantId = args["plantId"];

  let url;
  let headers = {
    'Ocp-Apim-Subscription-Key': auth['subscription_key'],
    Authorization: `Bearer ${auth['access_token']}`,
  };
  let options = { method: 'get', headers };

  if (queryType === 'topology') {
    url = replaceValues(urlList['PLANT_URL'], { '{TOPOLOGY}': `${plantId}/topology` });
  }
  else if(queryType === 'status'){
    url = replaceValues(urlList['PLANT_URL_STATUS'], { '{plantId}': `${plantId}` });
  }
  else {
    url = replaceValues(urlList['PLANT_URL'], { '{TOPOLOGY}': '' });
  }

  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => reject(err));
  });
}

async function QueryDevice(args) {

  const auth = args["AUTH_MAP"];
  const method = args["method"];
  const deviceData = args["DEVICE_MAP"];
  const body = args["VALUE_BODY"];
  const isMultiple = args["isMultiple"];
  let url="";

  if (isMultiple) {
    url = await replaceValues(urlList['PLANT_DEVICE_STATUS'], { '{DEVICE_TYPE}': deviceUrlPerType[deviceData['device']], '{plantId}': deviceData['plantId'] });
  }
  else{
    url = await replaceValues(urlList['DEVICE_STATUS'], { '{DEVICE_TYPE}': deviceUrlPerType[deviceData['device']], '{plantId}': deviceData['plantId'], '{moduleId}': deviceData['id'] });
  }

  let options = null;
  let headers = null;

  if (method === 'post') {
    headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': auth['subscription_key'],
      Authorization: `Bearer ${auth['access_token']}`,
    };
    options = { method, body: JSON.stringify(body), headers };
  } else if (method === 'get') {
    headers = {
      'Ocp-Apim-Subscription-Key': auth['subscription_key'],
      Authorization: `Bearer ${auth['access_token']}`,
    };
    options = { method, headers };
  }
  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

async function QueryScene (args){
  const auth = args["AUTH_MAP"];
  const method = args["method"];
  let url="";

  let options = null;
  let headers = null;

  if (method === 'post') {
    const data = args["data"];
    url = await replaceValues(urlList['RUN_SCENE'], {'{plantId}': data['plantId'], '{sceneId}': data['id'] });
    headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': auth['subscription_key'],
      Authorization: `Bearer ${auth['access_token']}`,
    };
    options = { method, body: JSON.stringify({"enable": true}), headers };

  } else if (method === 'get') {
    const id = args['plantId'];
    url = await replaceValues(urlList['GET_SCENE'], {'{plantId}': id});
    headers = {
      'Ocp-Apim-Subscription-Key': auth['subscription_key'],
      Authorization: `Bearer ${auth['access_token']}`,
    };
    options = { method, headers };
  }
  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

module.exports.QueryToken = QueryToken;
module.exports.QueryPlant = QueryPlant;
module.exports.QueryDevice = QueryDevice;
module.exports.QueryScene = QueryScene;