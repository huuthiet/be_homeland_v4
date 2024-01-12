import * as AgendaInstance from 'agenda';
import {default as initJobs} from './jobs';

export default class Agenda {
    agenda: AgendaInstance;

    constructor() {
        const {agenda} = global.configs;

        try {
            // Init agenda instance
            this.agenda = new AgendaInstance({
                db: {
                    address: agenda.dbUri,
                    collection: 'scheduleJobs',
                    options: {
                        useNewUrlParser: true
                    }
                },
            });

            // Init jobs
            initJobs(this.agenda);

            // Agenda ready listener
            this.agenda.on('ready', () => {
                // Start
                this.agenda.start();
            });
        } catch (e) {
        }

    }
}