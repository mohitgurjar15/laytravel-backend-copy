import { BookingType } from "src/enum/booking-type.enum";
import { ModulesName } from "src/enum/module.enum";
import { DateTime } from "src/utility/datetime.utility";
import { BookingLink, TermsConditonLink } from "../base-url";
import { CartBookingEmailParameterModel } from "../email_template/model/cart-booking-email.model";
import { LaytripFooter } from "./laytrip_footer.html";
import { LaytripHeader } from "./laytrip_header.html";

export async function LaytripCartBookingConfirmtionMail(
    param: CartBookingEmailParameterModel
) {
    let content = `<tr>
    <td align="center" valine="top" style="padding: 20px 25px 10px; background: #ffffff;">
        <table width="550px" border="0" cellspacing="0" cellpadding="0" align="center"
            style="width: 550px; font-family: 'Poppins', sans-serif; ">
            <tbody>
                <tr>
                    <td align="left" valign="top"
                    style="font-family: 'Poppins', sans-serif; font-weight: 100; font-size: 18px; line-height: 25px; color: #000000;padding:0 0 20px 0; text-align: left;">
                        Hi ${param.user_name ? param.user_name : ""},</td>
                </tr>
                <tr>
                    <td align="left" valign="top"
                        style="font-family: 'Poppins', sans-serif; font-weight: 100; font-size: 18px; line-height: 25px; color: #707070;padding:0 0 20px 0; text-align: left;">
                        Congratulations on booking your travel! <span style = "color: #000000">Your Laytrip Booking ID is ${
                            param.orderId
                        }.</span>  Please use this number when referencing your booking.`;
    if (param.bookingType == BookingType.NOINSTALMENT) {
        content += ` Here are your booking details:`;
    }
    content += `</td>
                </tr>`;
    if (param.bookingType == BookingType.INSTALMENT) {
        content += `<tr>
                    <td align="left" valign="top"
                        style="font-family: 'Poppins', sans-serif; font-weight: 100; font-size: 18px;  line-height: 25px; color: #707070;padding:0 0 15px 0; text-align: left;">
                        We will send you your airline, hotel, car and home rental reservation number(s) once we have received your final installment payment. Until your final installment is received, our  
                        <a href="${TermsConditonLink}" style="color: #0c7bff;"><u>Terms</u></a> for changes and cancellations apply. 
                        Here are your booking details:
                </tr>`;
    }
    
    for await (const booking of param.bookings) {
        let traveleName = "";
        let travelerEmail = "";
        for await (const traveler of booking.travelers) {
            if (traveleName != "") {
                traveleName += ", ";
            }
            if (travelerEmail != "") {
                travelerEmail += ", ";
            }
            traveleName += traveler.name
                ? traveler.name + "(" + traveler.type + ")"
                : "";
            travelerEmail += traveler.email
                ? '<span style="color: #0c7bff;"><u>' +
                  traveler.email +
                  "</u></span>"
                : "";
        }
        if (booking.moduleId == ModulesName.FLIGHT) {
            //   content += `<tr>
            //                 <td>
            //                     <table class="oc_wrapper" border="1" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #dddddd; font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;"
            //                         id="templateColumns">
            //                         <tr>
            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="20%" class="header_txt"
            //                                 style="padding: 15px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 flight
            //                             </th>
            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="40%" class="header_txt"
            //                                 style="padding: 15px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 Departure
            //                             </th>
            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="40%" class="header_txt"
            //                                 style="padding: 15px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 Arrival
            //                             </th>
            //                         </tr>`;

            content += `<tr>
                    <td
                        align="left"
                        valign="top"
                        style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:20px; padding-bottom:5px; text-align: left;"
                    >
                        <span style="color: #000000">
                        Traveler:
                        </span> 
                        <span style="font-size: 16px" >
                        ${traveleName}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td
                        align="left"
                        valign="top"
                        style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                    >
                        <span style="color: #000000">
                        Email:
                        </span> 
                        <span style="font-size: 18px" >
                        ${travelerEmail}
                        </span>
                    </td>
                </tr>`;
            for await (const flight of booking.flighData) {


                // content += `<tr>
                //                         <td colspan="3"
                //                             style="padding:15px 0; background-color: #ecf1ff; color: #000000; font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 15px;">
                //                                 <span>${flight.rout}</span>
                //                             </div>
                //                         </td>
                //                     </tr>`;
                 for await (const droup of flight.droups) {

                     content += `<tr>
                        <td
                            align="left"
                            valign="top"
                            style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                        >
                            <span style="color: #000000">${droup.flight}:</span> 
                            Depart ${
                                droup.depature.code
                            } ${DateTime.convertDateFormat(
                         droup.depature.date,
                         "MM/DD/YYYY",
                         "MMM D, YYYY"
                     )} ${droup.depature.time.replace(/\s/g, "")},
                            Arrive ${
                                droup.arrival.code
                            } ${droup.arrival.time.replace(/\s/g, "")}
                        </td>
                    </tr>`;
                //   content += `<tr>
                //                         <td class="templateColumnContainer">
                //                             <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                                 <tr>
                //                                     <td valign="top" class="leftColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                         <span style="display: block;"> ${
                //                                           droup.flight
                //                                         }</span>
                //                                         <span style="display: block;">${
                //                                           droup.airline || ''
                //                                         }</span>
                //                                     </td>
                //                                 </tr>
                //                             </table>
                //                         </td>
                //                         <td class="templateColumnContainer">
                //                             <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                                 <tr>
                //                                     <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                         <span style="display: block;">Airport : ${
                //                                           droup.depature.code
                //                                         } (La Guardia)</span>
                //                                         <span style="display: block;">City : ${
                //                                           droup.depature.city
                //                                         }</span>
                //                                         <span style="display: block;">Country : ${
                //                                           droup.depature.country
                //                                         }</span>
                //                                         <span style="display: block;"> Date : ${DateTime.convertDateFormat(
                //                                           droup.depature.date,
                //                                           "MM/DD/YYYY",
                //                                           "MMM DD, YYYY"
                //                                         )}</span>
                //                                         <span style="display: block;">Time : ${
                //                                           droup.depature.time
                //                                         }</span>
                //                                     </td>
                //                                 </tr>
                //                             </table>
                //                         </td>
                //                         <td class="templateColumnContainer">
                //                             <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                                 <tr>
                //                                     <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                         <span style="display: block;">Airport : ${
                //                                           droup.arrival.code
                //                                         }</span>
                //                                         <span style="display: block;">City : ${
                //                                           droup.arrival.city
                //                                         }</span>
                //                                         <span style="display: block;">Country : ${
                //                                           droup.arrival.country
                //                                         }</span>
                //                                         <span style="display: block;"> Date : ${DateTime.convertDateFormat(
                //                                           droup.arrival.date,
                //                                           "MM/DD/YYYY",
                //                                           "MMM DD, YYYY"
                //                                         )}</span>
                //                                         <span style="display: block;">Time : ${
                //                                           droup.arrival.time
                //                                         }</span>
                //                                     </td>
                //                                 </tr>
                //                             </table>
                //                         </td>
                //                     </tr>`;
                 }
            //      if (flight.droups[0].depature?.pnr_no) {
            //          content += `<tr>
            //     <td
            //         align="left"
            //         valign="top"
            //         style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:px; text-align: left;"
            //     >
            //         <span style="color: #000000">Provider Reservation Number: ${flight.droups[0].depature.pnr_no}</span> 
            //         </span>
            //     </td>
            // </tr>`;
            //      }
            }

            //   content += `</table>
            //                 </td>
            //             </tr>

            //             <tr>
            //                 <td>
            //                     <table class="oc_wrapper" border="1" cellpadding="0" cellspacing="0" width="550" style="border: 1px solid #dddddd; font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;"
            //                         id="templateColumns">
            //                         <tr>
            //                             <td colspan="4"
            //                                 style="padding: 10px 0; background-color: #ecf1ff; color: #000000; font-weight: 800; font-size: 11px; font-family: 'Poppins', sans-serif;">
            //                                 <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 15px;">
            //                                     <span>Traveler Details</span>
            //                                 </div>
            //                             </td>
            //                         </tr>
            //                         <tr>

            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="30%" class="header_txt"
            //                                 style="padding: 10px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 Name
            //                             </th>
            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="35%" class="header_txt"
            //                                 style="padding: 10px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 Email
            //                             </th>
            //                             <th align="center" valign="center" cellpadding="10" cellspacing="0"
            //                                 width="20%" class="header_txt"
            //                                 style="padding: 10px 0; font-weight: 300; text-transform: uppercase; background-color: #0043ff; border: 1px solid #ffffff; color: #fff; font-family: 'Poppins', sans-serif; font-size: 12px; line-height: 25px;">
            //                                 Type
            //                             </th>
            //                         </tr>`;
            //   for (let index = 0; index < booking.travelers.length; index++) {
            //     const traveler = booking.travelers[index];
            //     content += `<tr>

            //                             <td class="templateColumnContainer" width="25%">
            //                                 <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
            //                                     <tr>
            //                                         <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
            //                                             <span style="display: block;">${traveler.name}</span>
            //                                         </td>
            //                                     </tr>
            //                                 </table>
            //                             </td>
            //                             <td class="templateColumnContainer" width="25%">
            //                                 <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
            //                                     <tr>
            //                                         <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
            //                                             <span style="display: block;">${traveler.email}</span>
            //                                         </td>
            //                                     </tr>
            //                                 </table>
            //                             </td>
            //                             <td class="templateColumnContainer" width="35%">
            //                                 <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
            //                                     <tr>
            //                                         <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
            //                                             <span style="display: block;">${traveler.type}</span>
            //                                         </td>
            //                                     </tr>
            //                                 </table>
            //                             </td>
            //                         </tr>`;
            //   }
            //   content += `</table>
            //                 </td>
            //             </tr><tr><td>   <br/></td></tr>`;
        }
    }
    //   content += `<tr>
    //                     <td>
    //                         <table class="oc_wrapper" border="1" cellpadding="3" cellspacing="0" width="100%" style="border: 1px solid #dddddd; margin-top: 15px; font-weight: 300; font-size: 12px; font-family: 'Poppins', sans-serif;"
    //                             id="templateColumns">
    //                             <tr>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">Booking ID</span></td>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">${param.orderId}</span></td>
    //                             </tr>
    //                             <tr>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">Total Price</span></td>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">${param.cart.totalAmount}</span></td>
    //                             </tr>`;
    //   if (param.cart.totalPaid != "$0") {
    //     content += `<tr>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">Total Paid</span></td>
    //                                 <td><span style="font-weight: 500; font-size: 13px; padding-right:10px; color: #000000; font-family: 'Poppins', sans-serif;">${param.cart.totalPaid}</span></td>
    //                             </tr>
    //                             <tr>
    //                                 <td><span style="font-weight: 700; font-size: 13px; padding-right:10px; color: #000000;  font-family: 'Poppins', sans-serif;">Balance Due</span></td>
    //                                 <td><span style="font-weight: 700; font-size: 13px; padding-right:10px; color: #000000;  font-family: 'Poppins', sans-serif;">${param.cart.rememberAmount}</span></td>
    //                             </tr>`;
    //   }

    //                         </table>
    //                     </td>
    //                 </tr>
    content += `<tr>
                <td
                    align="left"
                    valign="top"
                    style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:10px; padding-bottom:5px; text-align: left;"
                >
                    <span style="color: #000000">Total Price:</span>  <span style="font-size: 16px" >${param.cart.totalAmount}</span>
                </td>
            </tr>`
if (param.bookingType == BookingType.INSTALMENT){
    content += `
    <tr>
                <td
                    align="left"
                    valign="top"
                    style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                >
                    <span style="color: #000000">Total Paid:</span>  <span style="font-size: 16px" >${param.cart.totalPaid}</span>
                </td>
            </tr>
            <tr>
                <td
                    align="left"
                    valign="top"
                    style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                >
                    <span style="color: #000000">Balance Due:</span>  <span style="font-size: 16px" >${param.cart.rememberAmount}</span>
                </td>
            </tr>`
}
    if (param.paymentDetail.length) {
        content += `<tr>
                <td
                    align="left"
                    valign="top"
                    style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                >
                    <span style="color: #000000">Installments</span> 
                </td>
            </tr> `;
    for (let index = 0; index < param.paymentDetail.length; index++) {
            const payment = param.paymentDetail[index];
            //   console.log(payment.amount);
            if (index > 0) {
                content += `
                <tr>
                <td
                    align="left"
                    valign="top"
                    style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070; padding-top:5px; padding-bottom:5px; text-align: left;"
                >
                    #${index} ${payment.amount} ${
                    payment.status
                } ${DateTime.convertDateFormat(
                    payment.date,
                    "YYYY-MM-DD",
                    "MMM DD, YYYY"
                )}
                </td>
            </tr>` 
                // <tr>
                //                 <td class="templateColumnContainer" width="15%">
                //                     <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                         <tr>
                //                             <td valign="top" class="leftColumnContent">
                //                                 <span style="display: block;">#${index}</span>
                //                             </td>
                //                         </tr>
                //                     </table>
                //                 </td>
                //                 <td class="templateColumnContainer" width="25%">
                //                     <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                         <tr>
                //                             <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                 <span style="display: block;">${
                //                                     payment.amount
                //                                 }</span>
                //                             </td>
                //                         </tr>
                //                     </table>
                //                 </td>
                //                 <td class="templateColumnContainer" width="35%">
                //                     <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                         <tr>
                //                             <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                 <span style="display: block;">${
                //                                     payment.status
                //                                 }</span>
                //                             </td>
                //                         </tr>
                //                     </table>
                //                 </td>
                //                 <td class="templateColumnContainer" width="25%">
                //                     <table class="oc_wrapper" border="0" cellpadding="5" cellspacing="0" width="100%">
                //                         <tr>
                //                             <td valign="top" class="rightColumnContent" style="font-weight: 300; font-size: 11px; font-family: 'Poppins', sans-serif;">
                //                                 <span style="display: block;">${DateTime.convertDateFormat(
                //                                     payment.date,
                //                                     "YYYY-MM-DD",
                //                                     "MMM DD, YYYY"
                //                                 )}</span>
                //                             </td>
                //                         </tr>
                //                     </table>
                //                 </td>
                                
                //             </tr>`;
            }
        }
    }
    content += `
                <tr>
                    <td style="padding: 0 0 15px 0;">
                        <table class="oc_wrapper" align="center" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                                <tr>
                                    <td align="center" valign="middle" style="font-family: 'Open Sans', sans-serif; font-size: 18px; font-weight: 200; " height="48">
                                        <a class="" style="color: #f725c5;" href = '${BookingLink}'><u>My  Bookings</u></a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>`;
    if (param.bookingType != BookingType.INSTALMENT) {
        
        content += `<tr>
                    <td align="left" valign="top"
                        style="font-family: 'Poppins', sans-serif; font-weight: 100; font-size: 18px; line-height: 25px; color: #707070;padding:0 0 20px 0; text-align: left;">
                        Contact us anytime at <a href = 'mailto:customerservice@laytrip.com'
                        style="color: #0c7bff;"><u>customerservice@laytrip.com</u></a>. We hope you have a great trip!
                    </td>
                </tr>`;
    }
    content += `    
            </tbody>
        </table>
    </td>
</tr><tr>
<td align="center" valine="top" style="padding: 5px 25px 10px; background: #ffffff;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
        <tbody> 
            <tr>
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 20px; color: #707070;padding-top:27px; text-align: left;">Sincerely,</td>
            </tr>
            <tr>
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 18px; color: #0043ff;padding-top:5px; text-align: left;"><a href = 'mailto:customerservice@laytrip.com'>Laytrip Customer Service</a></td>
            </tr>
        </tbody>
    </table>
</td>
</tr>`;
    return LaytripHeader + content + LaytripFooter;
}
