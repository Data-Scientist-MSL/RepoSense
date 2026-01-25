"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telemetry = void 0;
const Logger_1 = require("./Logger");
class Telemetry {
    constructor() {
        this.events = [];
        this.logger = Logger_1.Logger.getInstance();
    }
    static getInstance() {
        if (!Telemetry.instance) {
            Telemetry.instance = new Telemetry();
        }
        return Telemetry.instance;
    }
    trackEvent(eventName, properties, metrics) {
        const event = {
            eventName,
            timestamp: Date.now(),
            properties,
            metrics
        };
        this.events.push(event);
        this.logger.info('TELEMETRY', `Event: ${eventName}`, { properties, metrics });
    }
    trackMetric(name, value, properties) {
        this.trackEvent(`metric:${name}`, properties, { value });
    }
    async startTimer(eventName, properties) {
        const startTime = Date.now();
        return {
            stop: () => {
                const durationMs = Date.now() - startTime;
                this.trackEvent(eventName, properties, { durationMs });
            }
        };
    }
    getEvents() {
        return [...this.events];
    }
    clear() {
        this.events = [];
    }
}
exports.Telemetry = Telemetry;
