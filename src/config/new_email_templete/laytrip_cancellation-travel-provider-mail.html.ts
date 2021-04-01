import { LaytripHeader } from "./laytrip_header.html";
import { LaytripFooter } from "./laytrip_footer.html";
import { BaseUrl } from "../base-url";

export function LaytripCancellationTravelProviderMail(param: {
  userName: string;
  bookingId: string;
}) {
  const content = `
                                <tr>
                                    <td align="left" valine="top" style="padding: 20px 25px 10px; background: #ffffff;">
                                        <table  width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
                                            <tbody>
                                                <tr>
                                                    <td align="center" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070;padding-top: 15px; text-align: left;">Hi ${param.userName},</td>
                                                </tr>
                                                <tr>
                                                    <td align="center" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070;padding-top: 15px; text-align: left;">
                                                    Booking ID ${param.bookingId} Cancellation Notice!  
                                                    </td>
                                                </tr>  
                                                <tr>
                                                    <td align="c" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070;padding-top: 15px; text-align: left;">
                                                           Unfortunately, your booking has been cancelled by the travel provider which happens on occasion. Please contact us at <a href = 'mailto:customerservice@laytrip.com'
                                                            style="color: #707070;">customerservice@laytrip.com</a> so we can work on alternative arrangements for you.                                             
                                                    </td>
                                                </tr>													
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
<td align="center" valine="top" style="padding: 5px 25px 10px; background: #ffffff;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
        <tbody> 
            <tr>
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070;padding-top:15px; text-align: left;">Sincerely,</td>
            </tr>
            <tr>
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 25px; color: #707070;padding-top:5px; text-align: left;"><a href = 'mailto:customerservice@laytrip.com'>Laytrip Customer Service</a></td>
            </tr>
        </tbody>
    </table>
</td>
</tr>
`;
  return LaytripHeader + content + LaytripFooter;
}
