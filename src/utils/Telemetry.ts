import { Logger } from './Logger';

export interface TelemetryEvent {
    eventName: string;
    timestamp: number;
    durationMs?: number;
    properties?: Record<string, any>;
    metrics?: Record<string, number>;
}

export class Telemetry {
    private static instance: Telemetry;
    private logger: Logger;
    private events: TelemetryEvent[] = [];

    private constructor() {
        this.logger = Logger.getInstance();
    }

    public static getInstance(): Telemetry {
        if (!Telemetry.instance) {
            Telemetry.instance = new Telemetry();
        }
        return Telemetry.instance;
    }

    public trackEvent(eventName: string, properties?: Record<string, any>, metrics?: Record<string, number>): void {
        const event: TelemetryEvent = {
            eventName,
            timestamp: Date.now(),
            properties,
            metrics
        };

        this.events.push(event);
        this.logger.info('TELEMETRY', `Event: ${eventName}`, { properties, metrics });
    }

    public trackMetric(name: string, value: number, properties?: Record<string, any>): void {
        this.trackEvent(`metric:${name}`, properties, { value });
    }

    public async startTimer(eventName: string, properties?: Record<string, any>): Promise<{ stop: () => void }> {
        const startTime = Date.now();
        return {
            stop: () => {
                const durationMs = Date.now() - startTime;
                this.trackEvent(eventName, properties, { durationMs });
            }
        };
    }

    public getEvents(): TelemetryEvent[] {
        return [...this.events];
    }

    public clear(): void {
        this.events = [];
    }
}
