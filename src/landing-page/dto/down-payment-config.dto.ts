import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { isArray, IsArray, IsEnum, IsNotEmpty, ValidateIf, ValidateNested, ValidationArguments } from "class-validator";
import { daysConfiguration } from "src/entity/days_configuration.entity";
import { DownPaymentType } from "src/enum/down-payment-type.enum";
import { InstalmentType } from "src/enum/instalment-type.enum";
import { ModulesName } from "src/enum/module.enum";
import { OfferCriteriaVariables } from "src/enum/offer-criteria-variables.enum";
import { OfferCriterias } from "src/enum/offer-criteria.enum";
import { PaymentType } from "src/enum/payment-type.enum";

export class NewLandingPageDownPaymentConfigDto {
    @IsNotEmpty({
        message: `Please enter module id.&&&module id`,
    })
    @ApiProperty({
        description: `Enter module id`,
        example: [1,3],
    })
    module_id: ModulesName[];


    @IsArray()
    @IsNotEmpty({
        message: `Please enter days config id.`,
    })
    @ApiProperty({
        description: `Enter days config id`,
        example: [2,3],
    })
    days_config_id: number[];

   
    @ApiProperty({
        description: `Enter days landing page id.`,
        example: 'dww1131qqd-13weweqwe21-21312eqeqwe2q22',
    })
    landing_page_id: string;
    @IsArray()
    @ValidateNested({ each: true })
    @Type()
    @ApiProperty({
        description: `offer_criteria`,
        example: [
            {
                "flight": {
                    "offer_criteria_type": "arrival",
                    "offer_criteria_variable": "airport_code",
                    "offer_criteria_value": [
                        "AMD"
                    ]
                },
                "hotel": {
                    "offer_criteria_type": "city",
                    "offer_criteria_variable": "city",
                    "offer_criteria_value": [
                        "Ahmedabad"
                    ]
                }
            }
        ]
    })
    offer_criteria: OfferCriteArea[]


    @IsArray()
    @IsNotEmpty({
        message: `Please enter days down payment option.`,
    })
    @ApiProperty({
        description: `Enter days down payment option`,
        example: [20, 30, 40],
    })
    down_payment_option: number[];

    @IsArray()
    @IsNotEmpty({
        message: `Please enter payment frequency.`,
    })
    @ApiProperty({
        description: `Enter  payment frequency`,
        example: [InstalmentType.MONTHLY, InstalmentType.WEEKLY, InstalmentType.BIWEEKLY],
    })
    payment_frequency: InstalmentType[];

    @IsEnum([DownPaymentType.PERCENTAGE, DownPaymentType.FLAT], {
        message: (args: ValidationArguments) => {
            if (typeof args.value == "undefined" || args.value == "") {
                return `Please select down payment type`;
            } else {
                return `Please select down payment type('${DownPaymentType.PERCENTAGE}','${DownPaymentType.FLAT}')`;
            }
        },
    })
    @ApiProperty({
        description: `Enter down payment type`,
        example: "percentage",
    })
    down_payment_type: DownPaymentType;

    // @IsNotEmpty({
    //     message: `Please enter value of allow installment.`,
    // })
    // @ApiProperty({
    //     description: `Enter days allow installment`,
    //     example: true,
    // })
    // allow_installment: boolean;
}
class OfferCriteArea {

    @ValidateIf((o) => o.module_id === 1)
    @IsEnum([OfferCriterias.DEPARTURE, OfferCriterias.ARRIVAL, OfferCriterias.ROUTE], {
        message: (args: ValidationArguments) => {
            if (typeof args.value == "undefined" || args.value == "") {
                return `Please select offer criteria type`;
            } else {
                return `Please select valid offer criteria type('${OfferCriterias.DEPARTURE}','${OfferCriterias.ARRIVAL}','${OfferCriterias.ROUTE}')`;
            }
        },
    })
    @ApiProperty({
        description: `Enter offer criteria type`,
        example: "arrival",
    })
    offer_criteria_type: OfferCriterias;

    @ValidateIf((o) => typeof o.offer_criteria_variable != "undefined")
    @IsEnum([OfferCriteriaVariables.AIRPORT_CODE, OfferCriteriaVariables.CITY, OfferCriteriaVariables.COUNTRY, OfferCriteriaVariables.ROUTE], {
        message: (args: ValidationArguments) => {
            if (typeof args.value == "undefined" || args.value == "") {
                return `Please select offer criteria type`;
            } else {
                return `Please select valid offer criteria type('${OfferCriteriaVariables.AIRPORT_CODE}','${OfferCriteriaVariables.CITY}','${OfferCriteriaVariables.ROUTE}','${OfferCriteriaVariables.COUNTRY}')`;
            }
        },
    })
    @ApiProperty({
        description: `Enter offer criteria variable`,
        example: "airport_code",
    })
    offer_criteria_variable: OfferCriteriaVariables;

    @IsArray()
    @IsNotEmpty({
        message: `Please enter offer criteria value.`,
    })
    @ApiProperty({
        description: `Enter offer criteria value.`,
        example: [{ from: "ABQ", to: "LAS" }],
    })
    offer_criteria_value: any;
}