import { LaytripHeader } from "./laytrip_header.html";
import { LaytripFooter } from "./laytrip_footer.html";
import { BaseUrl, covidLink } from "../base-url";

export function LaytripCovidUpdateMail(param: { username: string }) {
  const content = `
                                <tr>
                                    <td align="center" valine="top" style="padding: 20px 25px 10px; background: #ffffff;">
                                        <table  width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
                                            <tbody>
                                                <tr>
                                                    <td align="left" style="font-family: 'Open Sans', sans-serif;font-size: 18px; line-height: 24px; color: #000000; padding-top: 15px; text-align: left;">Hi ${param.username},</td>
                                                </tr>
                                                <tr>
                                                    <td align="left" valign="top" style="font-family: 'Open Sans', sans-serif;font-size: 18px; line-height: 18px; color: #707070;padding-top: 15px; text-align: left;">
                                                            Covid-19 Update! 
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="left" valign="top" style="font-family: 'Open Sans', sans-serif;font-size: 18px; line-height: 18px; color: #707070;padding-top: 15px; text-align: left;">
                                                        Please review our new Covid Update at <a href = '${covidLink}'
                    style="color: #0c7bff;"><u>laytrip.com/covid-19</u></a>. Also, visit your Travel Provider directly for additional Covid-19 information prior to your trip departure.
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
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 18px; color: #707070;padding-top:0px; text-align: left;">Sincerely,</td>
            </tr>
            <tr>
                <td align="left" valign="top" style="font-family: 'Poppins', sans-serif;font-size: 18px; line-height: 18px; color: #0043ff;padding-top:5px; text-align: left;"><a href = 'mailto:customerservice@laytrip.com'>Laytrip Customer Service</a></td>
            </tr>
        </tbody>
    </table>
</td>
</tr>
`;
  return LaytripHeader + content + LaytripFooter;
}
