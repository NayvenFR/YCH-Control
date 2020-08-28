'use strict';

const fetch = require('./node-fetch');

// URL and BODIES for Legrand API interaction
const QUERY_MAP = {
  TOKEN_URL: 'https://partners-login.eliotbylegrand.com/token',
  PLANT_URL: 'https://api.developer.legrand.com/hc/api/v1.0/plants/{TOPOLOGY}',
  PLANT_URL_STATUS : 'https://api.developer.legrand.com/hc/api/v1.0/plants/{plantId}',
  DEVICE_STATUS: 'https://api.developer.legrand.com/hc/api/v1.0/{DEVICE_TYPE}/addressLocation/plants/{plantId}/modules/parameter/id/value/{moduleId}',
  TOKEN_BODY: 'grant_type={GRANT_TYPE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&{TOKEN_TYPE}',

};

// Variable needed for replaceValues function
const replaceConst = {
  '{DEVICE_TYPE}': '{DEVICE_TYPE}',
  '{plantId}': '{plantId}',
  '{moduleId}': '{moduleId}',
  '{CLIENT_ID}': '{CLIENT_ID}',
  '{CLIENT_SECRET}': '{CLIENT_SECRET}',
  '{TOKEN_TYPE}': '{TOKEN_TYPE}',
  '{GRANT_TYPE}': '{GRANT_TYPE}',
  '{TOPOLOGY}': '{TOPOLOGY}',
};

// Replace in DEVICE_STATUS url the {DEVICE_TYPE} to get the right url for API interaction

const DEVICE_STATUS_MAP = {
  light: 'light/lighting',
  plug: 'plug/energy',
  heater: 'heater/comfort',
  remote: 'remote/remote',
  energymeter: 'meter/energy',
};

function replaceValues(url, values) {
  for (const key of Object.keys(replaceConst)) {
    if (values[replaceConst[key]] !== undefined) {
      url = url.replace(replaceConst[key], values[replaceConst[key]]);
    }
  }
  return url;
}

function QueryToken(args) {
  const AUTH_MAP = args["AUTH_MAP"];
  const grantType = args["grant_type"];
  let body;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (AUTH_MAP['code'] !== undefined) {
    (
      body = replaceValues(QUERY_MAP['TOKEN_BODY'], {
        '{GRANT_TYPE}': grantType, '{CLIENT_ID}': AUTH_MAP['client_id'], '{CLIENT_SECRET}': AUTH_MAP['client_secret'], '{TOKEN_TYPE}': `code=${AUTH_MAP['code']}`,
      })
    );
  } else if (AUTH_MAP['refresh_token'] !== undefined) {
    (
      body = replaceValues(QUERY_MAP['TOKEN_BODY'], {
        '{GRANT_TYPE}': grantType, '{CLIENT_ID}': AUTH_MAP['client_id'], '{CLIENT_SECRET}': AUTH_MAP['client_secret'], '{TOKEN_TYPE}': `refresh_token=${AUTH_MAP['refresh_token']}`,
      })
    );
  }

  const options = { method: 'post', body, headers };

  return new Promise((resolve, reject) => {
    fetch(QUERY_MAP['TOKEN_URL'], options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err)
    });
  });
}

function QueryPlant(args) {
  const AUTH_MAP = args["AUTH_MAP"];
  const query_type = args["query_type"];
  const plantId = args["plantId"];

  let url;
  let headers = {
    'Ocp-Apim-Subscription-Key': AUTH_MAP['subscription_key'],
    Authorization: `Bearer ${AUTH_MAP['access_token']}`,
  };
  let options = { method: 'get', headers };

  if (query_type === 'topology') {
    url = replaceValues(QUERY_MAP['PLANT_URL'], { '{TOPOLOGY}': `${plantId}/topology` });
  }
  else if(query_type === 'status'){
    url = replaceValues(QUERY_MAP['PLANT_URL_STATUS'], { '{plantId}': `${plantId}` });
  }
  else {
    url = replaceValues(QUERY_MAP['PLANT_URL'], { '{TOPOLOGY}': '' });
  }

  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => reject(err));
  });
}

async function QueryDevice(args) {

  const AUTH_MAP = args["AUTH_MAP"];
  const method = args["method"];
  const DEVICE_MAP = args["DEVICE_MAP"];
  const body = args["VALUE_BODY"];

  const url = await replaceValues(QUERY_MAP['DEVICE_STATUS'], { '{DEVICE_TYPE}': DEVICE_STATUS_MAP[DEVICE_MAP['device']], '{plantId}': DEVICE_MAP['plantId'], '{moduleId}': DEVICE_MAP['id'] });

  let options = null;
  let headers = null;

  if (method === 'post') {
    headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AUTH_MAP['subscription_key'],
      Authorization: `Bearer ${AUTH_MAP['access_token']}`,
    };
    options = { method, body: JSON.stringify(body), headers };
  } else if (method === 'get') {
    headers = {
      'Ocp-Apim-Subscription-Key': AUTH_MAP['subscription_key'],
      Authorization: `Bearer ${AUTH_MAP['access_token']}`,
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