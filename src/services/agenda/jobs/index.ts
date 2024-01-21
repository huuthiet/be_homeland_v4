import {default as job} from './job';
import {default as room} from './room';
import {default as electric} from './electric';

export default agenda => {
    console.log("Start AGENDA Job");
    return {
        job: job(agenda),
        room: room(agenda),
        electric: electric(agenda),
    }
}