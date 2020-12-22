import { NotAcceptableException, RequestTimeoutException } from '@nestjs/common';
import Axios from 'axios';
import * as xml2js from 'xml2js';
import { Activity } from './activity.utility';

export class HttpRequest {

    static async mystiflyRequest(url, requestBody, headerAction) {
        try {
            let result = await Axios({
                method: 'POST',
                url: url,
                data: requestBody,
                timeout: 180000,
                headers: {
                    'content-type': 'text/xml',
                    'Accept-Encoding': 'gzip',
                    'soapaction': `Mystifly.OnePoint/OnePoint/${headerAction}`,
                    'charset': 'UTF-8',
                    'cache-control': 'no-cache'
                }
            })

            let fileName = '';
            if (headerAction != 'CreateSession') {
                let logData = {};
                logData['url'] = url
                logData['requestBody'] = requestBody
                logData['headers'] = {
                    'content-type': 'text/xml',
                    'Accept-Encoding': 'gzip',
                    'soapaction': `Mystifly.OnePoint/OnePoint/${headerAction}`,
                    'charset': 'UTF-8',
                    'cache-control': 'no-cache'
                }
                logData['responce'] = result.data;
                fileName = `Flight-mystifly-${headerAction}-${new Date().getTime()}`;
                Activity.createlogFile(fileName, logData, 'flights');
            }

            result = await xml2js.parseStringPromise(result.data, {
                normalizeTags: true,
                ignoreAttrs: true
            });
            result['log_file'] = fileName
            return result;
        }
        catch (error) {
            //console.log("===================", error.message)
            throw new RequestTimeoutException(`Connection time out`)
        }

    }

    static async mystiflyRequestZip(url, requestBody, headerAction) {
        try {
            let result = await Axios({
                method: 'POST',
                url: url,
                data: requestBody,
                timeout: 180000,
                headers: {
                    'content-type': 'text/xml',
                    'Accept-Encoding': 'gzip',
                    'soapaction': `${headerAction}`,
                    'charset': 'UTF-8',
                    'cache-control': 'no-cache'
                }
            })

            result = await xml2js.parseStringPromise(result.data, {
                normalizeTags: true,
                ignoreAttrs: true
            });

            return result;
        }
        catch (error) {
            console.log(error.message)
            throw new RequestTimeoutException(`Connection time out`)
        }

    }

    static async monakerRequest(url,method, requestBody, apiKey) {
        
        // console.log("requestBody==============>",url);
        try {
            let result = await Axios({
                method: method,
                url: url,
                data: requestBody,
                headers: {
                    'Ocp-Apim-Subscription-Key':apiKey,
                    'Accept-Encoding': 'gzip',
                }
            })
            
            return result;
        }
        catch (e) {
            let error = e.response.data
            
            console.log("===================>>>>>>>>>>>>>", e);
            
            if(error.hasOwnProperty("CheckInDate")){
                throw new NotAcceptableException(`${error["CheckInDate"][0]}`)
            }else if(error.hasOwnProperty("CheckOutDate")){
                throw new NotAcceptableException(`${error["CheckOutDate"][0]}`)
            }else if(error["statusCode"] == 429){
                throw new NotAcceptableException(`${error["message"]}`)
            }else{
                throw new RequestTimeoutException(`Connection time out`)
            }
        }

    }
}