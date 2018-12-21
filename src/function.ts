import { Request, Response } from 'express';
import * as ecobee from './ecobee' 
import * as firebase from "firebase-admin";
import * as bigquery from '@google-cloud/bigquery';

/**
 * GCP services can only be initialized once and it's possible that a function
 * be re-used in the same node instance between invocations. Calling 
 * initializeApp() will fail the second time so ensure it's only called once.
 */
let db: firebase.firestore.Firestore;
let bq: bigquery.BigQuery;
let ts: ecobee.CloudStore;

async function init() {
    if(! db) {
        firebase.initializeApp();
        db = firebase.firestore();
        var settings = {timestampsInSnapshots: true};
        db.settings(settings);
        ts = new ecobee.CloudStore(db);
        await ts.initialize();
    }
    if(! bq) {
        bq = new bigquery.BigQuery({projectId: ecobee.GCP_PROJECT_ID});
    }        
}

export async function run(req: Request, res: Response) {
    await init();
    ecobee.fetchThermostatData(ts)
        .then((thermostats) => {
            res.status(200);
            let data: any[] = ecobee.trimThermostatData(thermostats);
            ecobee.storeInBq(data, bq);         
            res.send(data);
        })
        .catch((reason) => { 
            res.status(500);
            console.error("ERROR" + reason);
            res.send(reason);
        });                    
};