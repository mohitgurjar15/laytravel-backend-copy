import { StrategyAirline } from "./strategy.interface";
import { OneWaySearchFlightDto } from "../dto/oneway-flight.dto";
import { NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { RoundtripSearchFlightDto } from "../dto/roundtrip-flight.dto";
import * as moment from 'moment';
import { DateTime } from "src/utility/datetime.utility";
import { Stop } from "../model/stop.model";
import { Route, RouteType, FlightSearchResult, PriceRange } from "../model/route.model";
import { Generic } from "src/utility/generic.utility";
import { getManager } from "typeorm";
import { Instalment } from "src/utility/instalment.utility";
import { PriceMarkup } from "src/utility/markup.utility";
import { Module } from "src/entity/module.entity";
import { errorMessage, s3BucketUrl } from "src/config/common.config";
import { airlines } from "../airline";
import { airports } from "../airports";
import { FareInfo } from "../model/fare.model";
import { HttpRequest } from "src/utility/http.utility";
const fs = require('fs').promises;
import * as zlib from 'zlib';
import * as md5 from 'md5';

export const flightClass = {
    'Economy': 'Y',
    'Business': 'C',
    'First': 'F',
    'Premium': 'S'
}

const mealCodes = {
    'B': 'Breakfast', 'K': 'Continental Breakfast', 'L': 'Lunch',
    'D': 'Dinner', 'S': 'Snack or Brunch', 'O': 'Cold Meal',
    'H': 'Hot Meal', 'M': 'Meal (Non-specific)', 'R': 'Refreshment',
    'C': 'Alcoholic Beverage Complementary', 'F': 'Food For Purchase',
    'P': 'Alcoholic Beverage Purchase', 'Y': 'Duty Free Sales Available',
    'N': 'No Meal Service', 'V': 'Refreshment For Purchase', 'G': 'Food And Beverage For Purchase'
}
export class Mystifly implements StrategyAirline {

    private headers;
    constructor(
        headers
    ) {
        this.headers = headers;
    }

    async getMystiflyCredential() {

        const config = await Generic.getCredential('flight');
        let mystiflyConfig = JSON.parse(config.testCredential)
        mystiflyConfig['zipSearchUrl'] = 'http://onepointdemo.myfarebox.com/V2/OnePointGZip.svc';
        if (config.mode) {
            mystiflyConfig = JSON.parse(config.liveCredential);
            mystiflyConfig['zipSearchUrl'] = 'http://onepoint.myfarebox.com/V2/OnePointGZip.svc';
        }
        //mystiflyConfig = { "account_number": "MCN001506","password": "MWR2018_xml","target": "Test", "user_name": "MWR_XML","url": "http://onepointdemo.myfarebox.com/V2/OnePoint.svc"}
       
        return mystiflyConfig;
    }
    async createSession() {

        const mystiflyConfig = await this.getMystiflyCredential();
        console.log(mystiflyConfig);

        const requestBody =
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint">
            <soapenv:Header/>
            <soapenv:Body>
            <mys:CreateSession>
                <mys:rq>
                    <mys1:AccountNumber>${mystiflyConfig.account_number}</mys1:AccountNumber>
                    <mys1:Password>${mystiflyConfig.password}</mys1:Password>
                    <mys1:Target>${mystiflyConfig.target}</mys1:Target>
                    <mys1:UserName>${mystiflyConfig.user_name}</mys1:UserName>
                </mys:rq>
            </mys:CreateSession>
            </soapenv:Body>
        </soapenv:Envelope>`;

        let sessionResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'CreateSession');

        const sessionToken = sessionResult['s:envelope']['s:body'][0].createsessionresponse[0].createsessionresult[0]['a:sessionid'][0];
        await fs.writeFile("src/flight/mystifly-session.json", JSON.stringify({ sessionToken, created_time: new Date() }))
        return sessionToken;
    }
    async startSession() {
        try {
            let sessionDetails = await fs.readFile("src/flight/mystifly-session.json", "binary");
            sessionDetails = JSON.parse(sessionDetails);
            let currentTime = new Date();
            let diff = moment(currentTime).diff(sessionDetails.created_time, 'seconds')
            if (diff > 1200) {

                return await this.createSession();
            }
            else {
                return sessionDetails.sessionToken;
            }
            
        }
        catch (e) {
            return await this.createSession();
        }
    }

    async getMarkupDetails(departure_date, bookingDate, user, module) {
        let isInstalmentAvaible = Instalment.instalmentAvailbility(departure_date, bookingDate);

        let markUpDetails;
        let secondaryMarkUpDetails;
        if (!user.roleId || user.roleId == 7) {

            markUpDetails = await PriceMarkup.getMarkup(module.id, user.roleId, 'no-instalment');
        }
        else if (isInstalmentAvaible && (user.roleId == 5 || user.roleId == 6)) {

            markUpDetails = await PriceMarkup.getMarkup(module.id, user.roleId, 'instalment');
            secondaryMarkUpDetails = await PriceMarkup.getMarkup(module.id, user.roleId, 'no-instalment');
        }
        else {
            markUpDetails = await PriceMarkup.getMarkup(module.id, user.roleId, 'no-instalment');
        }

        if (!markUpDetails) {
            throw new InternalServerErrorException(`Markup is not configured for flight&&&module&&&${errorMessage}`);
        }
        else {
            return {
                markUpDetails,
                secondaryMarkUpDetails
            }
        }
    }

    async oneWaySearch(searchFlightDto: OneWaySearchFlightDto, user)/* :Promise<FlightSearchResult> */ {

        const mystiflyConfig = await this.getMystiflyCredential();
        console.log("mystiflyConfig", mystiflyConfig)
        const sessionToken = await this.startSession();
        const {
            source_location,
            destination_location,
            departure_date,
            flight_class,
            adult_count,
            child_count,
            infant_count
        } = searchFlightDto;
        let module = await getManager()
            .createQueryBuilder(Module, "module")
            .where("module.name = :name", { name: 'flight' })
            .getOne();
        let bookingDate = moment(new Date()).format("YYYY-MM-DD");

        if (!module) {
            throw new InternalServerErrorException(`Flight module is not configured in database&&&module&&&${errorMessage}`);
        }
        const currencyDetails = await Generic.getAmountTocurrency(this.headers.currency);

        let markup = await this.getMarkupDetails(departure_date, bookingDate, user, module)
        let markUpDetails = markup.markUpDetails;
        let secondaryMarkUpDetails = markup.secondaryMarkUpDetails;

        let requestBody = '';
        requestBody += `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
        requestBody += `<soapenv:Header/>`
        requestBody += `<soapenv:Body>`
        requestBody += `<mys:AirLowFareSearch>`
        requestBody += `<mys:rq>`
        requestBody += `<mys1:OriginDestinationInformations>`
        requestBody += `<mys1:OriginDestinationInformation>`
        requestBody += `<mys1:DepartureDateTime>${departure_date}T00:00:00</mys1:DepartureDateTime>`
        requestBody += `<mys1:DestinationLocationCode>${destination_location}</mys1:DestinationLocationCode>`
        requestBody += `<mys1:OriginLocationCode>${source_location}</mys1:OriginLocationCode>`
        requestBody += `</mys1:OriginDestinationInformation>`
        requestBody += `</mys1:OriginDestinationInformations>`
        requestBody += `<mys1:PassengerTypeQuantities>`
        if (adult_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>ADT</mys1:Code>`
            requestBody += `<mys1:Quantity>${adult_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (child_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>CHD</mys1:Code>`
            requestBody += `<mys1:Quantity>${child_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (infant_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>INF</mys1:Code>`
            requestBody += `<mys1:Quantity>${infant_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        requestBody += `</mys1:PassengerTypeQuantities>`
        requestBody += `<mys1:PricingSourceType>All</mys1:PricingSourceType>`
        requestBody += `<mys1:RequestOptions>TwoHundred</mys1:RequestOptions>`
        requestBody += `<mys1:SessionId>${sessionToken}</mys1:SessionId>`
        requestBody += `<mys1:Target>${mystiflyConfig.target}</mys1:Target>`
        requestBody += `<mys1:TravelPreferences>`
        requestBody += `<mys1:AirTripType>OneWay</mys1:AirTripType>`
        requestBody += `<mys1:CabinPreference>${this.getFlightClass(flight_class)}</mys1:CabinPreference>`
        requestBody += `<mys1:MaxStopsQuantity>All</mys1:MaxStopsQuantity>`
        requestBody += `<mys1:Preferences>`
        requestBody += `<mys1:CabinClassPreference>`
        requestBody += `<mys1:CabinType>${this.getFlightClass(flight_class)}</mys1:CabinType>`
        requestBody += `<mys1:PreferenceLevel>Restricted</mys1:PreferenceLevel>`
        requestBody += `</mys1:CabinClassPreference>`
        requestBody += `</mys1:Preferences>`
        requestBody += `</mys1:TravelPreferences>`
        requestBody += `</mys:rq>`
        requestBody += `</mys:AirLowFareSearch>`
        requestBody += `</soapenv:Body>`
        requestBody += `</soapenv:Envelope>`
        let searchResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'AirLowFareSearch');
        if (searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0]['a:success'][0] == "true") {

            let flightRoutes = searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0]['a:priceditineraries'][0]['a:priceditinerary'];
            let stop: Stop;
            let stops: Stop[] = [];
            let routes: Route[] = [];
            let route: Route;
            let routeType: RouteType;
            let flightSegments = [];
            let stopDuration;
            let otherSegments = []
            let totalDuration;
            let uniqueCode;
            for (let i = 0; i < flightRoutes.length; i++) {
                route = new Route;
                stops = [];
                totalDuration = 0;
                uniqueCode = '';
                flightSegments = flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][0]['a:flightsegments'][0]['a:flightsegment'];
                otherSegments = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'][0];
                flightSegments.forEach((flightSegment, j) => {
                    totalDuration += flightSegment['a:journeyduration'][0] * 60;
                    stop = new Stop();
                    stopDuration = "";
                    stop.departure_code = flightSegment['a:departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['a:departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['a:departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['a:departuredatetime'][0];
                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['a:arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['a:arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['a:arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['a:arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['a:eticket'][0] == 'true' ? true : false;
                    stop.flight_number = flightSegment['a:flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['a:cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['a:journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours}h ${stopDuration.minutes}m`
                    stop.airline = flightSegment['a:marketingairlinecode'][0];
                    stop.remaining_seat = parseInt(flightSegment['a:seatsremaining'][0]['a:number'][0]);
                    stop.below_minimum_seat = flightSegment['a:seatsremaining'][0]['a:belowminimum'][0] == 'true' ? true : false;
                    stop.is_layover = false;
                    stop.airline_name = airlines[flightSegment['a:marketingairlinecode'][0]];
                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;
                    stop.cabin_baggage = this.getBaggageDetails(typeof otherSegments['a:cabinbaggageinfo']!=='undefined'?otherSegments['a:cabinbaggageinfo'][0]['a:cabinbaggage'][j]:'');
                    //stop.cabin_baggage = '';
                    stop.checkin_baggage = this.getBaggageDetails(otherSegments['a:baggageinfo'][0]['a:baggage'][j]);
                    stop.meal = this.getMealCode(flightSegment['a:mealcode'][0]);
                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                        stop.layover_duration = `${layOverduration.hours}h ${layOverduration.minutes}m`
                        stop.layover_airport_name = flightSegment['a:departureairportlocationcode'][0];
                    }
                    // uniqueCode += stop.departure_time;
                    // uniqueCode += stop.arrival_time;
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop)
                });
                routeType = new RouteType();
                routeType.type = 'outbound';
                routeType.stops = stops;
                let duration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                routeType.duration = `${duration.hours}h ${duration.minutes}m`;
                route.routes[0] = routeType;
                route.route_code = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faresourcecode'][0];
                route.fare_type = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faretype'][0] == 'WebFare' ? 'LCC' : 'GDS';
                route.net_rate = Generic.convertAmountTocurrency(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:itintotalfare'][0]['a:totalfare'][0]['a:amount'][0], currencyDetails.liveRate);
                route.fare_break_dwon = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], markUpDetails);
                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_fare_break_down = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], secondaryMarkUpDetails);
                }
                route.selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, markUpDetails))
                let instalmentDetails = Instalment.weeklyInstalment(route.selling_price, moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, 0);
                if (instalmentDetails.instalment_available) {
                    route.start_price = instalmentDetails.instalment_date[0].instalment_amount;
                    route.secondary_start_price = instalmentDetails.instalment_date[1].instalment_amount;
                }
                else {
                    route.start_price = 0;
                    route.secondary_start_price = 0;
                }
                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, secondaryMarkUpDetails))
                }
                else {
                    route.secondary_selling_price = 0;
                }
                route.instalment_details = instalmentDetails;
                route.stop_count = stops.length - 1;
                route.is_passport_required = flightRoutes[i]['a:ispassportmandatory'][0] == "true" ? true : false;
                route.departure_code = source_location;
                route.arrival_code = destination_location;
                route.departure_date = stops[0].departure_date;
                route.departure_time = stops[0].departure_time;
                route.arrival_date = stops[stops.length - 1].arrival_date;
                route.arrival_time = stops[stops.length - 1].arrival_time;
                route.departure_info = typeof airports[source_location] !== 'undefined' ? airports[source_location] : {};
                route.arrival_info = typeof airports[destination_location] !== 'undefined' ? airports[destination_location] : {};

                route.total_duration = `${duration.hours}h ${duration.minutes}m`;
                route.airline = stops[0].airline;
                route.airline_name = airlines[stops[0].airline];
                route.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stops[0].airline}.png`;
                route.is_refundable = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:isrefundable'][0] == 'Yes' ? true : false;
                route.unique_code = md5(uniqueCode)
                routes.push(route);
            }
            let flightSearchResult = new FlightSearchResult();
            flightSearchResult.items = routes;

            //Get min & max selling price
            let priceRange = new PriceRange();
            let priceType = 'selling_price';
            priceRange.min_price = this.getMinPrice(routes, priceType);
            priceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.price_range = priceRange;

            //Get min & max partail payment price
            let partialPaymentPriceRange = new PriceRange();
            priceType = 'secondary_start_price';
            partialPaymentPriceRange.min_price = this.getMinPrice(routes, priceType);
            partialPaymentPriceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.partial_payment_price_range = partialPaymentPriceRange;
            //return flightSearchResult;

            //Get Stops count and minprice
            flightSearchResult.stop_data = this.getStopCounts(routes, 'stop_count');

            //Get airline and min price
            flightSearchResult.airline_list = this.getAirlineCounts(routes)

            //Get Departure time slot
            flightSearchResult.depature_time_slot = this.getArrivalDepartureTimeSlot(routes, 'departure_time', 0)
            //Get Arrival time slot
            flightSearchResult.arrival_time_slot = this.getArrivalDepartureTimeSlot(routes, 'arrival_time', 0)
            return flightSearchResult;
        }
        else {

            throw new NotFoundException(`No flight founds`)
        }

    }

    async oneWaySearchZip(searchFlightDto: OneWaySearchFlightDto, user) {

        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();

        const {
            source_location,
            destination_location,
            departure_date,
            flight_class,
            adult_count,
            child_count,
            infant_count
        } = searchFlightDto;
        let module = await getManager()
            .createQueryBuilder(Module, "module")
            .where("module.name = :name", { name: 'flight' })
            .getOne();
        let bookingDate = moment(new Date()).format("YYYY-MM-DD");

        if (!module) {
            throw new InternalServerErrorException(`Flight module is not configured in database&&&module&&&${errorMessage}`);
        }
        const currencyDetails = await Generic.getAmountTocurrency(this.headers.currency);

        let isInstalmentAvaible = Instalment.instalmentAvailbility(departure_date, bookingDate);

        let markup = await this.getMarkupDetails(departure_date, bookingDate, user, module)
        let markUpDetails = markup.markUpDetails;
        if (!markUpDetails) {
            throw new InternalServerErrorException(`Markup is not configured for flight&&&module&&&${errorMessage}`);
        }

        let requestBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:mys="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint.OnePointEntities"
    xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
        requestBody += `<soapenv:Header/>`;
        requestBody += `<soapenv:Body>`;
        requestBody += `<tem:AirLowFareSearch>`;
        requestBody += `<tem:rq>`;
        requestBody += `<mys:IsRefundable>false</mys:IsRefundable>`;
        requestBody += `<mys:IsResidentFare>false</mys:IsResidentFare>`;
        requestBody += `<mys:NearByAirports>false</mys:NearByAirports>`;
        requestBody += `<mys:OriginDestinationInformations>`;
        requestBody += `<mys1:OriginDestinationInformation>`;
        requestBody += `<mys1:DepartureDateTime>${departure_date}T00:00:00</mys1:DepartureDateTime>`;
        requestBody += `<mys1:DestinationLocationCode>${destination_location}</mys1:DestinationLocationCode>`;
        requestBody += `<mys1:OriginLocationCode>${source_location}</mys1:OriginLocationCode>`;
        requestBody += `</mys1:OriginDestinationInformation>`;
        requestBody += `</mys:OriginDestinationInformations>`;
        requestBody += `<mys:PassengerTypeQuantities>`;

        if (adult_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>ADT</mys1:Code>`
            requestBody += `<mys1:Quantity>${adult_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (child_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>CHD</mys1:Code>`
            requestBody += `<mys1:Quantity>${child_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (infant_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>INF</mys:Code>`
            requestBody += `<mys1:Quantity>${infant_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }


        requestBody += `</mys:PassengerTypeQuantities>`;
        requestBody += `<mys:PricingSourceType>All</mys:PricingSourceType>`;
        requestBody += `<mys:RequestOptions>TwoHundred</mys:RequestOptions>`;
        requestBody += `<mys:ResponseFormat>XML</mys:ResponseFormat>`;
        requestBody += `<mys:SessionId>${sessionToken}</mys:SessionId>`;
        requestBody += `<mys:Target>${mystiflyConfig.target}</mys:Target>`;
        requestBody += `<mys:TravelPreferences>`;
        requestBody += `<mys1:AirTripType>OneWay</mys1:AirTripType>`;
        requestBody += `<mys1:CabinPreference>${this.getFlightClass(flight_class)}</mys1:CabinPreference>`;
        requestBody += `<mys1:MaxStopsQuantity>All</mys1:MaxStopsQuantity>`;
        requestBody += `<mys1:Preferences>`
        requestBody += `<mys1:CabinClassPreference>`
        requestBody += `<mys1:CabinType>${this.getFlightClass(flight_class)}</mys1:CabinType>`
        requestBody += `<mys1:PreferenceLevel>Restricted</mys1:PreferenceLevel>`
        requestBody += `</mys1:CabinClassPreference>`
        requestBody += `</mys1:Preferences>`
        requestBody += `</mys:TravelPreferences>`;
        requestBody += `</tem:rq>`;
        requestBody += `</tem:AirLowFareSearch>`;
        requestBody += `</soapenv:Body>`;
        requestBody += `</soapenv:Envelope>`;

        let searchResult = await HttpRequest.mystiflyRequestZip(mystiflyConfig.zipSearchUrl, requestBody, 'http://tempuri.org/IOnePointGZip/AirLowFareSearch');
        let compressedResult = searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0];
        //console.log(compressedResult)
        let buffer = Buffer.from(compressedResult, 'base64');

        const unCompressedData = await new Promise((resolve) => {
            zlib.unzip(buffer, (err, buffer) => {
                resolve(buffer.toString());
            });
        });

        let jsonData: any = await Generic.xmlToJson(unCompressedData)

        
        if (jsonData.airlowfaresearchgziprs.success[0] == "true") {



            let flightRoutes = jsonData.airlowfaresearchgziprs.priceditineraries[0].priceditinerary;
            let stop: Stop;
            let stops: Stop[] = [];
            let routes: Route[] = [];
            let route: Route;
            let routeType: RouteType;
            let flightSegments = [];
            let stopDuration;
            let otherSegments = []
            let totalDuration;
            let uniqueCode;
            for (let i = 0; i < flightRoutes.length; i++) {
                route = new Route;
                stops = [];
                totalDuration = 0;
                uniqueCode = '';
                flightSegments = flightRoutes[i]['origindestinationoptions'][0]['origindestinationoption'][0]['flightsegments'][0]['flightsegment'];
                otherSegments = flightRoutes[i]['airitinerarypricinginfo'][0]['ptc_farebreakdowns'][0]['ptc_farebreakdown'][0];

                flightSegments.forEach((flightSegment, j) => {
                    totalDuration += flightSegment['journeyduration'][0] * 60;

                    stop = new Stop();
                    stopDuration = "";
                    stop.departure_code = flightSegment['departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['departuredatetime'][0];


                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['eticket'][0] == 'true' ? true : false;


                    stop.flight_number = flightSegment['flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours} h ${stopDuration.minutes} m`
                    stop.airline = flightSegment['marketingairlinecode'][0];
                    stop.remaining_seat = parseInt(flightSegment['seatsremaining'][0]['number'][0]);
                    stop.below_minimum_seat = flightSegment['seatsremaining'][0]['belowminimum'][0] == 'true' ? true : false;


                    stop.is_layover = false;
                    stop.airline_name = airlines[flightSegment['marketingairlinecode'][0]];

                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;



                    stop.cabin_baggage = this.getBaggageDetails(otherSegments['cabinbaggageinfo'][0]['string'][j]);
                    //stop.cabin_baggage = '';
                    stop.checkin_baggage =this.getBaggageDetails(otherSegments['baggageinfo'][0]['string'][j]);

                    stop.meal = this.getMealCode(flightSegment['mealcode'][0]);


                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                        stop.layover_duration = `${layOverduration.hours} h ${layOverduration.minutes} m`
                        stop.layover_airport_name = flightSegment['departureairportlocationcode'][0];
                    }
                    // uniqueCode += stop.departure_time;
                    // uniqueCode += stop.arrival_time;
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop)
                });


                routeType = new RouteType();
                routeType.type = 'outbound';
                routeType.stops = stops;
                route.routes[0] = routeType;
                route.route_code = flightRoutes[i]['airitinerarypricinginfo'][0]['faresourcecode'][0];

                route.fare_type = flightRoutes[i]['airitinerarypricinginfo'][0]['faretype'][0] == 'WebFare' ? 'LCC' : 'GDS';
                route.net_rate = Generic.convertAmountTocurrency(flightRoutes[i]['airitinerarypricinginfo'][0]['itintotalfare'][0]['totalfare'][0]['amount'][0], currencyDetails.liveRate);

                route.fare_break_dwon = this.getFareBreakDownForGzip(flightRoutes[i]['airitinerarypricinginfo'][0]['ptc_farebreakdowns'][0]['ptc_farebreakdown'], markUpDetails);

                route.selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, markUpDetails))



                let instalmentDetails = Instalment.weeklyInstalment(route.selling_price, moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, 0);
                if (instalmentDetails.instalment_available) {
                    route.start_price = instalmentDetails.instalment_date[0].instalment_amount;
                    route.secondary_start_price = instalmentDetails.instalment_date[1].instalment_amount;
                }
                else {
                    route.start_price = 0;
                    route.secondary_start_price = 0;
                }
                route.stop_count = stops.length - 1;
                route.is_passport_required = flightRoutes[i]['ispassportmandatory'][0] == "true" ? true : false;
                route.departure_code = source_location;
                route.arrival_code = destination_location;
                route.departure_date = stops[0].departure_date;
                route.departure_time = stops[0].departure_time;
                route.arrival_date = stops[stops.length - 1].arrival_date;
                route.arrival_time = stops[stops.length - 1].arrival_time;
                route.departure_info = typeof airports[source_location] !== 'undefined' ? airports[source_location] : {};
                route.arrival_info = typeof airports[destination_location] !== 'undefined' ? airports[destination_location] : {};
                let duration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                route.total_duration = `${duration.hours} h ${duration.minutes} m`;
                route.airline = stops[0].airline;
                route.airline_name = airlines[stops[0].airline];
                route.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stops[0].airline}.png`;
                route.is_refundable = flightRoutes[i]['airitinerarypricinginfo'][0]['isrefundable'][0] == 'Yes' ? true : false;
                route.unique_code = md5(uniqueCode)
                routes.push(route);
            }
            let flightSearchResult = new FlightSearchResult();
            flightSearchResult.items = routes;

            //Get min & max selling price
            let priceRange = new PriceRange();
            let priceType = 'selling_price';
            priceRange.min_price = this.getMinPrice(routes, priceType);
            priceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.price_range = priceRange;

            //Get min & max partail payment price
            let partialPaymentPriceRange = new PriceRange();
            priceType = 'secondary_start_price';
            partialPaymentPriceRange.min_price = this.getMinPrice(routes, priceType);
            partialPaymentPriceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.partial_payment_price_range = partialPaymentPriceRange;
            //return flightSearchResult;

            //Get Stops count and minprice
            flightSearchResult.stop_data = this.getStopCounts(routes, 'stop_count');

            //Get airline and min price
            flightSearchResult.airline_list = this.getAirlineCounts(routes)

            //Get Departure time slot
            flightSearchResult.depature_time_slot = this.getArrivalDepartureTimeSlot(routes, 'departure_time', 0)
            //Get Arrival time slot
            flightSearchResult.arrival_time_slot = this.getArrivalDepartureTimeSlot(routes, 'arrival_time', 0)
            return flightSearchResult;
        }
        else {

            return { message: "flight not found" }
        }
    }

    async roundTripSearchZip(searchFlightDto: RoundtripSearchFlightDto, user) {

        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();
        const {
            source_location,
            destination_location,
            departure_date,
            arrival_date,
            flight_class,
            adult_count,
            child_count,
            infant_count
        } = searchFlightDto;

        let module = await getManager()
            .createQueryBuilder(Module, "module")
            .where("module.name = :name", { name: 'flight' })
            .getOne();

        if (!module) {
            throw new InternalServerErrorException(`Flight module is not configured in database&&&module&&&${errorMessage}`);
        }
        let bookingDate = moment(new Date()).format("YYYY-MM-DD");
        const currencyDetails = await Generic.getAmountTocurrency(this.headers.currency);
        //const markUpDetails   = await PriceMarkup.getMarkup(module.id,user.roleId);
        let markup = await this.getMarkupDetails(departure_date, bookingDate, user, module)
        let markUpDetails = markup.markUpDetails;
        let secondaryMarkUpDetails = markup.secondaryMarkUpDetails;
        if (!markUpDetails) {
            throw new InternalServerErrorException(`Markup is not configured for flight&&&module&&&${errorMessage}`);
        }

        let requestBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:mys="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint.OnePointEntities"
    xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
        requestBody += `<soapenv:Header/>`;
        requestBody += `<soapenv:Body>`;
        requestBody += `<tem:AirLowFareSearch>`;
        requestBody += `<tem:rq>`;
        requestBody += `<mys:IsRefundable>false</mys:IsRefundable>`;
        requestBody += `<mys:IsResidentFare>false</mys:IsResidentFare>`;
        requestBody += `<mys:NearByAirports>false</mys:NearByAirports>`;
        requestBody += `<mys:OriginDestinationInformations>`;
        requestBody += `<mys1:OriginDestinationInformation>`;
        requestBody += `<mys1:DepartureDateTime>${departure_date}T00:00:00</mys1:DepartureDateTime>`;
        requestBody += `<mys1:DestinationLocationCode>${destination_location}</mys1:DestinationLocationCode>`;
        requestBody += `<mys1:OriginLocationCode>${source_location}</mys1:OriginLocationCode>`;
        requestBody += `</mys1:OriginDestinationInformation>`;
        requestBody += `<mys1:OriginDestinationInformation>`;
        requestBody += `<mys1:DepartureDateTime>${arrival_date}T00:00:00</mys1:DepartureDateTime>`;
        requestBody += `<mys1:DestinationLocationCode>${source_location}</mys1:DestinationLocationCode>`;
        requestBody += `<mys1:OriginLocationCode>${destination_location}</mys1:OriginLocationCode>`;
        requestBody += `</mys1:OriginDestinationInformation>`;
        requestBody += `</mys:OriginDestinationInformations>`;
        requestBody += `<mys:PassengerTypeQuantities>`;

        if (adult_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>ADT</mys1:Code>`
            requestBody += `<mys1:Quantity>${adult_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (child_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>CHD</mys1:Code>`
            requestBody += `<mys1:Quantity>${child_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (infant_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>INF</mys:Code>`
            requestBody += `<mys1:Quantity>${infant_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }


        requestBody += `</mys:PassengerTypeQuantities>`;
        requestBody += `<mys:PricingSourceType>All</mys:PricingSourceType>`;
        requestBody += `<mys:RequestOptions>TwoHundred</mys:RequestOptions>`;
        requestBody += `<mys:ResponseFormat>XML</mys:ResponseFormat>`;
        requestBody += `<mys:SessionId>${sessionToken}</mys:SessionId>`;
        requestBody += `<mys:Target>${mystiflyConfig.target}</mys:Target>`;
        requestBody += `<mys:TravelPreferences>`;
        requestBody += `<mys1:AirTripType>Circle</mys1:AirTripType>`;
        requestBody += `<mys1:CabinPreference>${this.getFlightClass(flight_class)}</mys1:CabinPreference>`;
        requestBody += `<mys1:MaxStopsQuantity>All</mys1:MaxStopsQuantity>`;
        requestBody += `<mys1:Preferences>`
        requestBody += `<mys1:CabinClassPreference>`
        requestBody += `<mys1:CabinType>${this.getFlightClass(flight_class)}</mys1:CabinType>`
        requestBody += `<mys1:PreferenceLevel>Restricted</mys1:PreferenceLevel>`
        requestBody += `</mys1:CabinClassPreference>`
        requestBody += `</mys1:Preferences>`
        requestBody += `</mys:TravelPreferences>`;
        requestBody += `</tem:rq>`;
        requestBody += `</tem:AirLowFareSearch>`;
        requestBody += `</soapenv:Body>`;
        requestBody += `</soapenv:Envelope>`;

        let searchResult = await HttpRequest.mystiflyRequestZip(mystiflyConfig.zipSearchUrl, requestBody, 'http://tempuri.org/IOnePointGZip/AirLowFareSearch');
        let compressedResult = searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0];
        let buffer = Buffer.from(compressedResult, 'base64');

        const unCompressedData = await new Promise((resolve) => {
            zlib.unzip(buffer, (err, buffer) => {
                resolve(buffer.toString());
            });
        });

        let jsonData: any = await Generic.xmlToJson(unCompressedData)

        if (jsonData.airlowfaresearchgziprs.success[0] == "true") {
            let flightRoutes = jsonData.airlowfaresearchgziprs.priceditineraries[0].priceditinerary;
            let stop: Stop;
            let stops: Stop[] = [];
            let routes: Route[] = [];
            let route: Route;
            let routeType: RouteType;
            let flightSegments = [];
            let stopDuration;
            let otherSegments = []
            let totalDuration;
            let uniqueCode;
            for (let i = 0; i < flightRoutes.length; i++) {
                route = new Route;
                stops = [];
                totalDuration = 0;
                uniqueCode = '';
                flightSegments = flightRoutes[i]['origindestinationoptions'][0]['origindestinationoption'][0]['flightsegments'][0]['flightsegment'];
                otherSegments = flightRoutes[i]['airitinerarypricinginfo'][0]['ptc_farebreakdowns'][0]['ptc_farebreakdown'][0];

                flightSegments.forEach((flightSegment, j) => {
                    totalDuration += flightSegment['journeyduration'][0] * 60;

                    stop = new Stop();
                    stopDuration = "";
                    stop.departure_code = flightSegment['departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['departuredatetime'][0];


                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['eticket'][0] == 'true' ? true : false;


                    stop.flight_number = flightSegment['flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours} h ${stopDuration.minutes} m`
                    stop.airline = flightSegment['marketingairlinecode'][0];
                    stop.remaining_seat = parseInt(flightSegment['seatsremaining'][0]['number'][0]);
                    stop.below_minimum_seat = flightSegment['seatsremaining'][0]['belowminimum'][0] == 'true' ? true : false;


                    stop.is_layover = false;
                    stop.airline_name = airlines[flightSegment['marketingairlinecode'][0]];

                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;



                    stop.cabin_baggage =this.getBaggageDetails(otherSegments['cabinbaggageinfo'][0]['string'][j]);
                    //stop.cabin_baggage = '';
                    stop.checkin_baggage =this.getBaggageDetails(otherSegments['baggageinfo'][0]['string'][j]);

                    stop.meal = this.getMealCode(flightSegment['mealcode'][0]);


                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                        stop.layover_duration = `${layOverduration.hours} h ${layOverduration.minutes} m`
                        stop.layover_airport_name = flightSegment['departureairportlocationcode'][0];
                    }
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop)
                });


                routeType = new RouteType();
                routeType.type = 'outbound';
                routeType.stops = stops;
                route.routes[0] = routeType;
                route.route_code = flightRoutes[i]['airitinerarypricinginfo'][0]['faresourcecode'][0];

                route.fare_type = flightRoutes[i]['airitinerarypricinginfo'][0]['faretype'][0] == 'WebFare' ? 'LCC' : 'GDS';
                route.net_rate = Generic.convertAmountTocurrency(flightRoutes[i]['airitinerarypricinginfo'][0]['itintotalfare'][0]['totalfare'][0]['amount'][0], currencyDetails.liveRate);

                route.fare_break_dwon = this.getFareBreakDownForGzip(flightRoutes[i]['airitinerarypricinginfo'][0]['ptc_farebreakdowns'][0]['ptc_farebreakdown'], markUpDetails);

                route.selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, markUpDetails))



                let instalmentDetails = Instalment.weeklyInstalment(route.selling_price, moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, 0);
                if (instalmentDetails.instalment_available) {
                    route.start_price = instalmentDetails.instalment_date[0].instalment_amount;
                }
                else {
                    route.start_price = 0;
                }
                route.stop_count = stops.length - 1;
                route.is_passport_required = flightRoutes[i]['ispassportmandatory'][0] == "true" ? true : false;
                route.departure_code = source_location;
                route.arrival_code = destination_location;
                route.departure_date = stops[0].departure_date;
                route.departure_time = stops[0].departure_time;
                route.arrival_date = stops[stops.length - 1].arrival_date;
                route.arrival_time = stops[stops.length - 1].arrival_time;
                route.departure_info = typeof airports[source_location] !== 'undefined' ? airports[source_location] : {};
                route.arrival_info = typeof airports[destination_location] !== 'undefined' ? airports[destination_location] : {};
                let duration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                route.total_duration = `${duration.hours} h ${duration.minutes} m`;
                route.airline = stops[0].airline;
                route.airline_name = airlines[stops[0].airline];
                route.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stops[0].airline}.png`;
                route.is_refundable = flightRoutes[i]['airitinerarypricinginfo'][0]['isrefundable'][0] == 'Yes' ? true : false;
                route.unique_code = md5(uniqueCode)
                routes.push(route);
            }
            let flightSearchResult = new FlightSearchResult();
            flightSearchResult.items = routes;

            //Get min & max selling price
            let priceRange = new PriceRange();
            let priceType = 'selling_price';
            priceRange.min_price = this.getMinPrice(routes, priceType);
            priceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.price_range = priceRange;

            //Get min & max partail payment price
            let partialPaymentPriceRange = new PriceRange();
            priceType = 'secondary_start_price';
            partialPaymentPriceRange.min_price = this.getMinPrice(routes, priceType);
            partialPaymentPriceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.partial_payment_price_range = partialPaymentPriceRange;
            //return flightSearchResult;

            //Get Stops count and minprice
            flightSearchResult.stop_data = this.getStopCounts(routes, 'stop_count');

            //Get airline and min price
            flightSearchResult.airline_list = this.getAirlineCounts(routes)

            //Get Departure time slot
            flightSearchResult.depature_time_slot = this.getArrivalDepartureTimeSlot(routes, 'departure_time', 0)
            //Get Arrival time slot
            flightSearchResult.arrival_time_slot = this.getArrivalDepartureTimeSlot(routes, 'arrival_time', 0)
            return flightSearchResult;
        }
        else {

            return { message: "flight not found" }
        }


        
    }

    async cancelBooking(tripId: string) {
        let requestBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint">`;
        requestBody += `<soapenv:Header/>`;
        requestBody += `<soapenv:Body>`;
        requestBody += `<mys:CancelBooking>`;
        requestBody += `<mys:rq>`;
        requestBody += `<mys1:SessionId>5A14E536-B141-4A44-821C-06E74CDAEBE5-1847</mys1:SessionId>            `;
        requestBody += `<mys1:Target>Test</mys1:Target>            `;
        requestBody += `<mys1:UniqueID>${tripId}</mys1:UniqueID>`;
        requestBody += `</mys:rq>`;
        requestBody += `</mys:CancelBooking>`;
        requestBody += `</soapenv:Body>`;
        requestBody += `</soapenv:Envelope>`;
        let tripDetailsResult = await HttpRequest.mystiflyRequest('http://onepointdemo.myfarebox.com/V2/OnePoint.svc', requestBody, 'TripDetails');

        return tripDetailsResult
        }

    getMinPrice(routes, priceType) {
        return Math.min.apply(null, routes.map(item => item[priceType]))
    }

    getMaxPrice(routes, priceType) {
        return Math.max.apply(null, routes.map(item => item[priceType]))
    }

    getStopCounts(routes, type) {
        let stopsData = {
            non_stop: {
                count: 0,
                min_price: null
            },
            one_stop: {
                count: 0,
                min_price: null
            },
            two_and_two_plus_stop: {
                count: 0,
                min_price: null
            }
        };
        routes.forEach(route => {
            if (route[type] == 0) {
                if (stopsData.non_stop.min_price == null || (stopsData.non_stop.min_price > route.selling_price)) {
                    stopsData.non_stop.min_price = route.selling_price;
                }
                stopsData.non_stop.count += 1;
            }

            if (route[type] == 1) {
                if (stopsData.one_stop.min_price == null || (stopsData.one_stop.min_price > route.selling_price)) {
                    stopsData.one_stop.min_price = route.selling_price;
                }
                stopsData.one_stop.count += 1;
            }

            if (route[type] > 1) {
                if (stopsData.two_and_two_plus_stop.min_price == null || (stopsData.two_and_two_plus_stop.min_price > route.selling_price)) {
                    stopsData.two_and_two_plus_stop.min_price = route.selling_price;
                }
                stopsData.two_and_two_plus_stop.count += 1;
            }
        })
        return stopsData;
    }

    getAirlineCounts(routes) {
        let airlineList = [];
        let airlineData = {};
        routes.forEach(route => {

            airlineData = {}
            airlineData['airline_name'] = route.airline_name;
            airlineData['airline_code'] = route.airline;
            airlineData['selling_price'] = route.selling_price;
            airlineList.push(airlineData);

        })

        const result = [...airlineList.reduce((mp, o) => {
            if (!mp.has(o.airline_code)) mp.set(o.airline_code, { ...o, count: 0 });
            mp.get(o.airline_code).count++;
            return mp;
        }, new Map).values()];
        return result;
    }

    /**
     * 
     * @param routes 
     * @param type (departure_time, arrival_time)
     * @param routeType (0=> Outbound 1=>Inbound) 
     */
    getArrivalDepartureTimeSlot(routes, type, routeType) {

        let timeSlots = {

            first_slot: {
                min_price: 0,
                count: 0,
                from_time: '00:00 am',
                to_time: '05:59 am'
            },
            second_slot: {
                min_price: 0,
                count: 0,
                from_time: '06:00 am',
                to_time: '11:59 am'
            },
            third_slot: {
                min_price: 0,
                count: 0,
                from_time: '12:00 pm',
                to_time: '05:59 pm'
            },
            fourth_slot: {
                min_price: 0,
                count: 0,
                from_time: '06:00 pm',
                to_time: '11:59 pm'
            }
        }
        let sourceDate;
        routes.forEach(route => {
            if (type == 'departure_time') {
                sourceDate = moment(route.routes[routeType].stops[0][type], "HH:mm:a");
            }
            else {

                sourceDate = moment(route.routes[routeType].stops[route.routes[routeType].stops.length - 1][type], "HH:mm:a");
            }
            if (sourceDate.isBetween(
                moment(timeSlots.first_slot.from_time, "HH:mm:a"),
                moment(timeSlots.first_slot.to_time, "HH:mm:a"))) {
                timeSlots.first_slot.count += 1;
                if (timeSlots.first_slot.min_price == 0 || (timeSlots.first_slot.min_price > route.selling_price)) {
                    timeSlots.first_slot.min_price = route.selling_price;
                }
            }

            if (sourceDate.isBetween(
                moment(timeSlots.second_slot.from_time, "HH:mm:a"),
                moment(timeSlots.second_slot.to_time, "HH:mm:a"))) {
                timeSlots.second_slot.count += 1;
                if (timeSlots.second_slot.min_price == 0 || (timeSlots.second_slot.min_price > route.selling_price)) {
                    timeSlots.second_slot.min_price = route.selling_price;
                }
            }

            if (sourceDate.isBetween(
                moment(timeSlots.third_slot.from_time, "HH:mm:a"),
                moment(timeSlots.third_slot.to_time, "HH:mm:a"))) {
                timeSlots.third_slot.count += 1;
                if (timeSlots.third_slot.min_price == 0 || (timeSlots.third_slot.min_price > route.selling_price)) {
                    timeSlots.third_slot.min_price = route.selling_price;
                }
            }

            if (sourceDate.isBetween(
                moment(timeSlots.fourth_slot.from_time, "HH:mm:a"),
                moment(timeSlots.fourth_slot.to_time, "HH:mm:a"))) {
                timeSlots.fourth_slot.count += 1;
                if (timeSlots.fourth_slot.min_price == 0 || (timeSlots.fourth_slot.min_price > route.selling_price)) {
                    timeSlots.fourth_slot.min_price = route.selling_price;
                }
            }
        })
        return timeSlots;

        
    }

    async roundTripSearch(searchFlightDto: RoundtripSearchFlightDto, user) {

        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();
        const {
            source_location,
            destination_location,
            departure_date,
            arrival_date,
            flight_class,
            adult_count,
            child_count,
            infant_count
        } = searchFlightDto;

        let module = await getManager()
            .createQueryBuilder(Module, "module")
            .where("module.name = :name", { name: 'flight' })
            .getOne();

        if (!module) {
            throw new InternalServerErrorException(`Flight module is not configured in database&&&module&&&${errorMessage}`);
        }
        let bookingDate = moment(new Date()).format("YYYY-MM-DD");
        const currencyDetails = await Generic.getAmountTocurrency(this.headers.currency);
        //const markUpDetails   = await PriceMarkup.getMarkup(module.id,user.roleId);
        let markup = await this.getMarkupDetails(departure_date, bookingDate, user, module)
        let markUpDetails = markup.markUpDetails;
        let secondaryMarkUpDetails = markup.secondaryMarkUpDetails;
        if (!markUpDetails) {
            throw new InternalServerErrorException(`Markup is not configured for flight&&&module&&&${errorMessage}`);
        }

        let requestBody = '';
        requestBody += `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
        requestBody += `<soapenv:Header/>`
        requestBody += `<soapenv:Body>`
        requestBody += `<mys:AirLowFareSearch>`
        requestBody += `<mys:rq>`
        requestBody += `<mys1:OriginDestinationInformations>`
        requestBody += `<mys1:OriginDestinationInformation>`
        requestBody += `<mys1:DepartureDateTime>${departure_date}T00:00:00</mys1:DepartureDateTime>`
        requestBody += `<mys1:DestinationLocationCode>${destination_location}</mys1:DestinationLocationCode>`
        requestBody += `<mys1:OriginLocationCode>${source_location}</mys1:OriginLocationCode>`
        requestBody += `</mys1:OriginDestinationInformation>`
        requestBody += `<mys1:OriginDestinationInformation>`
        requestBody += `<mys1:DepartureDateTime>${arrival_date}T00:00:00</mys1:DepartureDateTime>`
        requestBody += `<mys1:DestinationLocationCode>${source_location}</mys1:DestinationLocationCode>`
        requestBody += `<mys1:OriginLocationCode>${destination_location}</mys1:OriginLocationCode>`
        requestBody += `</mys1:OriginDestinationInformation>`
        requestBody += `</mys1:OriginDestinationInformations>`
        requestBody += `<mys1:PassengerTypeQuantities>`
        if (adult_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>ADT</mys1:Code>`
            requestBody += `<mys1:Quantity>${adult_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (child_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>CHD</mys1:Code>`
            requestBody += `<mys1:Quantity>${child_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        if (infant_count > 0) {

            requestBody += `<mys1:PassengerTypeQuantity>`
            requestBody += `<mys1:Code>INF</mys1:Code>`
            requestBody += `<mys1:Quantity>${infant_count}</mys1:Quantity>`
            requestBody += `</mys1:PassengerTypeQuantity>`
        }

        requestBody += `</mys1:PassengerTypeQuantities>`
        requestBody += `<mys1:PricingSourceType>All</mys1:PricingSourceType>`
        requestBody += `<mys1:RequestOptions>TwoHundred</mys1:RequestOptions>`
        requestBody += `<mys1:SessionId>${sessionToken}</mys1:SessionId>`
        requestBody += `<mys1:Target>${mystiflyConfig.target}</mys1:Target>`
        requestBody += `<mys1:TravelPreferences>`
        requestBody += `<mys1:AirTripType>Return</mys1:AirTripType>`
        requestBody += `<mys1:CabinPreference>${this.getFlightClass(flight_class)}</mys1:CabinPreference>`
        requestBody += `<mys1:MaxStopsQuantity>All</mys1:MaxStopsQuantity>`
        requestBody += `<mys1:Preferences>`
        requestBody += `<mys1:CabinClassPreference>`
        requestBody += `<mys1:CabinType>${this.getFlightClass(flight_class)}</mys1:CabinType>`
        requestBody += `<mys1:PreferenceLevel>Restricted</mys1:PreferenceLevel>`
        requestBody += `</mys1:CabinClassPreference>`
        requestBody += `</mys1:Preferences>`
        requestBody += `</mys1:TravelPreferences>`
        requestBody += `</mys:rq>`
        requestBody += `</mys:AirLowFareSearch>`
        requestBody += `</soapenv:Body>`
        requestBody += `</soapenv:Envelope>`
        let searchResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'AirLowFareSearch');


        if (searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0]['a:success'][0] == "true") {


            let flightRoutes = searchResult['s:envelope']['s:body'][0].airlowfaresearchresponse[0].airlowfaresearchresult[0]['a:priceditineraries'][0]['a:priceditinerary'];
            let stop: Stop;
            let stops: Stop[] = [];
            let routes: Route[] = [];
            let route: Route;
            let routeType: RouteType;
            let outBoundflightSegments = [];
            let inBoundflightSegments = [];
            let stopDuration;
            let otherSegments = [];
            let j;
            let totalDuration;
            let uniqueCode;
            for (let i = 0; i < flightRoutes.length; i++) {
                totalDuration = 0;
                route = new Route;
                stops = [];
                j = 0;
                uniqueCode = '';
                outBoundflightSegments = flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][0]['a:flightsegments'][0]['a:flightsegment'];
                inBoundflightSegments = flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][1]['a:flightsegments'][0]['a:flightsegment'];
                otherSegments = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'][0];
                outBoundflightSegments.forEach(flightSegment => {
                    stop = new Stop();
                    totalDuration += flightSegment['a:journeyduration'][0] * 60;
                    stop.departure_code = flightSegment['a:departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['a:departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['a:departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['a:departuredatetime'][0];
                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['a:arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['a:arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['a:arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['a:arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['a:eticket'][0] == 'true' ? true : false;
                    stop.flight_number = flightSegment['a:flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['a:cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['a:journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours}h ${stopDuration.minutes}m`;
                    stop.airline = flightSegment['a:marketingairlinecode'][0];
                    stop.airline_name = airlines[stop.airline];
                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;
                    stop.remaining_seat = parseInt(flightSegment['a:seatsremaining'][0]['a:number'][0]);
                    stop.below_minimum_seat = flightSegment['a:seatsremaining'][0]['a:belowminimum'][0] == 'true' ? true : false;
                    stop.is_layover = false;
                    stop.cabin_baggage =this.getBaggageDetails(typeof otherSegments['a:cabinbaggageinfo']!=='undefined'?otherSegments['a:cabinbaggageinfo'][0]['a:cabinbaggage'][j]:'');
                    //stop.cabin_baggage = '';
                    stop.checkin_baggage =this.getBaggageDetails(otherSegments['a:baggageinfo'][0]['a:baggage'][j]);
                    stop.meal = this.getMealCode(flightSegment['a:mealcode'][0]);
                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                        stop.layover_duration = `${layOverduration.hours}h ${layOverduration.minutes}m`
                        stop.layover_airport_name = flightSegment['a:departureairportlocationcode'][0];
                    }
                    // uniqueCode += stop.departure_time;
                    // uniqueCode += stop.arrival_time;
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop)
                    j++;
                });

                routeType = new RouteType();
                routeType.type = 'outbound';
                routeType.stops = stops;
                let outBoundDuration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                routeType.duration = `${outBoundDuration.hours}h ${outBoundDuration.minutes}m`;
                route.routes[0] = routeType;
                route.is_passport_required = flightRoutes[i]['a:ispassportmandatory'][0] == "true" ? true : false;
                route.departure_date = stops[0].departure_date;
                route.departure_time = stops[0].departure_time;
                route.stop_count = stops.length - 1;
                stops = [];
                totalDuration = 0;
                inBoundflightSegments.forEach(flightSegment => {
                    stop = new Stop();
                    totalDuration += flightSegment['a:journeyduration'][0] * 60;
                    stop.departure_code = flightSegment['a:departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['a:departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['a:departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['a:departuredatetime'][0];
                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['a:arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['a:arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['a:arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['a:arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['a:eticket'][0] == 'true' ? true : false;
                    stop.flight_number = flightSegment['a:flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['a:cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['a:journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours}h ${stopDuration.minutes}m`;
                    stop.airline = flightSegment['a:marketingairlinecode'][0];
                    stop.airline_name = airlines[stop.airline];
                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;
                    stop.remaining_seat = parseInt(flightSegment['a:seatsremaining'][0]['a:number'][0]);
                    stop.below_minimum_seat = flightSegment['a:seatsremaining'][0]['a:belowminimum'][0] == 'true' ? true : false;
                    stop.is_layover = false;
                    stop.cabin_baggage =this.getBaggageDetails(typeof otherSegments['a:cabinbaggageinfo']!=='undefined'?otherSegments['a:cabinbaggageinfo'][0]['a:cabinbaggage'][j]:'');
                    //stop.cabin_baggage = '';
                    stop.checkin_baggage =this.getBaggageDetails(otherSegments['a:baggageinfo'][0]['a:baggage'][j])
                    stop.meal = this.getMealCode(flightSegment['a:mealcode'][0]);
                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        stop.layover_duration = `${layOverduration.hours}h ${layOverduration.minutes}m`
                        stop.layover_airport_name = flightSegment['a:departureairportlocationcode'][0];
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                    }
                    // uniqueCode += stop.departure_time;
                    // uniqueCode += stop.arrival_time;
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop)
                    j++;
                });
                routeType = new RouteType();
                routeType.type = 'inbound';
                routeType.stops = stops;
                let inBoundDuration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                routeType.duration = `${inBoundDuration.hours}h ${inBoundDuration.minutes}m`;
                route.routes[1] = routeType;
                route.route_code = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faresourcecode'][0];
                route.fare_type = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faretype'][0] == 'WebFare' ? 'LCC' : 'GDS';
                route.net_rate = Generic.convertAmountTocurrency(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:itintotalfare'][0]['a:totalfare'][0]['a:amount'][0], currencyDetails.liveRate);
                route.selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, markUpDetails))
                route.fare_break_dwon = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], markUpDetails);
                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_fare_break_down = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], secondaryMarkUpDetails);
                }
                let instalmentDetails = Instalment.weeklyInstalment(route.selling_price, moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, 0);
                if (instalmentDetails.instalment_available) {
                    route.start_price = instalmentDetails.instalment_date[0].instalment_amount;
                    route.secondary_start_price = instalmentDetails.instalment_date[1].instalment_amount;
                }
                else {
                    route.start_price = 0;
                    route.secondary_start_price = 0;
                }

                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, secondaryMarkUpDetails))
                }
                else {
                    route.secondary_selling_price = 0;
                }
                route.instalment_details = instalmentDetails;
                route.inbound_stop_count = stops.length - 1;
                route.departure_code = source_location;
                route.arrival_code = destination_location;
                route.departure_info = typeof airports[source_location] !== 'undefined' ? airports[source_location] : {};
                route.arrival_info = typeof airports[destination_location] !== 'undefined' ? airports[destination_location] : {};
                route.arrival_date = stops[stops.length - 1].arrival_date;
                route.arrival_time = stops[stops.length - 1].arrival_time;
                let duartion = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);

                route.total_duration = `${duartion.hours}h ${duartion.minutes}m`;
                route.airline = stops[0].airline;
                route.airline_name = airlines[stops[0].airline];
                route.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stops[0].airline}.png`;
                route.is_refundable = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:isrefundable'][0] == 'Yes' ? true : false;
                route.unique_code = md5(uniqueCode)
                routes.push(route);
            }
            //return routes;
            let flightSearchResult = new FlightSearchResult();
            flightSearchResult.items = routes;

            //Get min & max selling price
            let priceRange = new PriceRange();
            let priceType = 'selling_price';
            priceRange.min_price = this.getMinPrice(routes, priceType);
            priceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.price_range = priceRange;

            //Get min & max partail payment price
            let partialPaymentPriceRange = new PriceRange();
            priceType = 'secondary_start_price';
            partialPaymentPriceRange.min_price = this.getMinPrice(routes, priceType);
            partialPaymentPriceRange.max_price = this.getMaxPrice(routes, priceType);
            flightSearchResult.partial_payment_price_range = partialPaymentPriceRange;
            //return flightSearchResult;

            //Get Stops count and minprice
            flightSearchResult.stop_data = this.getStopCounts(routes, 'stop_count');

            //Get Stops count and minprice
            flightSearchResult.inbound_stop_data = this.getStopCounts(routes, 'inbound_stop_count');

            //Get airline and min price
            flightSearchResult.airline_list = this.getAirlineCounts(routes)

            //Get outbound Departure time slot
            flightSearchResult.depature_time_slot = this.getArrivalDepartureTimeSlot(routes, 'departure_time', 0)
            //Get outbound Arrival time slot
            flightSearchResult.arrival_time_slot = this.getArrivalDepartureTimeSlot(routes, 'arrival_time', 0)

            //Get inbound Departure time slot
            flightSearchResult.inbound_depature_time_slot = this.getArrivalDepartureTimeSlot(routes, 'departure_time', 1)
            //Get inbound Arrival time slot
            flightSearchResult.inbound_arrival_time_slot = this.getArrivalDepartureTimeSlot(routes, 'arrival_time', 1)
            return flightSearchResult;
        }
        else {

            throw new NotFoundException(`No flight founds`)
        }
    }

    async baggageDetails(routeIdDto) {

        const { route_code } = routeIdDto;
        let fareRuleResult = await this.fareRule(route_code);
        if (fareRuleResult['s:envelope']['s:body'][0].farerules1_1response[0].farerules1_1result[0]['a:success'][0] == 'true') {

            let baggageResult = fareRuleResult['s:envelope']['s:body'][0].farerules1_1response[0].farerules1_1result[0]['a:baggageinfos'][0]['a:baggageinfo'];

            let baggageInfos = [];
            let baggageInfo: any = {};
            for (let baggage of baggageResult) {
                baggageInfo = {};
                baggageInfo.departure_code = baggage['a:departure'][0];

                baggageInfo.departure_airport = typeof airports[baggage['a:departure'][0]] != "undefined" ? airports[baggage['a:departure'][0]].name : "";

                baggageInfo.arrival_code = baggage['a:arrival'][0];
                baggageInfo.arrival_airport = typeof airports[baggage['a:arrival'][0]] != "undefined" ? airports[baggage['a:arrival'][0]].name : '';
                baggageInfo.baggage_capacity = baggage['a:baggage'][0];
                baggageInfo.flight_number = baggage['a:flightno'][0];
                //baggageInfo.airline_name = airlines[airLineCode];
                baggageInfos.push(baggageInfo);
            }
            return baggageInfos;
        }
        else {
            throw new NotFoundException(`No baggage details is found`)
        }
    }

    async fareRule(route_code) {
        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();

        const requestBody =
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint.AirRules1_1">
            <soapenv:Header/>
            <soapenv:Body>
               <mys:FareRules1_1>
                <mys:rq>
                 <mys1:FareSourceCode>${route_code}</mys1:FareSourceCode>
                   <mys1:SessionId>${sessionToken}</mys1:SessionId>
                  <mys1:Target>${mystiflyConfig.target}</mys1:Target>
                  </mys:rq>
               </mys:FareRules1_1>
            </soapenv:Body>
         </soapenv:Envelope>`;
        let fareRuleResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'FareRules1_1');
        return fareRuleResult;
    }

    async airRevalidate(routeIdDto, user) {

        const { route_code } = routeIdDto;
        let module = await getManager()
            .createQueryBuilder(Module, "module")
            .where("module.name = :name", { name: 'flight' })
            .getOne();

        if (!module) {
            throw new InternalServerErrorException(`Flight module is not configured in database&&&module&&&${errorMessage}`);
        }
        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();
        // console.log("mystiflyConfig", mystiflyConfig)
        const requestBody =
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint"><soapenv:Header/>
            <soapenv:Body>
               <mys:AirRevalidate>
                     <mys:rq>
                      <mys1:FareSourceCode>${route_code}</mys1:FareSourceCode>
                      <mys1:SessionId>${sessionToken}</mys1:SessionId>
                      <mys1:Target>${mystiflyConfig.target}</mys1:Target>
                  </mys:rq>
              </mys:AirRevalidate>
            </soapenv:Body>
            </soapenv:Envelope>`;
        const currencyDetails = await Generic.getAmountTocurrency(this.headers.currency);
        let airRevalidateResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'AirRevalidate');
        if (airRevalidateResult['s:envelope']['s:body'][0].airrevalidateresponse[0].airrevalidateresult[0]['a:success'][0] == "true") {


            let bookingDate = moment(new Date()).format("YYYY-MM-DD");
            let flightRoutes = airRevalidateResult['s:envelope']['s:body'][0].airrevalidateresponse[0].airrevalidateresult[0]['a:priceditineraries'][0]['a:priceditinerary'];
            let stop: Stop;
            let stops: Stop[] = [];
            let routes: Route[] = [];
            let route: Route;
            let routeType: RouteType;
            let outBoundflightSegments = [];
            let inBoundflightSegments = [];
            let stopDuration;

            if (typeof flightRoutes != 'object') {
                throw new NotFoundException(`Flight is not available now`);
            }

            let totalDuration;
            let uniqueCode;
            let otherSegments;
            for (let i = 0; i < flightRoutes.length; i++) {
                route = new Route;
                stops = [];
                totalDuration = 0;
                uniqueCode = '';
                let j = 0;
                outBoundflightSegments = flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][0]['a:flightsegments'][0]['a:flightsegment'];
                otherSegments = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'][0];
                if (typeof flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][1] != 'undefined')
                    inBoundflightSegments = flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][1]['a:flightsegments'][0]['a:flightsegment'];

                outBoundflightSegments.forEach(flightSegment => {
                    stop = new Stop();
                    totalDuration += flightSegment['a:journeyduration'][0] * 60;
                    stop.departure_code = flightSegment['a:departureairportlocationcode'][0];
                    stop.departure_date = moment(flightSegment['a:departuredatetime'][0]).format("DD/MM/YYYY")
                    stop.departure_time = moment(flightSegment['a:departuredatetime'][0]).format("hh:mm A")
                    stop.departure_date_time = flightSegment['a:departuredatetime'][0];
                    stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                    stop.arrival_code = flightSegment['a:arrivalairportlocationcode'][0];
                    stop.arrival_date = moment(flightSegment['a:arrivaldatetime'][0]).format("DD/MM/YYYY")
                    stop.arrival_time = moment(flightSegment['a:arrivaldatetime'][0]).format("hh:mm A")
                    stop.arrival_date_time = flightSegment['a:arrivaldatetime'][0];
                    stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                    stop.eticket = flightSegment['a:eticket'][0] == 'true' ? true : false;
                    stop.flight_number = flightSegment['a:flightnumber'][0];
                    stop.cabin_class = this.getKeyByValue(flightClass, flightSegment['a:cabinclasscode'][0]);
                    stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['a:journeyduration'][0] * 60);
                    stop.duration = `${stopDuration.hours}h ${stopDuration.minutes}m`;
                    stop.airline = flightSegment['a:marketingairlinecode'][0];
                    stop.remaining_seat = parseInt(flightSegment['a:seatsremaining'][0]['a:number'][0]);
                    stop.below_minimum_seat = flightSegment['a:seatsremaining'][0]['a:belowminimum'][0] == 'true' ? true : false;
                    stop.is_layover = false;
                    stop.airline_name = airlines[stop.airline];
                    stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;
                    stop.checkin_baggage = this.getBaggageDetails(otherSegments['a:baggageinfo'][0]['a:baggage'][j]);
                    stop.cabin_baggage   =this.getBaggageDetails(typeof otherSegments['a:cabinbaggageinfo']!=='undefined'?otherSegments['a:cabinbaggageinfo'][0]['a:cabinbaggage'][j]:'');
                    if (stops.length > 0) {

                        stop.is_layover = true;
                        let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                        stop.layover_duration = `${layOverduration.hours}h ${layOverduration.minutes}m`
                        stop.layover_airport_name = flightSegment['a:departureairportlocationcode'][0];
                        totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                    }
                    // uniqueCode += stop.departure_time;
                    // uniqueCode += stop.arrival_time;
                    uniqueCode += stop.flight_number;
                    uniqueCode += stop.airline;
                    uniqueCode += stop.cabin_class;
                    stops.push(stop);
                    j++;
                });

                routeType = new RouteType();
                routeType.type = 'outbound';
                routeType.stops = stops;
                let outBoundDuration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                routeType.duration = `${outBoundDuration.hours}h ${outBoundDuration.minutes}m`;
                route.routes[0] = routeType;
                route.is_passport_required = flightRoutes[i]['a:ispassportmandatory'][0] == "true" ? true : false;
                route.departure_date = stops[0].departure_date;
                route.departure_time = stops[0].departure_time;
                route.departure_code = stops[0].departure_code;
                route.departure_info = typeof airports[route.departure_code] !== 'undefined' ? airports[route.departure_code] : {};
                route.arrival_code = stops[stops.length - 1].arrival_code;
                route.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                if (typeof flightRoutes[i]['a:origindestinationoptions'][0]['a:origindestinationoption'][1] != 'undefined') {
                    stops = [];
                    totalDuration = 0;
                    inBoundflightSegments.forEach(flightSegment => {
                        stop = new Stop();
                        totalDuration += flightSegment['a:journeyduration'][0] * 60;
                        stop.departure_code = flightSegment['a:departureairportlocationcode'][0];
                        stop.departure_date = moment(flightSegment['a:departuredatetime'][0]).format("DD/MM/YYYY")
                        stop.departure_time = moment(flightSegment['a:departuredatetime'][0]).format("hh:mm A")
                        stop.departure_date_time = flightSegment['a:departuredatetime'][0];
                        stop.departure_info = typeof airports[stop.departure_code] !== 'undefined' ? airports[stop.departure_code] : {};
                        stop.arrival_code = flightSegment['a:arrivalairportlocationcode'][0];
                        stop.arrival_date = moment(flightSegment['a:arrivaldatetime'][0]).format("DD/MM/YYYY")
                        stop.arrival_time = moment(flightSegment['a:arrivaldatetime'][0]).format("hh:mm A")
                        stop.arrival_date_time = flightSegment['a:arrivaldatetime'][0];
                        stop.arrival_info = typeof airports[stop.arrival_code] !== 'undefined' ? airports[stop.arrival_code] : {};
                        stop.eticket = flightSegment['a:eticket'][0] == 'true' ? true : false;
                        stop.flight_number = flightSegment['a:flightnumber'][0];
                        stopDuration = DateTime.convertSecondsToHourMinutesSeconds(flightSegment['a:journeyduration'][0] * 60);
                        stop.duration = `${stopDuration.hours}h ${stopDuration.minutes}m`;
                        stop.airline = flightSegment['a:marketingairlinecode'][0];
                        stop.airline_name = airlines[stop.airline];
                        stop.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stop.airline}.png`;
                        stop.remaining_seat = parseInt(flightSegment['a:seatsremaining'][0]['a:number'][0]);
                        stop.below_minimum_seat = flightSegment['a:seatsremaining'][0]['a:belowminimum'][0] == 'true' ? true : false;
                        stop.is_layover = false;
                        stop.checkin_baggage =this.getBaggageDetails(otherSegments['a:baggageinfo'][0]['a:baggage'][j]);
                        stop.cabin_baggage   =this.getBaggageDetails(typeof otherSegments['a:cabinbaggageinfo']!=='undefined'?otherSegments['a:cabinbaggageinfo'][0]['a:cabinbaggage'][j]:'');
                        if (stops.length > 0) {

                            stop.is_layover = true;
                            let layOverduration = DateTime.convertSecondsToHourMinutesSeconds(moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds'));
                            stop.layover_duration = `${layOverduration.hours} h ${layOverduration.minutes} m`
                            stop.layover_airport_name = flightSegment['a:departureairportlocationcode'][0];
                            totalDuration += moment(stop.departure_date_time).diff(stops[stops.length - 1].arrival_date_time, 'seconds');
                        }
                        // uniqueCode += stop.departure_time;
                        // uniqueCode += stop.arrival_time;
                        uniqueCode += stop.flight_number;
                        uniqueCode += stop.airline;
                        uniqueCode += stop.cabin_class;
                        stops.push(stop);
                        j++;
                    });

                    routeType = new RouteType();
                    routeType.type = 'inbound';
                    routeType.stops = stops;
                    let inBoundDuration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);
                    routeType.duration = `${inBoundDuration.hours}h ${inBoundDuration.minutes}m`;
                    route.routes[1] = routeType;
                }

                let markup = await this.getMarkupDetails(moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, user, module)
                let markUpDetails = markup.markUpDetails;
                let secondaryMarkUpDetails = markup.secondaryMarkUpDetails;
                if (!markUpDetails) {
                    throw new InternalServerErrorException(`Markup is not configured for flight&&&module&&&${errorMessage}`);
                }
                route.route_code = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faresourcecode'][0];
                route.fare_type = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:faretype'][0] == 'WebFare' ? 'LCC' : 'GDS';
                route.net_rate = Generic.convertAmountTocurrency(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:itintotalfare'][0]['a:totalfare'][0]['a:amount'][0], currencyDetails.liveRate);
                route.selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, markUpDetails))
                let instalmentDetails = Instalment.weeklyInstalment(route.selling_price, moment(stops[0].departure_date, 'DD/MM/YYYY').format("YYYY-MM-DD"), bookingDate, 0);
                if (instalmentDetails.instalment_available) {
                    route.start_price = instalmentDetails.instalment_date[0].instalment_amount;
                    route.secondary_start_price = instalmentDetails.instalment_date[1].instalment_amount;
                }
                else {
                    route.start_price = 0;
                    route.secondary_start_price = 0;
                }

                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_selling_price = Generic.formatPriceDecimal(PriceMarkup.applyMarkup(route.net_rate, secondaryMarkUpDetails))
                }
                else {
                    route.secondary_selling_price = 0;
                }
                route.instalment_details = instalmentDetails;
                route.stop_count = stops.length - 1;


                route.arrival_date = stops[stops.length - 1].arrival_date;
                route.arrival_time = stops[stops.length - 1].arrival_time;
                let duration = DateTime.convertSecondsToHourMinutesSeconds(totalDuration);

                route.total_duration = `${totalDuration.hours}h ${totalDuration.minutes}m`;
                route.airline = stops[0].airline;
                route.airline_name = airlines[stops[0].airline];
                route.airline_logo = `${s3BucketUrl}/assets/images/airline/108x92/${stops[0].airline}.png`;
                route.is_refundable = flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:isrefundable'][0] == 'Yes' ? true : false;
                route.fare_break_dwon = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], markUpDetails);
                if (typeof secondaryMarkUpDetails != 'undefined' && Object.keys(secondaryMarkUpDetails).length) {
                    route.secondary_fare_break_down = this.getFareBreakDown(flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown'], secondaryMarkUpDetails);
                }
                route.unique_code = md5(uniqueCode)
                for (let intnery of flightRoutes[i]['a:airitinerarypricinginfo'][0]['a:ptc_farebreakdowns'][0]['a:ptc_farebreakdown']) {

                    if (intnery['a:passengertypequantity'][0]['a:code'] == 'ADT') {
                        route.adult_count = intnery['a:passengertypequantity'][0]['a:quantity'][0];
                    }
                    if (intnery['a:passengertypequantity'][0]['a:code'] == 'CHD') {
                        route.child_count = intnery['a:passengertypequantity'][0]['a:quantity'][0];
                    }
                    if (intnery['a:passengertypequantity'][0]['a:code'] == 'INF') {
                        route.infant_count = intnery['a:passengertypequantity'][0]['a:quantity'][0];
                    }
                }




                routes.push(route);
            }
            return routes;
        }
        else {
            throw new NotFoundException(`Flight is not available now`);
        }

    }

    async bookFlight(bookFlightDto, traveles, isPassportRequired) {

        const { route_code } = bookFlightDto;
        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();

        let requestBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint" xmlns:mys2="Mystifly.OnePoint.OnePointEntities">`;
        requestBody += `<soapenv:Header/>`
        requestBody += `<soapenv:Body>`
        requestBody += `<mys:BookFlight>`
        requestBody += `<mys:rq>`
        requestBody += `<mys1:FareSourceCode>${route_code}</mys1:FareSourceCode>`
        requestBody += `<mys1:SessionId>${sessionToken}</mys1:SessionId>`
        requestBody += `<mys1:Target>${mystiflyConfig.target}</mys1:Target>`
        requestBody += `<mys1:TravelerInfo>`
        requestBody += `<mys1:AirTravelers>`

        let title;
        if (traveles.adults.length) {

            for (let i = 0; i < traveles.adults.length; i++) {
                title = '';
                requestBody += `<mys1:AirTraveler>`
                requestBody += `<mys1:DateOfBirth>${traveles.adults[i].dob}T00:00:00</mys1:DateOfBirth>`
                requestBody += `<mys1:Gender>${traveles.adults[i].gender}</mys1:Gender>`
                requestBody += `<mys1:PassengerName>`
                requestBody += `<mys1:PassengerFirstName>${traveles.adults[i].firstName}</mys1:PassengerFirstName>`
                requestBody += `<mys1:PassengerLastName>${traveles.adults[i].lastName}</mys1:PassengerLastName>`
                title = traveles.adults[i].gender == 'M' ? 'MR' : 'MS';
                requestBody += `<mys1:PassengerTitle>${title}</mys1:PassengerTitle>`
                requestBody += `</mys1:PassengerName>`
                requestBody += `<mys1:PassengerNationality>${traveles.adults[i].country.iso2}</mys1:PassengerNationality>`;
                requestBody += `<mys1:PassengerType>ADT</mys1:PassengerType>`
                if (isPassportRequired) {
                    requestBody += `<mys1:Passport>`
                    requestBody += `<mys1:Country>${traveles.adults[i].country.iso2}</mys1:Country>`
                    requestBody += `<mys1:ExpiryDate>${traveles.adults[i].passportExpiry}T00:00:00</mys1:ExpiryDate>`
                    requestBody += `<mys1:PassportNumber>${traveles.adults[i].passportNumber}</mys1:PassportNumber>`
                    requestBody += `</mys1:Passport>`
                }
                requestBody += `</mys1:AirTraveler>`
            }
        }

        if (traveles.children.length) {

            for (let i = 0; i < traveles.children.length; i++) {
                title = '';
                requestBody += `<mys1:AirTraveler>`
                requestBody += `<mys1:DateOfBirth>${traveles.children[i].dob}T00:00:00</mys1:DateOfBirth>`
                requestBody += `<mys1:Gender>${traveles.children[i].gender}</mys1:Gender>`
                requestBody += `<mys1:PassengerName>`
                requestBody += `<mys1:PassengerFirstName>${traveles.children[i].firstName}</mys1:PassengerFirstName>`
                requestBody += `<mys1:PassengerLastName>${traveles.children[i].lastName}</mys1:PassengerLastName>`
                title = traveles.children[i].gender == 'M' ? 'MR' : 'MS';
                requestBody += `<mys1:PassengerTitle>${title}</mys1:PassengerTitle>`
                requestBody += `</mys1:PassengerName>`
                requestBody += `<mys1:PassengerNationality>${traveles.children[i].country.iso2}</mys1:PassengerNationality>`;
                requestBody += `<mys1:PassengerType>CHD</mys1:PassengerType>`

                if (isPassportRequired) {

                    requestBody += `<mys1:Passport>`
                    requestBody += `<mys1:Country>${traveles.children[i].country.iso2}</mys1:Country>`
                    requestBody += `<mys1:ExpiryDate>${traveles.children[i].passportExpiry}T00:00:00</mys1:ExpiryDate>`
                    requestBody += `<mys1:PassportNumber>${traveles.children[i].passportNumber}</mys1:PassportNumber>`
                    requestBody += `</mys1:Passport>`
                }
                requestBody += `</mys1:AirTraveler>`
            }
        }

        if (traveles.infants.length) {

            for (let i = 0; i < traveles.infants.length; i++) {
                title = '';
                requestBody += `<mys1:AirTraveler>`
                requestBody += `<mys1:DateOfBirth>${traveles.infants[i].dob}T00:00:00</mys1:DateOfBirth>`
                requestBody += `<mys1:Gender>${traveles.infants[i].gender}</mys1:Gender>`
                requestBody += `<mys1:PassengerName>`
                requestBody += `<mys1:PassengerFirstName>${traveles.infants[i].firstName}</mys1:PassengerFirstName>`
                requestBody += `<mys1:PassengerLastName>${traveles.infants[i].lastName}</mys1:PassengerLastName>`
                title = traveles.infants[i].gender == 'M' ? 'MR' : 'MS';
                requestBody += `<mys1:PassengerTitle>${title}</mys1:PassengerTitle>`
                requestBody += `</mys1:PassengerName>`
                requestBody += `<mys1:PassengerNationality>${traveles.infants[i].country.iso2}</mys1:PassengerNationality>`;
                requestBody += `<mys1:PassengerType>INF</mys1:PassengerType>`
                /* if(traveles.infants[i].passportExpiry && traveles.infants[i].passportNumber){

                    requestBody += `<mys1:Passport>`
                    requestBody += `<mys1:Country>${traveles.infants[i].country.iso2}</mys1:Country>`
                    requestBody += `<mys1:ExpiryDate>${traveles.infants[i].passportExpiry}T00:00:00</mys1:ExpiryDate>`
                    requestBody += `<mys1:PassportNumber>${traveles.infants[i].passportNumber}</mys1:PassportNumber>`
                    requestBody += `</mys1:Passport>`
                } */
                requestBody += `</mys1:AirTraveler>`
            }
        }

        requestBody += `</mys1:AirTravelers>`
        requestBody += `<mys1:AreaCode>141</mys1:AreaCode>`
        requestBody += `<mys1:CountryCode>44</mys1:CountryCode>`
        requestBody += `<mys1:Email>peter@gmail.com</mys1:Email>`
        requestBody += `<mys1:PhoneNumber>5467890</mys1:PhoneNumber>`
        requestBody += `<mys1:PostCode>G1 1QN</mys1:PostCode>`
        requestBody += `</mys1:TravelerInfo>`
        requestBody += `</mys:rq>`
        requestBody += `</mys:BookFlight>`
        requestBody += `</soapenv:Body>`
        requestBody += `</soapenv:Envelope>`

        let bookResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'BookFlight');
        console.log(JSON.stringify(bookResult));

        let bookResultSegment = bookResult['s:envelope']['s:body'][0]['bookflightresponse'][0]['bookflightresult'][0];
        let bookingResponse;
        if (bookResultSegment['a:success'][0] == 'true') {

            bookingResponse = {
                booking_status: 'success',
                supplier_status: bookResultSegment['a:status'][0],
                supplier_booking_id: bookResultSegment['a:uniqueid'][0],
                success_message: `Booking is successfully done!`,
                error_message: ''
            }
        }
        else {

            bookingResponse = {
                booking_status: 'failed',
                supplier_booking_id: '',
                success_message: ``,
                error_message: `Booking failed`
            }
        }
        return bookingResponse;
    }

    async tripDetails(tripId) {
        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();
        //console.log(mystiflyConfig);

        console.log("mystiflyConfig", mystiflyConfig)
        let requestBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint">`;
        requestBody += `<soapenv:Header/>`;
        requestBody += `<soapenv:Body>`;
        requestBody += `<mys:TripDetails>`;
        requestBody += `<mys:rq>`;
        requestBody += `<mys1:SessionId>5A14E536-B141-4A44-821C-06E74CDAEBE5-1847</mys1:SessionId>            `;
        requestBody += `<mys1:Target>Test</mys1:Target>            `;
        requestBody += `<mys1:UniqueID>${tripId}</mys1:UniqueID>`;
        requestBody += `</mys:rq>`;
        requestBody += `</mys:TripDetails>`;
        requestBody += `</soapenv:Body>`;
        requestBody += `</soapenv:Envelope>`;
        mystiflyConfig.url = 'http://onepointdemo.myfarebox.com/V2/OnePoint.svc';
        let tripDetailsResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'TripDetails');
        //console.log("tripDetailsResult", JSON.stringify(tripDetailsResult))
        if (tripDetailsResult["s:envelope"]["s:body"][0]["tripdetailsresponse"][0]["tripdetailsresult"][0]["a:success"][0] == 'true') {

            let travelItinerary = tripDetailsResult["s:envelope"]["s:body"][0]["tripdetailsresponse"][0]["tripdetailsresult"][0]["a:travelitinerary"][0];

            let tripDetails: any = {};
            tripDetails.booking_status = travelItinerary['a:bookingstatus'][0];
            tripDetails.fare_type = travelItinerary['a:faretype'][0];
            tripDetails.ticket_status = travelItinerary['a:ticketstatus'][0];
            tripDetails.unique_id = travelItinerary['a:uniqueid'][0];
            tripDetails.data = travelItinerary;





            return tripDetails;
        }
        else {
            throw new NotFoundException(`Trip details not found!`)
        }
    }

    async cancellationPolicy(routeIdDto) {
        const { route_code } = routeIdDto;
        let fareRuleResult = await this.fareRule(route_code);
        if (fareRuleResult['s:envelope']['s:body'][0].farerules1_1response[0].farerules1_1result[0]['a:success'][0] == 'true') {

            let ruleDetails = fareRuleResult['s:envelope']['s:body'][0].farerules1_1response[0].farerules1_1result[0]['a:farerules'][0]['a:farerule'][0]['a:ruledetails'][0]['a:ruledetail'];
            if (ruleDetails.length) {
                let cancellationPolicy = ruleDetails.filter(ruleDetail => {

                    if (ruleDetail['a:category'][0] == 'PENALTIES') {
                        return ruleDetail['a:rules'][0]
                    }
                })

                if (cancellationPolicy.length) {

                    return {
                        cancellation_policy: cancellationPolicy[0]['a:rules'][0]
                    }
                }
                else {
                    throw new NotFoundException(`No cancellation policy is found.`)
                }
            }
            else {
                throw new NotFoundException(`No cancellation policy is found.`)
            }
        }
        else {
            throw new NotFoundException(`No cancellation policy is found.`)
        }
    }

    async ticketFlight(bookingId) {

        const mystiflyConfig = await this.getMystiflyCredential();
        const sessionToken = await this.startSession();
        console.log(mystiflyConfig);

        let requestBody = '';
        requestBody += `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mys="Mystifly.OnePoint" xmlns:mys1="http://schemas.datacontract.org/2004/07/Mystifly.OnePoint">`;
        requestBody += `<soapenv:Header/>`;
        requestBody += `<soapenv:Body>`;
        requestBody += `<mys:TicketOrder>`;
        requestBody += `<mys:rq>`;
        requestBody += `<mys1:SessionId>${sessionToken}</mys1:SessionId>`;
        requestBody += `<mys1:Target>${mystiflyConfig.target}</mys1:Target>`;
        requestBody += `<mys1:UniqueID>${bookingId}</mys1:UniqueID>`;
        requestBody += `</mys:rq>`;
        requestBody += `</mys:TicketOrder>`;
        requestBody += `</soapenv:Body>`;
        requestBody += `</soapenv:Envelope>`;
        let ticketResult = await HttpRequest.mystiflyRequest(mystiflyConfig.url, requestBody, 'TicketOrder');
        ticketResult = ticketResult['s:envelope']['s:body'][0]['ticketorderresponse'][0]['ticketorderresult'][0];
        return {
            status: ticketResult['a:success'][0],
            error: ticketResult['a:errors'],
        }
    }

    getFlightClass(className) {
        return flightClass[className];
    }

    getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }

    getFareBreakDown(fares, markUpDetails) {

        let fareBreakDowns: FareInfo[] = [];
        let fareInfo;
        let totalFare = 0;
        let totalTraveler = 0;
        for (let fare of fares) {
            fareInfo = new FareInfo();

            fareInfo.type = fare['a:passengertypequantity'][0]['a:code'][0];
            fareInfo.quantity = Number(fare['a:passengertypequantity'][0]['a:quantity'][0]);
            fareInfo.price = PriceMarkup.applyMarkup(parseFloat(fare['a:passengerfare'][0]['a:totalfare'][0]['a:amount'][0]) * parseInt(fareInfo.quantity), markUpDetails)

            fareBreakDowns.push(fareInfo)

            totalFare += parseFloat(fareInfo.price);
            totalTraveler += parseInt(fareInfo.quantity)
        }

        fareBreakDowns.push({
            type: 'total',
            quantity: Number(totalTraveler),
            price: totalFare
        })

        return fareBreakDowns;
    }

    getMealCode(code) {

        return mealCodes[code] || '';
    }

    getFareBreakDownForGzip(fares, markUpDetails) {

        let fareBreakDowns: FareInfo[] = [];
        let fareInfo;
        let totalFare = 0;
        let totalTraveler = 0;
        for (let fare of fares) {
            fareInfo = new FareInfo();
            fareInfo.type = fare['passengertypequantity'][0]['code'][0];


            fareInfo.quantity = fare['passengertypequantity'][0]['quantity'][0];

            fareInfo.price = PriceMarkup.applyMarkup(parseFloat(fare['passengerfare'][0]['totalfare'][0]['amount'][0]) * parseInt(fareInfo.quantity), markUpDetails)

            fareBreakDowns.push(fareInfo)

            totalFare += parseFloat(fareInfo.price);
            totalTraveler += parseInt(fareInfo.quantity)
        }

        fareBreakDowns.push({
            type: 'total',
            quantity: totalTraveler,
            price: totalFare
        })

        return fareBreakDowns;
    }

    getBaggageDetails(code){

        let bags={
            'SB':'Standard Baggage'
        }

        if(typeof bags[code]!=='undefined')
            return bags[code]
        else    
            return code;
    }
} 
