import { Generic } from "src/utility/generic.utility";
import { LaytripFooter } from "./laytrip_footer.html";
import { LaytripHeader } from "./laytrip_header.html";

export function LaytripPaymentFailedTemplete(param: { userName: string, amount: string, date: string , bookingId:string , try : number }
    ) {
    const content = `<tr>
    <td align="center" valine="top" style="padding: 20px 25px 10px; background: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
            <tbody>
                <tr>
                    <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 16px; line-height: 20px; color: #000000; text-align: left;"> Hi ${param.userName},</td>
                </tr>
                <tr>
                    <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 16px; line-height: 20px; color: #707070;padding: 20px 0; text-align: left;">Booking ID ${param.bookingId} Cancellation Notice! </td>
                </tr>
                <tr>
                    <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 16px; line-height: 20px; color: #707070;padding: 20px 0; text-align: left;">We have made ${param.try} unsuccessful attempts to collect your installment payment of ${param.amount} originally scheduled for ${param.date}.</td>
                </tr>
                <tr>
                    <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 16px; line-height: 20px; color: #707070;padding-top:10px; text-align: left;">Per our <span style="color: blue;">Laytrip Policy</span> and the information in our previous notifications to you, we have unfortunately had to cancel your booking and we will not be able to issue any refunds.</td>
                </tr>
                <tr>
                    <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 16px; line-height: 20px; color: #707070;padding-top:10px; text-align: left;">If you have any questions, please contact us at <span style="color: blue;">customerservice@laytrip.com</span>. We hope to be able to try again with you on a future booking.</td>
                </tr>
            </tbody>
        </table>
    </td>
</tr>
`;
    return LaytripHeader + content + LaytripFooter;
}