import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "src/auth/user.repository";
import { InjectRepository } from "@nestjs/typeorm";
import { MailerService } from "@nestjs-modules/mailer";
import { Role } from "src/enum/role.enum";
import { Activity } from "src/utility/activity.utility";
import * as config from "config";
const mailConfig = config.get("email");
import { ConvertCustomerMail } from "src/config/email_template/convert-user-mail.html";
import { FlightService } from "src/flight/flight.service";
import { AdvancedConsoleLogger, getConnection, getManager } from "typeorm";
import { Booking } from "src/entity/booking.entity";
import { BookingRepository } from "src/booking/booking.repository";
import { BookingInstalments } from "src/entity/booking-instalments.entity";
import { BookingType } from "src/enum/booking-type.enum";
import { PaymentStatus } from "src/enum/payment-status.enum";
import { PaymentService } from "src/payment/payment.service";
import { FailedPaymentAttempt } from "src/entity/failed-payment-attempt.entity";
import { missedPaymentInstallmentMail } from "src/config/email_template/missed-payment-installment-mail.html";
import { PaymentInstallmentMail } from "src/config/email_template/payment-installment-mail.html";
import { BookingStatus } from "src/enum/booking-status.enum";
import { BookFlightDto } from "src/flight/dto/book-flight.dto";
import { LayCreditEarn } from "src/entity/lay-credit-earn.entity";
import { BookingFailerMail } from "src/config/email_template/booking-failure-mail.html";
import { RewordStatus } from "src/enum/reword-status.enum";
import { LaytripPointsType } from "src/enum/laytrip-point-type.enum";
import { PaidFor } from "src/enum/paid-for.enum";
import { PredictiveBookingData } from "src/entity/predictive-booking-data.entity";
import { InstalmentStatus } from "src/enum/instalment-status.enum";
import { getBookingDailyPriceDto } from "./dto/get-daily-booking-price.dto";
import { Generic } from "src/utility/generic.utility";
import { PushNotification } from "src/utility/push-notification.utility";
import { UserDeviceDetail } from "src/entity/user-device-detail.entity";
import { DateTime } from "src/utility/datetime.utility";
import { ModulesName } from "src/enum/module.enum";
import { VacationRentalService } from "src/vacation-rental/vacation-rental.service";
import { Translation } from "src/utility/translation.utility";
import { WebNotification } from "src/utility/web-notification.utility";
import { MonakerStrategy } from "src/vacation-rental/strategy/strategy";
import { Monaker } from "src/vacation-rental/strategy/monaker";
import { IncompleteBookingMail } from "src/config/email_template/incomplete-booking-mail.html";
import { HotelService } from "src/hotel/hotel.service";
import { TwilioSMS } from "src/utility/sms.utility";
const AWS = require("aws-sdk");
var fs = require("fs");
const cronUserId = config.get("cronUserId");
import * as md5 from "md5";
import { CartBooking } from "src/entity/cart-booking.entity";
import { LaytripInstallmentRecevied } from "src/config/new_email_templete/laytrip_installment-recived.html";
import { v4 as uuidv4 } from "uuid";
import * as uniqid from "uniqid";
import { CartDataUtility } from "src/utility/cart-data.utility";
import { LaytripPaymentFailedTemplete } from "src/config/new_email_templete/installment-default.html";
import { LaytripCartBookingComplationMail } from "src/config/new_email_templete/cart-completion-mail.html";
import { LaytripMissedPaymentTemplete } from "src/config/new_email_templete/missed-installment.html";
import { LaytripPaymentReminderTemplete } from "src/config/new_email_templete/payment-reminder.html";
import { LaytripCancellationTravelProviderMail } from "src/config/new_email_templete/laytrip_cancellation-travel-provider-mail.html";
import { flightDataUtility } from "src/utility/flight-data.utility";
import { LaytripFlightReminderMail } from "src/config/new_email_templete/flight-reminder.html";
// const twilio = config.get("twilio");
// var client = require('twilio')(twilio.accountSid,twilio.authToken);

@Injectable()
export class CronJobsService {
    constructor(
        @InjectRepository(UserRepository)
        private userRepository: UserRepository,

        @InjectRepository(BookingRepository)
        private bookingRepository: BookingRepository,

        private flightService: FlightService,

        private hotelService: HotelService,

        private paymentService: PaymentService,

        private readonly mailerService: MailerService,

        private vacationRentalService: VacationRentalService // @InjectTwilio() private readonly client: TwilioClient, // private twilioSMS: TwilioSMS,
    ) {}

    async convertCustomer() {
        try {
            var toDate = new Date();

            var todayDate = toDate.toISOString();
            todayDate = todayDate
                .replace(/T/, " ") // replace T with a space
                .replace(/\..+/, "");

            const result = await this.userRepository.query(
                `SELECT "User"."user_id","User"."next_subscription_date","User"."email","User"."first_name","User"."last_name"  FROM "user" "User" WHERE "User"."role_id" = ${Role.PAID_USER} AND DATE("User"."next_subscription_date") < '${todayDate}'`
            );
            console.log(result);
            const updateQuery = await this.userRepository.query(
                `UPDATE "user" 
                SET "role_id"=6 , updated_date='${todayDate}',updated_by = ${cronUserId}  WHERE "role_id" = ${Role.PAID_USER} AND DATE("next_subscription_date") < '${todayDate}'`
            );
            for (let index = 0; index < result.length; index++) {
                const data = result[index];

                PushNotification.sendNotificationTouser(
                    data.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "user",
                        task: "user_convert",
                        userId: data.userId,
                    },
                    {
                        title: "We not capture subscription",
                        body: `Just a friendly reminder that we not able to capture your subscription so we have convert your account to free user please subscribe manully`,
                    },
                    cronUserId
                );
                WebNotification.sendNotificationTouser(
                    data.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "user",
                        task: "user_convert",
                        userId: data.userId,
                    },
                    {
                        title: "We not capture subscription",
                        body: `Just a friendly reminder that we not able to capture your subscription so we have convert your account to free user please subscribe manully`,
                    },
                    cronUserId
                );

                this.mailerService
                    .sendMail({
                        to: data.email,
                        from: mailConfig.from,
                        bcc: mailConfig.BCC,
                        subject: `Subscription Expired`,
                        html: ConvertCustomerMail({
                            username: data.first_name + " " + data.last_name,
                            date: data.next_subscription_date,
                        }),
                    })
                    .then((res) => {
                        console.log("res", res);
                    })
                    .catch((err) => {
                        console.log("err", err);
                    });
                // Activity.logActivity(
                // 	"1c17cd17-9432-40c8-a256-10db77b95bca",
                // 	"cron",
                // 	`${data.email} is Convert customer to free user because subscription plan is not done by customer`
                // );
            }

            console.log(updateQuery);
        } catch (error) {
            console.log(error);
        }
    }

    async checkPandingFlights() {
        Activity.cronActivity("check pending flights cron");
        let query = getManager()
            .createQueryBuilder(Booking, "booking")
            .select([
                "booking.supplierBookingId",
                "booking.id",
                "booking.laytripBookingId",
            ])
            .where(
                `"booking"."is_ticketd"= false and "booking"."fare_type" = 'GDS' and "booking"."is_predictive" = false`
            );

        const result = await query.getMany();

        var total = 0;
        var failedlogArray = "";
        for (let index = 0; index < result.length; index++) {
            try {
                const element = result[index];

                // console.log(element.supplierBookingId);

                var responce: any = await this.flightService.ticketFlight(
                    element.supplierBookingId
                );
            } catch (error) {
                console.log(error);
                const filename =
                    `update-pending-flight-cron-failed-` +
                    result[index].laytripBookingId +
                    "-" +
                    new Date().getTime() +
                    ".json";

                Activity.createlogFile(
                    filename,
                    JSON.stringify(result[index]) +
                        "-----------------------error-----------------------" +
                        JSON.stringify(error),
                    "flight"
                );
                failedlogArray += `<p>BookingId:- ${result[index].laytripBookingId}-----Log file----->/var/www/src/flight/${filename}</p> <br/>`;
            }
        }
        if (failedlogArray != "") {
            this.cronfailedmail(
                "cron fail for given booking id please check log files: <br/>" +
                    failedlogArray,
                "update pending flight cron error log"
            );

            throw new NotFoundException("update_booking_cron");
        }
        return {
            message: await Translation.Translater(
                "ES",
                "responce",
                "update_booking_cron"
            ),
        };
        // message: await Translation.Translater('ES', 'responce', 'update_booking_cron')
    }

    async partialPayment() {
        Activity.cronActivity("Partial payment cron");

        const date = new Date();
        var date1 = date.toISOString();
        date1 = date1
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        var after3Day = new Date();
        after3Day.setDate(after3Day.getDate() - 3);
        var date2 = after3Day.toISOString();
        date2 = date2
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        var after7Day = new Date();
        after7Day.setDate(after7Day.getDate() - 7);
        var date3 = after7Day.toISOString();
        date3 = date3
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        var after10Day = new Date();
        after10Day.setDate(after10Day.getDate() - 10);
        var date4 = after10Day.toISOString();
        date4 = date4
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        let cartBookings = await getConnection()
            .createQueryBuilder(CartBooking, "cartBooking")
            .leftJoinAndSelect("cartBooking.bookings", "booking")
            .leftJoinAndSelect(
                "booking.bookingInstalments",
                "BookingInstalments"
            )
            .leftJoinAndSelect("BookingInstalments.currency", "currency")
            .leftJoinAndSelect("cartBooking.user", "User")
            .where(
                `("BookingInstalments".instalment_date In ('${date2}','${date3}','${date4}')) AND ("BookingInstalments"."payment_status" = ${PaymentStatus.PENDING}) AND ("booking"."booking_type" = ${BookingType.INSTALMENT}) AND ("booking"."booking_status" In (${BookingStatus.CONFIRM},${BookingStatus.PENDING}))`
            )
            .getMany();
        if (!cartBookings.length) {
            throw new NotFoundException(`Partial Payment not available`);
        }

        var failedlogArray = "";
        for await (const cartBooking of cartBookings) {
            try {
                await this.getPaymentsOfBooking(cartBooking);
            } catch (error) {
                console.log("error", error);
                const filename =
                    `partial-payment-cron-error-log-` +
                    cartBooking.laytripCartId +
                    "-" +
                    new Date().getTime() +
                    ".json";

                Activity.createlogFile(
                    filename,
                    JSON.stringify(cartBooking.laytripCartId) +
                        "-----------------------error-----------------------" +
                        JSON.stringify(error),
                    "payment"
                );
                failedlogArray += `<p>instalmentId:- ${cartBooking.laytripCartId}-----Log file----->/var/www/src/payment/${filename}</p> <br/>`;
            }
        }
        if (failedlogArray != "") {
            this.cronfailedmail(
                "cron fail for given installment id please check log files: <br/><pre>" +
                    failedlogArray,
                "partial payment cron error log"
            );
            Activity.cronUpdateActivity("Partial payment cron", failedlogArray);
        }

        return {
            message: `${new Date()} date installation payment capture successfully`,
        };
    }

    async partialBookingPrice(Headers, options: getBookingDailyPriceDto) {
        Activity.cronActivity("Get daily price of booking cron");
        const { booking_id } = options;
        const date = new Date();
        var todayDate = date.toISOString();
        todayDate = todayDate
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "");
        let query = getManager()
            .createQueryBuilder(Booking, "booking")
            .leftJoinAndSelect("booking.currency2", "currency")
            .leftJoinAndSelect("booking.user", "User")
            .leftJoinAndSelect("booking.travelers", "traveler")
            // .select([
            // 	"booking.supplierBookingId",
            // 	"booking.id"
            // ])
            .where(
                `"booking"."booking_type"= ${BookingType.INSTALMENT} AND "booking"."booking_status"= ${BookingStatus.PENDING}`
            );
        if (booking_id) {
            query.andWhere(`"booking"."laytrip_booking_id" = '${booking_id}'`);
        }

        const result = await query.getMany();

        if (!result.length) {
            throw new NotFoundException(`No booking found`);
        }

        let message = "";
        // return result;
        var total = 0;
        var failedlogArray = "";
        for (let index = 0; index < result.length; index++) {
            try {
                switch (result[index].moduleId) {
                    case ModulesName.FLIGHT:
                        const flightPrice = await this.getDailyPriceOfFlight(
                            result[index],
                            Headers
                        );
                        if (flightPrice) {
                            const priceDiff = await this.campareBookingPrice(
                                flightPrice,
                                result[index].netRate
                            );
                            if (priceDiff != 0) {
                                message += `Product Id ${result[index].laytripBookingId} Net price diffrence is ${priceDiff} <br/>`;
                            }
                        }

                        break;
                    case ModulesName.VACATION_RENTEL:
                        await this.getDailyPriceOfVacationRental(
                            result[index],
                            Headers
                        );
                        break;
                    case ModulesName.HOTEL:
                        await this.hotelService.fetchPrice(result[index]);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.log(error);
                const filename =
                    `daily-booking-price-cron-failed-` +
                    result[index].laytripBookingId +
                    "-" +
                    new Date().getTime() +
                    ".json";
                Activity.createlogFile(
                    filename,
                    JSON.stringify(result[index]) +
                        "-----------------------error-----------------------" +
                        JSON.stringify(error),
                    "booking"
                );
                failedlogArray += `<p>BookingId:- ${result[index].laytripBookingId}-----Log file----->/var/www/src/booking/${filename}</p> <br/>`;
            }
        }

        if (failedlogArray != "") {
            this.cronfailedmail(
                "cron fail for given booking id please check log files: <br/><pre>" +
                    failedlogArray,
                "daily booking price cron error log"
            );
            Activity.cronUpdateActivity(
                "Get daily price of booking cron",
                failedlogArray
            );
        }

        if (message != "") {
            this.cronfailedmail(
                "Partial booking price : <br/><pre>" + message,
                "Partial booking price"
            );
        }

        return { message: `today booking price added for pending booking` };
    }
    async campareBookingPrice(newPrice, oldPrice) {
        let priceDiff =
            ((parseFloat(newPrice) - parseFloat(oldPrice)) * 100) /
            parseFloat(oldPrice);
        if (priceDiff > 5 || priceDiff < -5) {
            return priceDiff;
        }
        return 0;
    }
    async updateFlightBookingInProcess() {
        Activity.cronActivity("Update flight booking (In process status) cron");
        let query = getManager()
            .createQueryBuilder(Booking, "booking")
            .leftJoinAndSelect("booking.user", "User")
            .select([
                "booking.supplierBookingId",
                "booking.id",
                "User.email",
                "booking.userId",
                "booking.laytripBookingId",
            ])
            .where(
                `"booking"."supplier_status" = 0 and "booking"."supplier_booking_id" !=''`
            );

        const result = await query.getMany();

        for (let booking of result) {
            let tripDetails: any = await this.flightService.tripDetails(
                booking.supplierBookingId
            );
            if (tripDetails.booking_status == "Not Booked") {
                const voidCard = await this.paymentService.voidCard(
                    booking.cardToken,
                    booking.userId
                );

                if (voidCard.status == true) {
                    await getConnection()
                        .createQueryBuilder()
                        .update(Booking)
                        .set({
                            bookingStatus: BookingStatus.FAILED,
                            paymentStatus: PaymentStatus.REFUNDED,
                            paymentInfo: voidCard.meta_data,
                        })
                        .where("supplier_booking_id = :id", {
                            id: booking.supplierBookingId,
                        })
                        .execute();

                    this.sendFlightFailerMail(
                        booking.user.email,
                        booking.laytripBookingId,
                        booking?.user?.firstName || ""
                    );

                    PushNotification.sendNotificationTouser(
                        booking.user.userId,
                        {
                            module_name: "booking",
                            task: "booking_failed",
                            bookingId: booking.laytripBookingId,
                        },
                        {
                            title: "Booking failed",
                            body: `we couldn’t process your booking request.`,
                        },
                        cronUserId
                    );
                    WebNotification.sendNotificationTouser(
                        booking.user.userId,
                        {
                            module_name: "booking",
                            task: "booking_failed",
                            bookingId: booking.laytripBookingId,
                        },
                        {
                            title: "Booking failed",
                            body: `we couldn’t process your booking request.`,
                        },
                        cronUserId
                    );
                }

                // void card & update booking status in DB & send email to customer
            }

            if (tripDetails.booking_status == "") {
                if (tripDetails.ticket_status == "Ticketed") {
                    await getConnection()
                        .createQueryBuilder()
                        .update(Booking)
                        .set({ isTicketd: true, supplierStatus: 1 })
                        .where("supplier_booking_id = :id", {
                            id: booking.supplierBookingId,
                        })
                        .execute();
                }
            }

            if (tripDetails.booking_status == "Booked") {
                let ticketDetails: any = await this.flightService.ticketFlight(
                    booking.supplierBookingId
                );
                //return ticketDetails;
                let newTripDetails: any = await this.flightService.tripDetails(
                    booking.supplierBookingId
                );
                if (newTripDetails.ticket_status == "Ticketed") {
                    await getConnection()
                        .createQueryBuilder()
                        .update(Booking)
                        .set({ isTicketd: true, supplierStatus: 1 })
                        .where("supplier_booking_id = :id", {
                            id: booking.supplierBookingId,
                        })
                        .execute();
                }

                PushNotification.sendNotificationTouser(
                    booking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "booking",
                        task: "booking_done",
                        bookingId: booking.laytripBookingId,
                    },
                    {
                        title: "Booking ",
                        body: `We’re as excited for your trip as you are! please check all the details`,
                    },
                    cronUserId
                );

                WebNotification.sendNotificationTouser(
                    booking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "booking",
                        task: "booking_done",
                        bookingId: booking.laytripBookingId,
                    },
                    {
                        title: "Booking ",
                        body: `We’re as excited for your trip as you are! please check all the details`,
                    },
                    cronUserId
                );

                //if TicketStatus = TktInProgress call it again
            }
        }
        return {
            message: await Translation.Translater(
                "ES",
                "responce",
                "update_booking_cron"
            ),
        };
    }

    async getDataTimefromString(dateTime) {
        var date = dateTime.split("/");
        console.log(date);

        return `${date[2]}-${date[1]}-${date[0]}`;
    }

    async sendFlightFailerMail(email, bookingId, userName) {
        this.mailerService
            .sendMail({
                to: email,
                from: mailConfig.from,
                bcc: mailConfig.BCC,
                subject: `Booking ID ${bookingId} Provider Cancellation Notice`,
                html: LaytripCancellationTravelProviderMail({
                    userName,
                    bookingId,
                }),
            })
            .then((res) => {
                console.log("res", res);
            })
            .catch((err) => {
                console.log("err", err);
            });
    }

    async sendFlightIncompleteMail(email, bookingId, error = null, amount) {
        this.mailerService
            .sendMail({
                to: email,
                from: mailConfig.from,
                bcc: mailConfig.BCC,
                subject: "Booking Failed Mail",
                html: IncompleteBookingMail(
                    {
                        error: error,
                        amount: amount,
                    },
                    bookingId
                ),
            })
            .then((res) => {
                console.log("res", res);
            })
            .catch((err) => {
                console.log("err", err);
            });
    }

    async addRecurringLaytripPoint() {
        Activity.cronActivity("Add recurring laytrip poin cron");
        try {
            var toDate = new Date();

            var todayDate = toDate.toISOString();
            todayDate = todayDate
                .replace(/T/, " ") // replace T with a space
                .replace(/\..+/, "");

            const result = await getManager()
                .createQueryBuilder(LayCreditEarn, "layCreditEarn")
                .where(
                    `DATE("layCreditEarn"."earn_date") <= '${todayDate}' AND "layCreditEarn"."status" = ${RewordStatus.PENDING} AND "layCreditEarn"."type" = ${LaytripPointsType.RECURRING}`
                )
                .getMany();
            console.log(result);

            if (result.length) {
                for (let index = 0; index < result.length; index++) {
                    const data = result[index];
                    console.log(data);

                    const createTransaction = {
                        bookingId: null,
                        userId: data.userId,
                        card_token: data.cardToken,
                        currencyId: 1,
                        amount: data.points,
                        paidFor: PaidFor.RewordPoint,
                        note: "",
                        travelerInfoId: null,
                        productId: null,
                    };
                    const payment = await this.paymentService.createTransaction(
                        createTransaction,
                        cronUserId
                    );

                    if (payment.paymentStatus == PaymentStatus.CONFIRM) {
                        await getConnection()
                            .createQueryBuilder()
                            .update(LayCreditEarn)
                            .set({
                                transactionId: payment.id,
                                status: RewordStatus.AVAILABLE,
                            })
                            .where("id = :id", { id: data.id })
                            .execute();
                        // 		this.mailerService
                        // 	.sendMail({
                        // 		to: data.user.email,
                        // 		from: mailConfig.from,
                        // 		cc: mailConfig.BCC,
                        // 		subject: `Subscription Expired`,
                        // 		html: ConvertCustomerMail({
                        // 			username: data.first_name + " " + data.last_name,
                        // 			date: data.next_subscription_date,
                        // 		}),
                        // 	})
                        // 	.then((res) => {
                        // 		console.log("res", res);
                        // 	})
                        // 	.catch((err) => {
                        // 		console.log("err", err);
                        // 	});
                        // Activity.logActivity(
                        // 	"	",
                        // 	"cron",
                        // 	`${data.id} recurring laytrip poin added by cron`
                        // );
                    } else {
                        // failed transaction mail
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
        return { message: `today recurring point added succesfully` };
    }

    async uploadLogIntoS3Bucket(folderName) {
        Activity.cronActivity("Upload log file on s3 bucket cron ");
        const path = require("path");
        const fs = require("fs");
        //joining path of directory
        const directoryPath = path.join("/var/www/html/logs/" + folderName);
        //passsing directoryPath and callback function
        fs.readdir(directoryPath, function(err, files) {
            //handling error
            if (err) {
                return console.log("Unable to scan directory: " + err);
            }
            //listing all files using forEach
            files.forEach(function(file) {
                // Do whatever you want to do with the file
                console.log(file);

                const AWSconfig = config.get("AWS");

                const s3 = new AWS.S3({
                    accessKeyId:
                        process.env.AWS_ACCESS_KEY || AWSconfig.accessKeyId,
                    secretAccessKey:
                        process.env.AWS_SECRET_ACCESS_KEY ||
                        AWSconfig.secretAccessKey,
                });

                const fileName =
                    "/var/www/html/logs/" + folderName + "/" + file;

                const uploadFile = () => {
                    fs.readFile(fileName, (err, data) => {
                        if (err) throw err;
                        const params = {
                            Bucket: "laytrip/logs/" + folderName, // pass your bucket name
                            Key: file, // file will be saved as testBucket/contacts.csv
                            Body: data,
                        };
                        s3.upload(params, function(s3Err, data) {
                            if (s3Err) {
                                throw s3Err;
                            } else {
                                fs.unlinkSync(fileName);
                                console.log(
                                    `File uploaded successfully at ${data.Location}`
                                );
                            }
                        });
                    });
                };

                uploadFile();
            });
        });

        return {
            message: `${folderName} log uploaded on s3 bucket`,
        };
    }

    async paymentReminder() {
        Activity.cronActivity("Payment reminder cron");
        const date = new Date();
        var currentDate = date.toISOString();
        currentDate = currentDate
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "");
        var fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 1);
        var toDate = fromDate.toISOString();
        toDate = toDate
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "");
        toDate = toDate.split(" ")[0];
        console.log(toDate);

        let cartBookings = await getConnection()
            .createQueryBuilder(CartBooking, "cartBooking")
            .leftJoinAndSelect("cartBooking.bookings", "booking")
            .leftJoinAndSelect(
                "booking.bookingInstalments",
                "BookingInstalments"
            )
            .leftJoinAndSelect("BookingInstalments.currency", "currency")
            .leftJoinAndSelect("cartBooking.user", "User")
            .where(
                `(DATE("BookingInstalments".instalment_date) = DATE('${toDate}') ) AND ("BookingInstalments"."payment_status" = ${PaymentStatus.PENDING}) AND ("booking"."booking_type" = ${BookingType.INSTALMENT}) AND ("booking"."booking_status" In (${BookingStatus.CONFIRM},${BookingStatus.PENDING}))`
            )
            .getMany();

        for await (const cartBooking of cartBookings) {
            let amount: number = 0;
            let totalAmount = 0;
            const instalment = cartBooking.bookings[0].bookingInstalments[0];
            for await (const booking of cartBooking.bookings) {
                for await (const instalment of booking.bookingInstalments) {
                    totalAmount += parseFloat(instalment.amount);
                }
            }
            const param = {
                userName: cartBooking.user.firstName,
                amount:
                    instalment.currency.symbol +
                    `${Generic.formatPriceDecimal(totalAmount)}`,
                date: DateTime.convertDateFormat(
                    new Date(instalment.instalmentDate),
                    "YYYY-MM-DD",
                    "MMM DD,YYYY"
                ),
                bookingId: cartBooking.laytripCartId,
                phoneNo:
                    `+${cartBooking.user.countryCode}` +
                    cartBooking.user.phoneNo,
            };

            if (cartBooking.user.isSMS) {
                let dateWithMonthName = DateTime.getDateWithMonthName(
                    param.date
                );
                TwilioSMS.sendSMS({
                    toSMS: param.phoneNo,
                    message: `Just a friendly reminder that your installment amount of ${param.amount} will be collected on ${dateWithMonthName} for booking number ${param.bookingId}. Please ensure you have sufficient funds on your account and all the banking information is up-to-date.`,
                });
            }
            if (cartBooking.user.isEmail) {
                this.mailerService
                    .sendMail({
                        to: cartBooking.user.email,
                        from: mailConfig.from,
                        bcc: mailConfig.BCC,
                        subject: `Booking ID ${param.bookingId} Upcoming Payment Reminder`,
                        html: LaytripPaymentReminderTemplete(param),
                    })
                    .then((res) => {
                        console.log("res", res);
                    })
                    .catch((err) => {
                        console.log("err", err);
                    });
            }

            PushNotification.sendNotificationTouser(
                cartBooking.user.userId,
                {
                    //you can send only notification or only data(or include both)
                    module_name: "payment",
                    task: "payment_reminder",
                    bookingId: cartBooking.laytripCartId,
                    instalmentId: instalment.id,
                },
                {
                    title: "Payment Reminder",
                    body: `Just a friendly reminder that your instalment amount of ${param.amount} will be collected on ${param.date} Please ensure you have sufficient funds on your account and all the banking information is up-to-date.`,
                },
                cronUserId
            );
            WebNotification.sendNotificationTouser(
                cartBooking.user.userId,
                {
                    //you can send only notification or only data(or include both)
                    module_name: "payment",
                    task: "payment_reminder",
                    bookingId: cartBooking.laytripCartId,
                    instalmentId: instalment.id,
                },
                {
                    title: "Payment Reminder",
                    body: `Just a friendly reminder that your instalment amount of ${param.amount} will be collected on ${param.date} Please ensure you have sufficient funds on your account and all the banking information is up-to-date.`,
                },
                cronUserId
            );
        }

        return { message: `Payment reminder send successfully` };
    }

    async checkAllinstallmentPaid(bookingId) {
        let query = await getManager()
            .createQueryBuilder(BookingInstalments, "BookingInstalments")
            .where(
                `booking_id = '${bookingId}' AND payment_status != ${PaymentStatus.CONFIRM}`
            )
            .getCount();
        if (query <= 0) {
            await getConnection()
                .createQueryBuilder()
                .update(Booking)
                .set({
                    paymentStatus: PaymentStatus.CONFIRM,
                    nextInstalmentDate: null,
                })
                .where("id = :id", { id: bookingId })
                .execute();
        }
    }

    async cronfailedmail(data, subject) {
        this.mailerService
            .sendMail({
                to: mailConfig.BCC,
                from: mailConfig.from,
                //cc: mailConfig.BCC,
                subject: subject,
                html: data,
            })
            .then((res) => {
                console.log("res", res);
            })
            .catch((err) => {
                console.log("err", err);
            });
    }

    async totalPaidAmount(bookingId: string) {
        var paidAmount = await getConnection().query(`
                SELECT  SUM( amount) as total_amount from booking_instalments where payment_status = ${PaymentStatus.CONFIRM} AND booking_id = '${bookingId}'  
			`);
        return paidAmount[0].total_amount;
    }

    async backupDatabase() {
        Activity.cronActivity("backup database cron");
        const AWSconfig = config.get("AWS");
        const dbConfig = config.get("db");

        const { execute } = require("@getvim/execute");

        var dbName = process.env.RDS_Database || dbConfig.database;

        var host = process.env.RDS_Host || dbConfig.host;
        var port = process.env.RDS_Port || dbConfig.port;
        var username = process.env.RDS_Username || dbConfig.username;
        var password = process.env.RDS_Password || dbConfig.password;

        var S3_BUCKET = "laytrip/logs/database";
        var s3AccessKeyId = process.env.AWS_ACCESS_KEY || AWSconfig.accessKeyId;
        var s3SecretAccessKey =
            process.env.AWS_SECRET_ACCESS_KEY || AWSconfig.secretAccessKey;

        process.env.AWS_ACCESS_KEY_ID = s3AccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = s3SecretAccessKey;

        // Determine our filename
        //   20170312.011924.307000000.sql.gz
        var timestamp = new Date()
            .toISOString()
            .replace(
                /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$/,
                "$1$2$3.$4$5$6.$7000000"
            );
        const fileName = "laytrip" + timestamp + ".sql";
        var filepath = "/var/www/html/logs/database/" + fileName;

        if (!fs.existsSync("/var/www/html/logs/database/")) {
            fs.mkdirSync("/var/www/html/logs/database/");
        }
        var s3 = new AWS.S3();

        // Dump our database to a file so we can collect its length
        // DEV: We output `stderr` to `process.stderr`
        // DEV: We write to disk so S3 client can calculate `Content-Length` of final result before uploading
        console.log("Dumping `pg_dump` into `gzip`");

        //await execute(`PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -f ${filepath} -F t`,).then(async () => {
        console.log("Finito");
        console.log('Uploading "' + filepath + '" to S3');
        // s3.putObject({
        // 	Bucket: S3_BUCKET,
        // 	Key: fileName,
        // 	// ACL: 'public',
        // 	// ContentType: 'text/plain',
        // 	Body: fs.createReadStream(filepath)
        // }, function handlePutObject(err, data) {
        // 	// If there was an error, throw it
        // 	if (err) {
        // 		throw err;
        // 		return err
        // 	} else {}
        // });

        console.log("started....");
        // Simple-git without promise
        const simpleGit = require("simple-git")();
        // Shelljs package for running shell tasks optional
        const shellJs = require("shelljs");
        // Simple Git with Promise for handling success and failure
        const simpleGitPromise = require("simple-git/promise")();

        shellJs.cd("/var/www/html/logs/database/");
        // Repo name
        const repo = "laytrip-database-backup"; //Repo name
        // User name and password of your GitHub
        const userName = "suresh555";
        const password1 = "Oneclick1@";
        // Set up GitHub url like this so no manual entry of user pass needed
        const gitHubUrl = `https://${userName}:${password1}@github.com/${userName}/${repo}`;
        // add local git config like username and email

        simpleGit.addConfig("user.email", "suresh@itoneclick.com");
        console.log("step1");

        simpleGit.addConfig("user.name", "Suresh Suthar");
        console.log("step2");

        // Add remore repo url as origin to repo
        simpleGitPromise.addRemote("origin", gitHubUrl);
        console.log("step3");

        // Add all files for commit
        simpleGitPromise.add(".").then(
            (addSuccess) => {
                console.log(addSuccess);
            },
            (failedAdd) => {
                console.log("adding files failed");
            }
        );
        console.log("step4");

        // Commit files as Initial Commit
        simpleGitPromise.commit("Intial commit by simplegit").then(
            (successCommit) => {
                console.log(successCommit);
            },
            (failed) => {
                console.log("failed commmit");
            }
        );
        console.log("step5");
        // Finally push to online repository
        simpleGitPromise.push("origin", "master").then(
            (success) => {
                console.log("repo successfully pushed");
            },
            (failed) => {
                console.log("repo push failed");
            }
        );
        console.log("step5");
        console.log('Successfully uploaded "' + filepath + '"');
        return { message: 'Successfully uploaded "' + filepath + '"' };
        //})
        // .catch(err => {
        // 	console.log(err);
        // 	return err
        // }
        //)

        // Upload our gzip stream into S3
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property

        return { message: `database backup uploadsuccefully ` };
    }

    async getDailyPriceOfFlight(bookingData: Booking, Headers) {
        let flights: any = null;
        if (
            new Date(
                await this.getDataTimefromString(
                    bookingData.moduleInfo[0].departure_date
                )
            ) > new Date()
        ) {
            var bookingType = bookingData.locationInfo["journey_type"];

            // let travelers = [];

            // for await (const traveler of bookingData.travelers) {
            // 	travelers.push({
            // 		traveler_id: traveler.userId
            // 	})
            // }

            if (bookingType == "oneway") {
                Headers["currency"] = bookingData.currency2.code;
                Headers["language"] = "en";

                let dto = {
                    source_location: bookingData.moduleInfo[0].departure_code,
                    destination_location:
                        bookingData.moduleInfo[0].arrival_code,
                    departure_date: await this.getDataTimefromString(
                        bookingData.moduleInfo[0].departure_date
                    ),
                    flight_class:
                        bookingData.moduleInfo[0].routes[0].stops[0]
                            .cabin_class,
                    adult_count: bookingData.moduleInfo[0].adult_count
                        ? bookingData.moduleInfo[0].adult_count
                        : 0,
                    child_count: bookingData.moduleInfo[0].child_count
                        ? bookingData.moduleInfo[0].child_count
                        : 0,
                    infant_count: bookingData.moduleInfo[0].infant_count
                        ? bookingData.moduleInfo[0].infant_count
                        : 0,
                };

                //console.log(dto);

                flights = await this.flightService.searchOneWayZipFlight(
                    dto,
                    Headers,
                    bookingData.user
                );
            } else {
                Headers["currency"] = bookingData.currency2.code;
                Headers["language"] = "en";

                let dto = {
                    source_location: bookingData.moduleInfo[0].departure_code,
                    destination_location:
                        bookingData.moduleInfo[0].arrival_code,
                    departure_date: await this.getDataTimefromString(
                        bookingData.moduleInfo[0].departure_date
                    ),
                    flight_class:
                        bookingData.moduleInfo[0].routes[0].stops[0]
                            .cabin_class,
                    adult_count: bookingData.moduleInfo[0].adult_count
                        ? bookingData.moduleInfo[0].adult_count
                        : 0,
                    child_count: bookingData.moduleInfo[0].child_count
                        ? bookingData.moduleInfo[0].child_count
                        : 0,
                    infant_count: bookingData.moduleInfo[0].infant_count
                        ? bookingData.moduleInfo[0].infant_count
                        : 0,
                    arrival_date: await this.getDataTimefromString(
                        bookingData.moduleInfo[0].arrival_date
                    ),
                };
                //console.log(dto);

                flights = await this.flightService.searchRoundTripZipFlight(
                    dto,
                    Headers,
                    bookingData.user
                );
                //return flights
            }
            if (flights.items && flights.items.length) {
                for await (const flight of flights.items) {
                    if (
                        flight.unique_code ==
                        bookingData.moduleInfo[0].unique_code
                    ) {
                        //const markups = await this.flightService.applyPreductionMarkup(bookingData.totalAmount)

                        const date = new Date();
                        var todayDate = date.toISOString();
                        todayDate = todayDate
                            .replace(/T/, " ") // replace T with a space
                            .replace(/\..+/, "");
                        let query = await getManager()
                            .createQueryBuilder(
                                PredictiveBookingData,
                                "predictiveBookingData"
                            )
                            .leftJoinAndSelect(
                                "predictiveBookingData.booking",
                                "booking"
                            )
                            .where(
                                `"predictiveBookingData"."created_date" = '${
                                    todayDate.split(" ")[0]
                                }' AND "predictiveBookingData"."booking_id" = '${
                                    bookingData.id
                                }'`
                            )
                            .getOne();
                        if (query) {
                            query.bookingId = bookingData.id;
                            query.netPrice = flight.net_rate;
                            query.date = new Date();
                            query.isBelowMinimum =
                                flight.routes[0].stops[0].below_minimum_seat;
                            query.remainSeat =
                                flight.routes[0].stops[0].remaining_seat;
                            query.price = flight.selling_price;
                            await query.save();
                        } else {
                            const predictiveBookingData = new PredictiveBookingData();
                            predictiveBookingData.bookingId = bookingData.id;
                            predictiveBookingData.netPrice = flight.net_rate;
                            predictiveBookingData.date = new Date();
                            predictiveBookingData.isBelowMinimum =
                                flight.routes[0].stops[0].below_minimum_seat;
                            predictiveBookingData.remainSeat =
                                flight.routes[0].stops[0].remaining_seat;
                            predictiveBookingData.price = flight.selling_price;
                            console.log(flight);
                            //predictiveBookingData.bookIt = false;
                            await predictiveBookingData.save();
                        }
                        return flight.net_rate;
                    }
                }
            }
        }
    }

    async getDailyPriceOfVacationRental(bookingData: Booking, Headers) {
        let vacationData;
        if (
            new Date(
                await this.getDataTimefromString(bookingData.checkInDate)
            ) > new Date()
        ) {
            Headers["currency"] = bookingData.currency2.code;
            Headers["language"] = "en";

            let dto = {
                property_id: bookingData.moduleInfo[0]["property_id"],
                room_id: bookingData.moduleInfo[0]["room_id"],
                rate_plan_code: bookingData.moduleInfo[0]["rate_plan_code"],
                check_in_date: bookingData.checkInDate,
                check_out_date: bookingData.checkOutDate,
                adult_count: bookingData.moduleInfo[0]["adult"],
                number_and_children_ages:
                    bookingData.moduleInfo[0]["number_and_chidren_age"],
                original_price: bookingData.moduleInfo[0]["net_price"],
            };

            const monaker = new MonakerStrategy(new Monaker(Headers));
            vacationData = await new Promise((resolve) =>
                resolve(
                    monaker.verifyUnitTypeAvailability(
                        dto,
                        bookingData.user,
                        false
                    )
                )
            );
            // console.log("-------------",vacationData);
            // vacationData = await this.vacationRentalService.verifyUnitAvailability(dto, Headers, bookingData.user);

            const date = new Date();
            var todayDate = date.toISOString();
            todayDate = todayDate
                .replace(/T/, " ") // replace T with a space
                .replace(/\..+/, "");
            if (vacationData["available_status"] == true) {
                let query = await getManager()
                    .createQueryBuilder(
                        PredictiveBookingData,
                        "predictiveBookingData"
                    )
                    .leftJoinAndSelect(
                        "predictiveBookingData.booking",
                        "booking"
                    )
                    .where(
                        `"predictiveBookingData"."created_date" = '${
                            todayDate.split(" ")[0]
                        }' AND "predictiveBookingData"."booking_id" = '${
                            bookingData.id
                        }'`
                    )
                    .getOne();

                if (query) {
                    query.bookingId = bookingData.id;
                    query.netPrice = vacationData.net_price;
                    query.date = new Date();
                    query.isBelowMinimum = false;
                    query.remainSeat = 0;
                    query.price = vacationData.selling_price;
                    await query.save();
                } else {
                    const predictiveBookingData = new PredictiveBookingData();
                    predictiveBookingData.bookingId = bookingData.id;
                    predictiveBookingData.netPrice = vacationData.net_price;
                    predictiveBookingData.date = new Date();
                    predictiveBookingData.isBelowMinimum = false;
                    predictiveBookingData.remainSeat = 0;
                    predictiveBookingData.price = vacationData.selling_price;
                    // console.log(flight);
                    //predictiveBookingData.bookIt = false;
                    await predictiveBookingData.save();
                }
            }
        }
    }

    async pandingInstalment(bookingId) {
        let query = await getManager()
            .createQueryBuilder(BookingInstalments, "instalment")
            .where(
                `"instalment"."booking_id" = '${bookingId}' AND "instalment"."payment_status" = '${PaymentStatus.PENDING}'`
            )
            .getCount();
        return query;
    }

    async updateModuleInfo(Headers) {
        Headers["language"] = "en";
        Headers["currency"] = "USD";
        let query = getConnection()
            .createQueryBuilder(Booking, "booking")
            .where(
                `"booking"."module_id"= 1 AND "booking"."booking_status"= 4`
            );

        const result = await query.getMany();

        if (!result.length) {
            throw new NotFoundException(`No booking found`);
        }
        // return result;
        var total = 0;
        for await (const bookingData of result) {
            let unicode = "";
            let flightClass = "";
            //console.log(modulInfo.routes[0]['stops']);

            for (let module of bookingData.moduleInfo[0].routes[0]["stops"]) {
                //console.log(module);

                flightClass = module.cabin_class;
                unicode += module.flight_number + module.airline + flightClass;
            }

            if (typeof bookingData.moduleInfo[0].routes[1] != "undefined") {
                for (let module of bookingData.moduleInfo[0].routes[1][
                    "stops"
                ]) {
                    unicode +=
                        module.flight_number + module.airline + flightClass;
                }
            }

            let flightCode = md5(unicode);
            let moduleInfo = bookingData.moduleInfo;
            moduleInfo[0]["unique_code"] = flightCode;
            //bookingData.moduleInfo = moduleInfo;

            await getConnection()
                .createQueryBuilder()
                .update(Booking)
                .set({ moduleInfo: moduleInfo })
                .where("id = :id", { id: bookingData.id })
                .execute();
            // console.log(unicode);
            // console.log(flightCode);
            // console.log(bookingData.moduleInfo[0].unique_code);
        }
        return { message: `today booking price added for pending booking` };
    }

    async ChangesFromTravelProvider() {
        var after7Day = new Date();
        after7Day.setDate(after7Day.getDate() + 7);
        var date1 = after7Day.toISOString();
        date1 = date1
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        var after14Day = new Date();
        after14Day.setDate(after14Day.getDate() + 14);
        var date2 = after14Day.toISOString();
        date2 = date2
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        let bookings = await getConnection()
            .createQueryBuilder(Booking, "Booking")
            .where(
                `"Booking"."check_in_date" IN ('${date1}','${date2}') AND "booking_status" = ${BookingStatus.CONFIRM}`
            )
            .getMany();

        if (!bookings.length) {
            return {
                message: `Upcommig booking not found`,
            };
        }
        for await (const booking of bookings) {
            await this.flightService.bookingUpdateFromSupplierside(
                booking.laytripBookingId,
                { supplier_booking_id: booking.supplierBookingId },
                booking.checkInDate == date1 ? 2 : 3
            );
        }
        return {
            message: `Emails send succeesfully`,
        };
    }

    async upcommingBookingDetail() {
        var after7Day = new Date();
        after7Day.setDate(after7Day.getDate() + 7);
        var date1 = after7Day.toISOString();
        date1 = date1
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        var after5Day = new Date();
        after5Day.setDate(after5Day.getDate() + 5);
        var date2 = after5Day.toISOString();
        date2 = date2
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        let bookings = await getConnection()
            .createQueryBuilder(Booking, "Booking")
            .where(
                `"Booking"."check_in_date" IN ('${date1}','${date2}') AND "booking_status" = ${BookingStatus.CONFIRM} AND "Booking"."module_id" IN (${ModulesName.FLIGHT})`
            )
            .getMany();
        console.log(bookings);

        if (!bookings.length) {
            return {
                message: `Upcommig booking not found`,
            };
        }
        for await (const booking of bookings) {
            let mail = await flightDataUtility.flightData(
                booking.laytripBookingId
            );
            await this.mailerService
                .sendMail({
                    to: mail.userMail,
                    from: mailConfig.from,
                    bcc: mailConfig.BCC,
                    subject: `Booking ID ${mail.param.cart.cartId} Reminder For Your Upcoming Trip`,
                    html: await LaytripFlightReminderMail(mail.param),
                })
                .then((res) => {
                    console.log("res", res);
                })
                .catch((err) => {
                    console.log("err", err);
                });
        }
        return {
            message: `Emails send succeesfully`,
        };
    }

    async getPaymentsOfBooking(cartBooking: CartBooking) {
        let amount: number = 0;

        for await (const booking of cartBooking.bookings) {
            for await (const instalment of booking.bookingInstalments) {
                amount += Generic.formatPriceDecimal(
                    parseFloat(instalment.amount)
                );
            }
        }

        let currencyCode =
            cartBooking.bookings[0].bookingInstalments[0].currency.code;
        let cardToken = cartBooking.bookings[0].cardToken;
        const cartAmount = amount;
        amount = amount * 100;
        amount = Math.ceil(amount);

        console.log("1");

        if (cardToken) {
            let transaction = await this.paymentService.getPayment(
                cardToken,
                amount,
                currencyCode,
                cartBooking.userId,
                true
            );
            console.log("transaction done");
            for await (const booking of cartBooking.bookings) {
                for await (const instalment of booking.bookingInstalments) {
                    instalment.paymentStatus =
                        transaction.status == true
                            ? PaymentStatus.CONFIRM
                            : PaymentStatus.PENDING;
                    instalment.paymentInfo = transaction.meta_data;
                    instalment.transactionToken = transaction.token;
                    //instalment.paymentCaptureDate = new Date();
                    instalment.attempt = instalment.attempt
                        ? instalment.attempt + 1
                        : 1;
                    instalment.instalmentStatus =
                        transaction.status == true
                            ? PaymentStatus.CONFIRM
                            : PaymentStatus.PENDING;
                    instalment.paymentCaptureDate =
                        transaction.status == true ? new Date() : null;
                    instalment.comment = `try to get Payment by cron on ${new Date()}`;
                    await instalment.save();
                }
            }
            console.log("2");
            let nextDate;
            let nextAmount: number = 0;
            if (transaction.status == false) {
                console.log("transaction false");
                let faildTransaction = new FailedPaymentAttempt();
                faildTransaction.instalmentId =
                    cartBooking.bookings[0].bookingInstalments[0].id;
                faildTransaction.paymentInfo = transaction.meta_data;
                faildTransaction.date = new Date();

                await faildTransaction.save();

                const instalment =
                    cartBooking.bookings[0].bookingInstalments[0];
                let nextInstalmentDate: string = "";
                switch (instalment.attempt) {
                    case 2:
                        var nDate = new Date(
                            cartBooking.bookings[0].bookingInstalments[0].instalmentDate
                        );
                        nDate.setDate(nDate.getDate() + 3);
                        nextInstalmentDate = nDate.toISOString();
                        nextInstalmentDate = nextInstalmentDate
                            .replace(/T/, " ") // replace T with a space
                            .replace(/\..+/, "")
                            .split(" ")[0];
                        break;
                    case 3:
                        var nDate = new Date(
                            cartBooking.bookings[0].bookingInstalments[0].instalmentDate
                        );
                        nDate.setDate(nDate.getDate() + 7);
                        nextInstalmentDate = nDate.toISOString();
                        nextInstalmentDate = nextInstalmentDate
                            .replace(/T/, " ") // replace T with a space
                            .replace(/\..+/, "")
                            .split(" ")[0];
                        break;
                    case 4:
                        var nDate = new Date(
                            cartBooking.bookings[0].bookingInstalments[0].instalmentDate
                        );
                        nDate.setDate(nDate.getDate() + 10);
                        nextInstalmentDate = nDate.toISOString();
                        nextInstalmentDate = nextInstalmentDate
                            .replace(/T/, " ") // replace T with a space
                            .replace(/\..+/, "")
                            .split(" ")[0];
                        break;

                    default:
                        break;
                }
                let param: any = {
                    userName: cartBooking.user.firstName,
                    amount:
                        cartBooking.bookings[0].bookingInstalments[0].currency
                            .symbol +
                        `${Generic.formatPriceDecimal(cartAmount)}`,
                    date: DateTime.convertDateFormat(
                        cartBooking.bookings[0].bookingInstalments[0]
                            .instalmentDate,
                        "YYYY-MM-DD",
                        "MMM DD, YYYY"
                    ),
                    bookingId: cartBooking.laytripCartId,
                    try: instalment.attempt,
                };
                if (nextInstalmentDate) {
                    param.nextDate = DateTime.convertDateFormat(
                        nextInstalmentDate,
                        "YYYY-MM-DD",
                        "MMM DD, YYYY"
                    );
                }

                if (instalment.attempt >= 5) {
                    console.log("transaction failed");
                    await getConnection()
                        .createQueryBuilder()
                        .update(Booking)
                        .set({
                            bookingStatus: BookingStatus.NOTCOMPLETED,
                            paymentStatus: PaymentStatus.FAILED,
                        })
                        .where("id = :id", { id: instalment.bookingId })
                        .execute();
                    instalment.paymentStatus = PaymentStatus.FAILED;
                    await instalment.save();
                    // if (cartBooking.user.isEmail) {
                    // 	console.log('transaction incomplete mail')
                    // 	await this.sendFlightIncompleteMail(cartBooking.user.email, cartBooking.laytripCartId, 'we not able to get payment from your card', `${param.amount}`)
                    // }

                    if (cartBooking.user.isSMS) {
                        TwilioSMS.sendSMS({
                            toSMS: cartBooking.user.phoneNo,
                            message: `we have unfortunately had to cancel your booking because your 3 attemp finished and we will not be able to issue any refund.`,
                        });
                    }

                    PushNotification.sendNotificationTouser(
                        cartBooking.user.userId,
                        {
                            //you can send only notification or only data(or include both)
                            module_name: "booking",
                            task: "booking_cancelled",
                            bookingId: cartBooking.laytripCartId,
                        },
                        {
                            title: "booking Cancelled",
                            body: `we have unfortunately had to cancel your booking and we will not be able to issue any refund.`,
                        },
                        cronUserId
                    );
                    WebNotification.sendNotificationTouser(
                        cartBooking.user.userId,
                        {
                            //you can send only notification or only data(or include both)
                            module_name: "booking",
                            task: "booking_cancelled",
                            bookingId: cartBooking.laytripCartId,
                        },
                        {
                            title: "booking Cancelled",
                            body: `we have unfortunately had to cancel your booking and we will not be able to issue any refund.`,
                        },
                        cronUserId
                    );
                }

                if (cartBooking.user.isEmail) {
                    console.log("transaction payment failed ");
                    if (param.try >= 5) {
                        this.mailerService
                            .sendMail({
                                to: cartBooking.user.email,
                                from: mailConfig.from,
                                bcc: mailConfig.BCC,
                                subject: `Booking ID ${param.bookingId} Notice Of Default And Cancellation`,
                                html: await LaytripPaymentFailedTemplete(param),
                            })
                            .then((res) => {
                                console.log("res", res);
                            })
                            .catch((err) => {
                                console.log("err", err);
                            });
                    } else if (param.try >= 2) {
                        this.mailerService
                            .sendMail({
                                to: cartBooking.user.email,
                                from: mailConfig.from,
                                bcc: mailConfig.BCC,
                                subject: `Booking ID ${param.bookingId} ${
                                    param.try == 4 ? "Final" : ""
                                }Missed Payment Reminder #${param.try - 1}`,
                                html: await LaytripMissedPaymentTemplete(param),
                            })
                            .then((res) => {
                                console.log("res", res);
                            })
                            .catch((err) => {
                                console.log("err", err);
                            });
                    }
                }

                // if (cartBooking.user.isSMS) {
                // 	TwilioSMS.sendSMS({
                // 		toSMS: cartBooking.user.phoneNo,
                // 		message: `We were not able on our ${instalment.attempt} time and final try to successfully collect your $${instalment.amount} installment payment from your credit card on file that was scheduled for ${instalment.instalmentDate}`
                // 	})
                // }
                PushNotification.sendNotificationTouser(
                    cartBooking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "instalment",
                        task: "instalment_failed",
                        bookingId: cartBooking.laytripCartId,
                        instalmentId: instalment.id,
                    },
                    {
                        title: "Instalment Failed",
                        body: `We were not able on our ${instalment.attempt} time and final try to successfully collect your $${instalment.amount} installment payment from your credit card on file that was scheduled for ${instalment.instalmentDate}`,
                    },
                    cronUserId
                );
                WebNotification.sendNotificationTouser(
                    cartBooking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "instalment",
                        task: "instalment_failed",
                        bookingId: cartBooking.laytripCartId,
                        instalmentId: instalment.id,
                    },
                    {
                        title: "Instalment Failed",
                        body: `We were not able on our ${instalment.attempt} time and final try to successfully collect your $${instalment.amount} installment payment from your credit card on file that was scheduled for ${instalment.instalmentDate}`,
                    },
                    cronUserId
                );
            } else {
                console.log("transaction token true");
                //console.log('nextDate');

                for await (const booking of cartBooking.bookings) {
                    const nextInstalmentDate = await getManager()
                        .createQueryBuilder(
                            BookingInstalments,
                            "BookingInstalments"
                        )
                        .select([
                            "BookingInstalments.instalmentDate",
                            "BookingInstalments.amount",
                        ])
                        .where(
                            `"BookingInstalments"."instalment_status" =${InstalmentStatus.PENDING} AND "BookingInstalments"."booking_id" = '${booking.id}'`
                        )
                        .orderBy(`"BookingInstalments"."id"`)
                        .getOne();
                    let update = {
                        nextInstalmentDate:
                            nextInstalmentDate?.instalmentDate || null,
                    };
                    if (!nextInstalmentDate) {
                        update["paymentStatus"] = PaymentStatus.CONFIRM;
                    }

                    await getConnection()
                        .createQueryBuilder()
                        .update(Booking)
                        .set(update)
                        .where("id = :id", { id: booking.id })
                        .execute();
                    if (nextInstalmentDate) {
                        nextAmount += nextInstalmentDate.amount
                            ? parseFloat(nextInstalmentDate.amount)
                            : 0;
                        nextDate = nextInstalmentDate.instalmentDate;
                    }
                }

                // console.log(nextDate);
                const cartData = await CartDataUtility.cartData(cartBooking.id);

                console.log("cartData", cartData);

                for await (const booking of cartBooking.bookings) {
                    await this.checkAllinstallmentPaid(booking.id);
                }
                let param = {
                    // date: DateTime.convertDateFormat(
                    //     new Date(
                    //         cartBooking.bookings[0].bookingInstalments[0].instalmentDate
                    //     ),
                    //     "YYYY-MM-DD",
                    //     "MMM Do, YYYY"
                    // ),
                    date: DateTime.convertDateFormat(
                        new Date(),
                        "YYYY-MM-DD",
                        "MMM Do, YYYY"
                    ),
                    userName: cartBooking.user.firstName,
                    cardHolderName:
                        transaction.meta_data.transaction.payment_method
                            .full_name,
                    cardNo:
                        transaction.meta_data.transaction.payment_method.number,
                    orderId: cartBooking.laytripCartId,
                    amount: Generic.formatPriceDecimal(cartAmount),
                    installmentId:
                        cartBooking.bookings[0].bookingInstalments[0].id,
                    complitedAmount: cartData.paidAmountNumeric,
                    totalAmount: cartData.totalAmounNumerict,
                    currencySymbol:
                        cartBooking.bookings[0].bookingInstalments[0].currency
                            .symbol,
                    currency:
                        cartBooking.bookings[0].bookingInstalments[0].currency
                            .code,
                    pendingInstallment: cartData.pandinginstallment,
                    phoneNo:
                        `+${cartBooking.user.countryCode}` +
                        cartBooking.user.phoneNo,
                    bookingId: cartBooking.laytripCartId,
                    nextDate: DateTime.convertDateFormat(
                        new Date(nextDate),
                        "YYYY-MM-DD",
                        "MMM Do, YYYY"
                    ),
                    nextAmount: nextAmount,
                };
                if (cartBooking.user.isEmail) {
                    if (nextAmount > 0) {
                        this.mailerService
                            .sendMail({
                                to: cartBooking.user.email,
                                from: mailConfig.from,
                                bcc: mailConfig.BCC,
                                subject: `Booking ID ${param.bookingId} Installment Recevied`,
                                html: LaytripInstallmentRecevied(param),
                            })
                            .then((res) => {
                                console.log("res", res);
                            })
                            .catch((err) => {
                                console.log("err", err);
                            });
                    } else {
                        const responce = await CartDataUtility.CartMailModelDataGenerate(
                            cartBooking.laytripCartId
                        );
                        if (responce?.param) {
                            let subject = `Booking ID ${cartBooking.laytripCartId} Complition Notice`;
                            this.mailerService
                                .sendMail({
                                    to: responce.email,
                                    from: mailConfig.from,
                                    bcc: mailConfig.BCC,
                                    subject: subject,
                                    html: await LaytripCartBookingComplationMail(
                                        responce.param
                                    ),
                                })
                                .then((res) => {
                                    //console.log("res", res);
                                })
                                .catch((err) => {
                                    //console.log("err", err);
                                });
                        }
                    }
                    console.log(
                        "mail successed",
                        param,
                        cartBooking.user.email
                    );
                }

                // if (cartBooking.user.isSMS) {
                // 	TwilioSMS.sendSMS({
                // 		toSMS: param.phoneNo,
                // 		message: `We have received your payment of ${param.currencySymbol}${param.amount} for booking number ${param.bookingId}`
                // 	})
                // }

                PushNotification.sendNotificationTouser(
                    cartBooking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "instalment",
                        task: "instalment_received",
                        bookingId: cartBooking.laytripCartId,
                        instalmentId:
                            cartBooking.bookings[0].bookingInstalments[0].id,
                    },
                    {
                        title: "Installment Received",
                        body: `We have received your payment of $${cartAmount}.`,
                    },
                    cronUserId
                );
                WebNotification.sendNotificationTouser(
                    cartBooking.user.userId,
                    {
                        //you can send only notification or only data(or include both)
                        module_name: "instalment",
                        task: "instalment_received",
                        bookingId: cartBooking.laytripCartId,
                        instalmentId:
                            cartBooking.bookings[0].bookingInstalments[0].id,
                    },
                    {
                        title: "Installment Received",
                        body: `We have received your payment of $${cartAmount}.`,
                    },
                    cronUserId
                );
            }
            console.log("3");
        }
    }

    async dailyPayment() {
        Activity.cronActivity("Partial payment cron");

        const date = new Date();
        var date1 = date.toISOString();
        date1 = date1
            .replace(/T/, " ") // replace T with a space
            .replace(/\..+/, "")
            .split(" ")[0];

        let cartBookings = await getConnection()
            .createQueryBuilder(CartBooking, "cartBooking")
            .leftJoinAndSelect("cartBooking.bookings", "booking")
            .leftJoinAndSelect(
                "booking.bookingInstalments",
                "BookingInstalments"
            )
            .leftJoinAndSelect("BookingInstalments.currency", "currency")
            .leftJoinAndSelect("cartBooking.user", "User")
            .where(
                `("BookingInstalments".instalment_date In ('${date1}')) AND ("BookingInstalments"."payment_status" = ${PaymentStatus.PENDING}) AND ("BookingInstalments"."attempt" < 2) AND ("booking"."booking_type" = ${BookingType.INSTALMENT}) AND ("booking"."booking_status" In (${BookingStatus.CONFIRM},${BookingStatus.PENDING}))`
            )
            .getMany();
        if (!cartBookings.length) {
            throw new NotFoundException(`Partial Payment not available`);
        }

        var failedlogArray = "";
        for await (const cartBooking of cartBookings) {
            try {
                await this.getPaymentsOfBooking(cartBooking);
            } catch (error) {
                console.log("error", error);
                const filename =
                    `partial-payment-cron-error-log-` +
                    cartBooking.laytripCartId +
                    "-" +
                    new Date().getTime() +
                    ".json";

                Activity.createlogFile(
                    filename,
                    JSON.stringify(cartBooking.laytripCartId) +
                        "-----------------------error-----------------------" +
                        JSON.stringify(error),
                    "payment"
                );
                failedlogArray += `<p>instalmentId:- ${cartBooking.laytripCartId}-----Log file----->/var/www/src/payment/${filename}</p> <br/>`;
            }
        }
        if (failedlogArray != "") {
            this.cronfailedmail(
                "cron fail for given installment id please check log files: <br/><pre>" +
                    failedlogArray,
                "Daily payment cron error log"
            );
            Activity.cronUpdateActivity("Partial payment cron", failedlogArray);
        }

        return {
            message: `${new Date()} date installation payment capture successfully`,
        };
    }

    async deleteLog(folderName) {
        const path = require("path");
        const fs = require("fs");
        const directoryPath = path.join("/var/www/html/logs/" + folderName);
        //passsing directoryPath and callback function
        fs.readdir(directoryPath, function(err, files) {
            //handling error
            if (err) {
                return console.log("Unable to scan directory: " + err);
            }
            //listing all files using forEach
            files.forEach(function(file) {
                // Do whatever you want to do with the file
                const fileName =
                    "/var/www/html/logs/" + folderName + "/" + file;

                fs.unlinkSync(fileName);
            });
        });

        return {
            message: `${folderName} log uploaded on s3 bucket`,
        };
    }
}
