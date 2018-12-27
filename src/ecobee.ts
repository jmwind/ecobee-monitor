import * as rc from 'typed-rest-client/RestClient'
import * as ri from 'typed-rest-client/Interfaces'
import * as rb from 'typed-rest-client/Handlers'
import * as fb from "firebase-admin";
import * as bigquery from '@google-cloud/bigquery';
import * as ebee from './ecobee_types';

// To regen a new set of test tokens goto https://www.ecobee.com/home/developer/api/examples/ex1.shtml
const BASE_URL: string = "https://api.ecobee.com/";
export const GCP_PROJECT_ID: string = "cedar-gearbox-224119";

export class CloudStore implements ebee.TokenStore {    
    token: string = "";
    refresh: string = "";
    api_key: string = "";
    db: fb.firestore.Firestore;
    constructor(db: fb.firestore.Firestore) {
        this.db = db;
    }
    async initialize() {
        await this.db.collection('ecobee-monitor').doc('keys').get()
            .then((doc) => {
                this.token = doc.data()!.token;
                this.refresh = doc.data()!.refresh;
                this.api_key = doc.data()!.api_key;                
            })
            .catch((err) => {
                console.error('Error getting tokens from CloudStore', err);
        });
    }
    put(token: string, refresh: string): void {
        this.token = token;
        this.refresh = refresh;        
        this.db.collection('ecobee-monitor').doc('keys').set({
            token: this.token,
            refresh: this.refresh,
            api_key: this.api_key
        });
    }    
    get(): ebee.RefreshToken {        
        return {access_token: this.token, refresh_token: this.refresh, api_key: this.api_key};
    }
}

/**
 * Returns a mapping of Ecobee themostart JSON to the BigQuery schema.
 */
export function trimThermostatData(thermostats: ebee.Thermostat[]): any[] {
    let data: any = [];
    let timestamp = Math.round((new Date()).getTime() / 1000).toString();
    thermostats.forEach(thermostat => {
        let forecast = thermostat.weather.forecasts[0];
        let trimmedData = {
            TIMESTAMP: timestamp,
            DEVICE_ID: thermostat.identifier, 
            NAME: thermostat.name,
            CONNECTED: String(thermostat.runtime.connected),
            STATUS: statusConvert(thermostat.equipmentStatus),
            ACTUAL_TEMP: tempConvert(thermostat.runtime.actualTemperature).toFixed(1),
            DESIRED_TEMP: tempConvert(thermostat.runtime.desiredHeat).toFixed(1),
            ACTUAL_HUMIDITY: thermostat.runtime.actualHumidity,
            OUTSIDE_TEMP: tempConvert(forecast.temperature).toFixed(1),
            OUTSIDE_HUMIDITY: forecast.relativeHumidity,
            OUTSIDE_WINDSPEED: forecast.windSpeed,
            OUTSIDE_WINDDIRECTION: forecast.windDirection
        };
        data.push(trimmedData);
    });
    return data;
}

export function storeInBq(data: any[], bq: bigquery.BigQuery) {
    bq
    .dataset("KIRCHOFFER_HOME")
    .table("ECOBEES")
    .insert(data)
    .catch(reason => 
        console.log(JSON.stringify(reason)));
}

/** 
 * The temperature values are all provided in units of 0.1 of a Fahrenheit (℉). 
 * For example, our actualTemperature of 711 is actually 71.1℉. This converts
 * to celcius.
 */
export function tempConvert(t: number): number {
    return ((t - 320) * 5 / 90);
}

/**
 * This is the eqipment status string where if there is no equipment mentioned
 * it's because the unit is idle and not actively signaling any connected
 * devices.
 */
export function statusConvert(s: string): string {
    return s.length == 0 ? "Idle" : s;
}

export async function fetchThermostatData(store: ebee.TokenStore): Promise<ebee.Thermostat[]> {
        await refreshToken(store);
        let token = store.get().access_token;
        let handler: ri.IRequestHandler = new rb.BearerCredentialHandler(token);       
        let rest: rc.RestClient = new rc.RestClient('ecobee', BASE_URL, [handler]);    
        let response: rc.IRestResponse<ebee.EcoResponse> = await rest.get<ebee.EcoResponse>('/1/thermostat?json=\{"selection":\{"includeAlerts":"true","selectionType":"registered","selectionMatch":"","includeEvents":"true","includeSettings":"true","includeRuntime":"true","includeEquipmentStatus":"true","includeWeather":"true"\}\}');            
        return response.result!.thermostatList;          
}

async function refreshToken(store: ebee.TokenStore) {      
    let data = 'grant_type=refresh_token&code='.concat(store.get().refresh_token).concat('&client_id=').concat(store.get().api_key);
    let options: rc.IRequestOptions = <rc.IRequestOptions>{};
    options.additionalHeaders = options.additionalHeaders || {};    
    options.additionalHeaders["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    
    let rest: rc.RestClient = new rc.RestClient('ecobee refresh', "https://www.ecobee.com");  
    
    let response: rc.IRestResponse<ebee.RefreshToken> = await rest.create<ebee.RefreshToken>('/home/token', data, options);
    store.put(response.result!.access_token, response.result!.refresh_token);
}