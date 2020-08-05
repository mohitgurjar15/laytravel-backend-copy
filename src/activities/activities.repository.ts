import { EntityRepository, Repository } from "typeorm";
import { ActivityLog } from "src/entity/activity-log.entity";
import { ListActivityDto } from "./dto/list-activities.dto";
import { NotFoundException } from "@nestjs/common";

@EntityRepository(ActivityLog)
export class ActivitylogRepository extends Repository<ActivityLog> {
    
    
    async activityLogList(
		paginationOption: ListActivityDto
	): Promise<{ data: ActivityLog[]; TotalReseult: number }> {
		const { page_no, search, limit ,searchDate,userId} = paginationOption;

		const take = limit || 10;
		const skip = (page_no - 1) * limit || 0;
		const keyword = search || "";

		let where;
		where = `1=1 AND`
        if(searchDate)
        {
            where += `(DATE("created_date") = '${searchDate}') AND`;
		}
		if(userId)
        {
            where += `("user_id" = '${userId}') AND`;
        }
		if (keyword) {
			where += `(("module_name" ILIKE '%${keyword}%') or ("activity_name" ILIKE '%${keyword}%'))`;
		}
		else
		{
			where += ` 1=1`
		}
		const [result, total] = await this.findAndCount({
			where: where,
			skip: skip,
			take: take,
		});

		if (!result || total <= skip) {
			throw new NotFoundException(`No log found.`);
		}
		
		return { data: result, TotalReseult: total };
	}
}