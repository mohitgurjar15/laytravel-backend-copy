import { ActivityLog } from "src/entity/activity-log.entity";
import { SearchLog } from "src/entity/search-log.entity";
import { getConnection } from "typeorm";
const fs = require('fs');
import { v4 as uuidv4 } from "uuid";

export class Activity {

    static logActivity(userId: string, moduleName: string, activityName: string, previousValue = null, currentValue = null) {

        const activity = new ActivityLog();
        activity.userId = userId;
        activity.moduleName = moduleName;
        activity.activityName = activityName;
        activity.createdDate = new Date();
        activity.previousValue = previousValue;
        activity.currentValue = currentValue;
        getConnection()
            .createQueryBuilder()
            .insert()
            .into(ActivityLog)
            .values(activity)
            .execute();
    }

    static addSearchLog(moduleId: number, searchDto: object, userId: string = null) {

        const activity = new SearchLog();
        activity.id = uuidv4()
        activity.userId = userId;
        activity.moduleId = moduleId;
        activity.searchLog = searchDto;
        activity.createdDate = new Date();

        getConnection()
            .createQueryBuilder()
            .insert()
            .into(SearchLog)
            .values(activity)
            .execute();
    }


    static createlogFile(filename, logData, folderName) {
        //console.log(logData);

        const path = '/var/www/html/logs/' + folderName + '/'

        filename = path + filename + '.json'
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
        fs.promises.writeFile(filename, JSON.stringify(logData))
    }
}