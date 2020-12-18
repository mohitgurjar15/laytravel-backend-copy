import { InternalServerErrorException } from "@nestjs/common";
import { collect } from "collect.js";
import { RoomHelper } from "../helpers/room.helper";

export class Availability{
    
    private roomHelper: RoomHelper;
    
    constructor() {
        this.roomHelper = new RoomHelper();
    }

    processAvailabilityResult(res, availabilityDto) {
        
        let results = res.data['getHotelExpress.Contract'];
        
        if (results.error) {
            throw new InternalServerErrorException(results.error.status);
        }

        if (results.results.status && results.results.status === "Success") {
            
            let res = results.results
            let hotel = res.hotel_data[0];
            
            let room = this.roomHelper.processRoom(hotel, availabilityDto);

            // room = collect(room).map((item :any) => {
            //     item.retail.sub_total = 1000;
            //     return item;
            // });
            // room[0].selling.sub_total = 69;

            return room;

        }
    }
}