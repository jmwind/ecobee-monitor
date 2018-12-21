import * as firebase from "firebase-admin";
import * as bigquery from '@google-cloud/bigquery';
import * as ecobee from './ecobee'; 

async function runLocally() {    
    var serviceAccount = require('../service-account.json');
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount)
        });
    var fb = firebase.firestore();
    var settings = {timestampsInSnapshots: true};
    fb.settings(settings);

    let store: ecobee.CloudStore = new ecobee.CloudStore(fb);
    let bq: bigquery.BigQuery = new bigquery.BigQuery({
        projectId: ecobee.GCP_PROJECT_ID,
        keyFilename: './service-account.json'
    });
    
    await store.initialize();
    
    ecobee.fetchThermostatData(store)
        .then(thermostats => {           
            let data: any[] = ecobee.trimThermostatData(thermostats);
            ecobee.storeInBq(data, bq);
            console.log(data);            
        });       
}

runLocally()
    .catch(e => console.log(e));