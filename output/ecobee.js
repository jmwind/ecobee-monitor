"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var rc = require("typed-rest-client/RestClient");
var rb = require("typed-rest-client/Handlers");
// To regen a new set of test tokens goto https://www.ecobee.com/home/developer/api/examples/ex1.shtml
var API_KEY = "zioyI0qOlADdDvO0wDl81SzDY5lU2cTZ";
var BASE_URL = "https://api.ecobee.com/";
exports.GCP_PROJECT_ID = "cedar-gearbox-224119";
var CloudStore = /** @class */ (function () {
    function CloudStore(db) {
        this.token = "";
        this.refresh = "";
        this.db = db;
    }
    CloudStore.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.error("DOC: " + this.db.collection('ecobee-monitor'));
                        console.error("KEYS: " + this.db.collection('ecobee-monitor').doc('keys'));
                        return [4 /*yield*/, this.db.collection('ecobee-monitor').doc('keys').get()
                                .then(function (doc) {
                                _this.token = doc.data().token;
                                _this.refresh = doc.data().refresh;
                            })["catch"](function (err) {
                                console.error('Error getting tokens from CloudStore', err);
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CloudStore.prototype.put = function (token, refresh) {
        this.token = token;
        this.refresh = refresh;
        this.db.collection('ecobee-monitor').doc('keys').set({
            token: this.token,
            refresh: this.refresh
        });
    };
    CloudStore.prototype.get = function () {
        return { access_token: this.token, refresh_token: this.refresh };
    };
    return CloudStore;
}());
exports.CloudStore = CloudStore;
/**
 * Returns a mapping of Ecobee themostart JSON to the BigQuery schema.
 */
function trimThermostatData(thermostats) {
    var data = [];
    var timestamp = Math.round((new Date()).getTime() / 1000).toString();
    thermostats.forEach(function (thermostat) {
        var forecast = thermostat.weather.forecasts[0];
        var trimmedData = {
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
exports.trimThermostatData = trimThermostatData;
function storeInBq(data, bq) {
    bq
        .dataset("KIRCHOFFER_HOME")
        .table("ECOBEES")
        .insert(data)["catch"](function (reason) {
        return console.log(JSON.stringify(reason));
    });
}
exports.storeInBq = storeInBq;
/**
 * The temperature values are all provided in units of 0.1 of a Fahrenheit (℉).
 * For example, our actualTemperature of 711 is actually 71.1℉. This converts
 * to celcius.
 */
function tempConvert(t) {
    return ((t - 320) * 5 / 90);
}
exports.tempConvert = tempConvert;
/**
 * This is the eqipment status string where if there is no equipment mentioned
 * it's because the unit is idle and not actively signaling any connected
 * devices.
 */
function statusConvert(s) {
    return s.length == 0 ? "Idle" : s;
}
exports.statusConvert = statusConvert;
function fetchThermostatData(store) {
    return __awaiter(this, void 0, void 0, function () {
        var token, handler, rest, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, refreshToken(store)];
                case 1:
                    _a.sent();
                    token = store.get().access_token;
                    handler = new rb.BearerCredentialHandler(token);
                    rest = new rc.RestClient('ecobee', BASE_URL, [handler]);
                    return [4 /*yield*/, rest.get('/1/thermostat?json=\{"selection":\{"includeAlerts":"true","selectionType":"registered","selectionMatch":"","includeEvents":"true","includeSettings":"true","includeRuntime":"true","includeEquipmentStatus":"true","includeWeather":"true"\}\}')];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.result.thermostatList];
            }
        });
    });
}
exports.fetchThermostatData = fetchThermostatData;
function refreshToken(store) {
    return __awaiter(this, void 0, void 0, function () {
        var data, options, rest, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    data = 'grant_type=refresh_token&code='.concat(store.get().refresh_token).concat('&client_id=').concat(API_KEY);
                    options = {};
                    options.additionalHeaders = options.additionalHeaders || {};
                    options.additionalHeaders["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
                    rest = new rc.RestClient('ecobee refresh', "https://www.ecobee.com");
                    return [4 /*yield*/, rest.create('/home/token', data, options)];
                case 1:
                    response = _a.sent();
                    store.put(response.result.access_token, response.result.refresh_token);
                    return [2 /*return*/];
            }
        });
    });
}
