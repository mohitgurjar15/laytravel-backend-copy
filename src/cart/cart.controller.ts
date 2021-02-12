import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/get-user.dacorator';
import { User } from 'src/entity/user.entity';
import { Role } from 'src/enum/role.enum';
import { Roles } from 'src/guards/role.decorator';
import { RolesGuard } from 'src/guards/role.guard';
import { CartService } from './cart.service';
import { AddInCartDto } from './dto/add-in-cart.dto';
import { CartBookDto } from './dto/book-cart.dto';
import { cartInstallmentsDto } from './dto/cart-installment-detil.dto';
import { ListCartDto } from './dto/list-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@ApiTags("Cart")
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
@Controller('cart')
export class CartController {
    constructor(private cartService: CartService) { }

    @Post('add')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "add item in cart" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    @HttpCode(200)
    @ApiHeader({
        name: 'currency',
        description: 'Enter currency code(ex. USD)',
        example: 'USD'
    })
    @ApiHeader({
        name: 'language',
        description: 'Enter language code(ex. en)',
    })

    async addInCart(
        @Body() addInCartDto: AddInCartDto,
        @GetUser() user: User,
        @Req() req,
    ) {
        return await this.cartService.addInCart(addInCartDto, user, req.headers);
    }

    @Put('update')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "update cart" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    @HttpCode(200)
    async updateCart(
        @Body() updateCart: UpdateCartDto,
        @GetUser() user: User,
        @Req() req,
    ) {
        return await this.cartService.updateCart(updateCart, user);
    }


    @Get('list')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "list item in cart of user" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    @ApiHeader({
        name: 'currency',
        description: 'Enter currency code(ex. USD)',
        example: 'USD'
    })
    @ApiHeader({
        name: 'language',
        description: 'Enter language code(ex. en)',
    })
    async listCart(
        @GetUser() user: User, @Req() req,
        @Query() dto: ListCartDto
    ) {
        return await this.cartService.listCart(dto, user, req.headers);
    }

    @Delete('delete/:id')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "Delete item in cart of user" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    async deleteFromCart(
        @GetUser() user: User,
        @Param("id") id: number
    ) {
        return await this.cartService.deleteFromCart(id, user);
    }

    @Post('book')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "book item from cart" })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    @HttpCode(200)
    @ApiHeader({
        name: 'currency',
        description: 'Enter currency code(ex. USD)',
        example: 'USD'
    })
    @ApiHeader({
        name: 'language',
        description: 'Enter language code(ex. en)',
    })
    async bookCart(
        @Body() bookCartDto: CartBookDto,
        @GetUser() user: User,
        @Req() req,
    ) {
        return await this.cartService.bookCart(bookCartDto, user, req.headers);
    }

    @Get('installment-detail')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
    @ApiOperation({ summary: "installment detail of specific cart " })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    async cartDetail(
        @Query() dto: cartInstallmentsDto,
        @GetUser() user: User,
    ) {
        return await this.cartService.cartInstallmentDetail(dto, user);
    }

    @Delete('empty-cart')
    @Roles(Role.FREE_USER, Role.PAID_USER)
    @ApiOperation({ summary: "empty cart " })
    @ApiResponse({ status: 200, description: 'Api success' })
    @ApiResponse({ status: 422, description: 'Bad Request or API error message' })
    @ApiResponse({ status: 500, description: "Internal server error!" })
    async emptyCart(
        @GetUser() user: User
    ) {
        return await this.cartService.emptyCart(user);
    }   
}
