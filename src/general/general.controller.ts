import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeneralService } from './general.service';

@ApiTags("Generic")
@Controller('generic')
export class GeneralController {

    constructor(
        private generalService:GeneralService
    ){

    }

    @ApiOperation({ summary: "Get All country" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 409, description: 'User Already Exist' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country')
    async getCountry(){
       return await this.generalService.getAllCountry();
    }

    @ApiOperation({ summary: "Get country details" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country/:id')
    async getCountryDetails(
        @Param('id') id:number
    ){
       return await this.generalService.getCountryDetails(id);
    }

    @ApiOperation({ summary: "Get state by country id" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('country/:id/state')
    async getState(
        @Param('id') id:number
    ){
       return await this.generalService.getStates(id);
    }

    @ApiOperation({ summary: "Get state details" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 404, description: 'Not found!' })
    @ApiResponse({ status: 500, description: 'Internal server error!' })
    @Get('state/:id')
    async getStateDetails(
        @Param('id') id:number
    ){
       return await this.generalService.getStateDetails(id);
    }
    
}