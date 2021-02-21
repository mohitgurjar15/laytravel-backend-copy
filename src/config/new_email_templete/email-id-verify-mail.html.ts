import { LaytripHeader } from "./laytrip_header.html";
import {  LaytripFooter} from "./laytrip_footer.html";
import { BaseUrl } from "../base-url";

export function VerifyEmailIdTemplete(param:{ username:string , otp:number })
{
const content = `<!-- header Text section start -->
<table width="100%" border="0" cellspacing="0" cellpadding="0"  style="background: #f2f2f2;" class="full-wrap">
    <tr>
        <td align="center" valign="top">
            <table align="center" style="width:600px; max-width:600px; table-layout:fixed;" class="oc_wrapper" width="600" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center" valine="top" style="background-color: #ffffff;">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 600px;" class="oc_wrapper">
                            <tbody>
                                <tr>
                                    <td align="center" valine="top" style="padding: 10px 15px 30px; background: #ffffff;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 100%">
                                            <tbody>
                                                <tr>
                                                    <td align="left" valign="top" style="font-family: 'Open Sans', sans-serif;font-size: 22px; line-height: 24px; color: #444; font-weight:700; padding-top: 15px; text-align: center;">Verify Account</td>
                                                </tr>
                                                <tr>
                                                    <td align="left" valign="top" style="font-family: 'Open Sans', sans-serif;font-size: 14px; line-height: 18px; color: #000;padding-top: 15px; text-align: center;">
                                                        To complete your Sign Up, please verify below otp with your email address. 
                                                    .</td>
                                                </tr>
                                                
                                                <tr>
                                                    <td align="center" valign="top" style="padding-top: 20px;">
                                                        <table border="0" cellspacing="0" cellpadding="0" align="center">
                                                            <tr>
                                                                <td mc:edit="text4" align="center" valign="middle" height="50" style="background-color: #1943FF;  font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; border-radius: 4px;"><a style="display: block; text-decoration: none; padding: 0px 20px;  line-height: 48px; color: #ffffff;">Your OTP - ${param.otp}</a></td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="left" valign="top" style="font-family: 'Open Sans', sans-serif;font-size: 14px; line-height: 18px; color: #000;padding-top: 15px; text-align: center;">
                                                    If you have any questions, please contact us at customerservice@laytrip.com.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
<!-- header text section End -->

`;
return LaytripHeader + content + LaytripFooter;
}