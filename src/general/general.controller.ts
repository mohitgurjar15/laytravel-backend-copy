import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Detail } from 'src/hotel/hotel-suppliers/priceline/modules/detail';
import { PushNotification } from 'src/utility/push-notification.utility';
import { PushNotificationDto } from './dto/push-notification.dto';
import { GeneralService } from './general.service';

@ApiTags("Generic")
@Controller('generic')
export class GeneralController {

    constructor(
        private generalService: GeneralService
    ) {

    }

    @ApiOperation({ summary: "Get All country" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 409, description: 'User Already Exist' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country')
    async getCountry() {
        return await this.generalService.getAllCountry();
    }

    @ApiOperation({ summary: "Get country details" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country/:id')
    async getCountryDetails(
        @Param('id') id: number
    ) {
        return await this.generalService.getCountryDetails(id);
    }

    @ApiOperation({ summary: "Get state by country id" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country/:id/state')
    async getState(
        @Param('id') id: number
    ) {
        return await this.generalService.getStates(id);
    }

    @ApiOperation({ summary: "Get state details" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('state/:id')
    async getStateDetails(
        @Param('id') id: number
    ) {
        return await this.generalService.getStateDetails(id);
    }

    @ApiOperation({ summary: "User Location" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('location')
    async getUserLocation(
        @Req() req
    ) {
        return await this.generalService.getUserLocation(req);
    }

    @ApiOperation({ summary: "push notification" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Post('push-notification')
    async pusTest(
        @Body() detail: PushNotificationDto
    ) {
        const { userId, body, header } = detail
        PushNotification.sendNotificationTouser(userId, body, header, userId)
        return {message : `Notification send succesfully`}
    }
}
