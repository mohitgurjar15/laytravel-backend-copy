import { Stop } from "./stop.model";

export class FlightSearchResult{

    items       : Route[];
    price_range : PriceRange;
    partial_payment_price_range:PriceRange;
    stop_data  : any;
    airline_list :AirlineDetails[];
    depature_time_slot:any;
    arrival_time_slot:any;
}
export class Route{

    type            :  string;
    routes          :  RouteType[]=[];
    route_code      :  string;
    net_rate        :  string;
    stop_count      :  number;
    departure_code  : string;
    arrival_code    : string;
    departure_date  : string;
    departure_time  : string;
    arrival_date    : string;
    arrival_time    : string;
    total_duration  : string;
    airline         : string;
    is_refundable   : boolean;
    start_price     : string;
    selling_price   : string;
    airline_name    : string;
    airline_logo    : string;
}

export class RouteType{

    type    :  string;
    stops   :  Stop[]
}

export class PriceRange{
    min_price : string;
    max_price : string;
}

export class StopData{

    non_stop : StopDetails;
    one_stop : StopDetails;
    two_plus : StopDetails;
}

export class AirlineDetails{
    airline_name : string;
    airline_code : string;
    selling_price: number;
    count        : number
}

export class StopDetails{

    count : number;
    min_price : string;
}