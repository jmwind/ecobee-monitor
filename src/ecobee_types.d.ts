export interface EcoResponse {
    page: string;
    thermostatList: [Thermostat];
}

export interface Thermostat {
    identifier: string;
    name: string;
    runtime: Runtime;
    equipmentStatus: string;
    weather: Weather;
}

export interface Runtime {
    lastStatusModified: string;
    actualTemperature: number;
    actualHumidity: number;
    desiredHeat: number;
    desiredHumidity: number;
    connected: boolean;
}

export interface Weather {
    forecasts: [WeatherForcast];
    weatherStation: string;
}

export interface WeatherForcast {
    weatherSymbol: number;
    temperature: number;
    pressure: number;
    windSpeed: number;
    windDirection: string;
    relativeHumidity: number;
}

export interface RefreshToken {
    access_token: string;
    refresh_token: string;
    api_key: string;
}

export interface TokenStore {    
    put(token: string, refresh_token: string): void;
    get(): RefreshToken;
}