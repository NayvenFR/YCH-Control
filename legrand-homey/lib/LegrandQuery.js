'use strict';

const fetch = require('node-fetch');

// URL and BODIES for Legrand API interaction

const urlList = {
  TOKEN_URL: 'https://api.netatmo.com/oauth2/token',
  TOKEN_BODY: 'grant_type={GRANT_TYPE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&{TOKEN_TYPE}&scope=read_magellan write_magellan read_bubendorff write_bubendorff&redirect_uri=https://callback.athom.com/oauth2/callback/',
  SET_STATE : 'https://api.netatmo.com/api/setstate',
  GET_SCENE : 'https://api.netatmo.com/api/getscenarios?home_id=', 
  GET_GATEWAY_ID : 'https://api.netatmo.com/api/homestatus?device_types=NLG&home_id=',
  RUN_SCENE : 'https://api.developer.legrand.com/hc/api/v1.0/scene/comfort/addressLocation/plants/{plantId}/modules/parameter/id/value/{sceneId}',
  SUBSCRIPTION_URL : 'https://api.developer.legrand.com/hc/api/v1.0/addsubscription'

};

// Replace in DEVICE_STATUS url the {DEVICE_TYPE} to get the right url for API interaction
//Because devices are sorted by categories and the URL to call each type is different

function replaceValues(url, values) {

  const urlReplacementValues = {
    '{CLIENT_ID}': '{CLIENT_ID}',
    '{CLIENT_SECRET}': '{CLIENT_SECRET}',
    '{TOKEN_TYPE}': '{TOKEN_TYPE}',
    '{GRANT_TYPE}': '{GRANT_TYPE}',
    '{TO_CHANGE}': '{TO_CHANGE}',
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
    Authorization: `Bearer ${auth['access_token']}`,
  };
  let options = { method: 'get', headers };

  if(queryType === 'status'){
    url = 'https://api.netatmo.com/api/homestatus?home_id=' + plantId;
  }
  else {
    url = 'https://api.netatmo.com/api/homesdata';
  }

  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => reject(err));
  });
}

async function QueryDevice(args) {

  const auth = args["AUTH_MAP"];
  const body = args["VALUE_BODY"];

  const url = 'https://api.netatmo.com/api/setstate';

  const headers = {
    'Content-Type': 'application/json',
    accept: "application/json",
    Authorization: `Bearer ${auth['access_token']}`,
  };

  const options = { method: 'post', body: JSON.stringify(body), headers };

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

  const id = args['plantId'];
  url = urlList['GET_SCENE'] + id;
  headers = {
    'Content-Type': 'application/json',
    accept: "application/json",
    Authorization: `Bearer ${auth['access_token']}`,
  };
  options = { method, headers };
  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

async function ExecuteScene (args){
   const auth = args["AUTH_MAP"];
  const method = args["method"];
  let url="";

  let options = null;
  let headers = null;

  const data = args["data"];
  url = urlList['SET_STATE'];
  headers = {
    'Content-Type': 'application/json',
    accept: "application/json",
    Authorization: `Bearer ${auth['access_token']}`,
  };
  
  const body = {
    home: {
      'id': data.plantId,
      'modules':[{
        'id': data.gateway_id,
        'scenario':  data.id
      }]
    }
  };
      
  options = {method: 'post', body: JSON.stringify(body), headers };

  return new Promise((resolve, reject) => {
    fetch(url, options).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

async function QueryGateway (args){
  const auth = args["AUTH_MAP"];
  const method = args["method"];
  let url="";

  let options = null;
  let headers = null;

  const id = args['plantId'];
  url = urlList["GET_GATEWAY_ID"]+ id;
  headers = {
    'Content-Type': 'application/json',
    accept: "application/json",
    Authorization: `Bearer ${auth['access_token']}`,
  };
  options = { method, headers };

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
module.exports.ExecuteScene = ExecuteScene;
module.exports.QueryGateway = QueryGateway;