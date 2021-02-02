import { Controller, Body, UseGuards, Param, Put, ValidationPipe, Get, Query, HttpCode, Post, Delete, UseInterceptors, UploadedFiles, Req, BadRequestException, Patch, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../entity/user.entity';
import { ListUserDto } from './dto/list-user.dto';
import { GetUser } from 'src/auth/get-user.dacorator';
import { SaveUserDto } from './dto/save-user.dto';
import { Roles } from 'src/guards/role.decorator';
import { RolesGuard } from 'src/guards/role.guard';
import { Role } from 'src/enum/role.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from "multer";
import { editFileName, imageFileFilter, csvFileFilter } from '../auth/file-validator';
import { ProfilePicDto } from '../auth/dto/profile-pic.dto';
import { SiteUrl } from 'src/decorator/site-url.decorator';
import { ActiveDeactiveDto } from './dto/active-deactive-user.dto';
import { ImportUserDto } from './dto/import-user.dto';
import { csvFileDto } from './dto/csv-file.dto';
import { ListDeleteRequestDto } from './dto/list-delete-request.dto';
import { ExportUserDto } from './dto/export-user.dto';

@ApiTags('User')
@Controller('user')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
export class UserController {

	constructor(
		private userService: UserService
	) { }

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "List user by admin" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({ status: 403, description: "You are not allowed to access this resource." })
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async listUser(
		@Query() paginationOption: ListUserDto,
		@SiteUrl() siteUrl: string,
	): Promise<{ data: User[], TotalReseult: number }> {
		return await this.userService.listUser(paginationOption, siteUrl);
	}

	@Get('/:id')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "Get user details by admin" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({ status: 403, description: "You are not allowed to access this resource." })
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async getUserData(
		@Param('id') userId: string, @SiteUrl() siteUrl: string
	): Promise<User> {
		console.log(userId)
		return await this.userService.getUserData(userId, siteUrl);
	}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiConsumes("multipart/form-data")
	@ApiOperation({ summary: "Create new user by admin" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({ status: 403, description: "You are not allowed to access this resource." })
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	@HttpCode(200)
	@UseInterceptors(
		FileFieldsInterceptor(
			[
				{ name: "profile_pic", maxCount: 1 }
			],
			{
				storage: diskStorage({
					destination: "./assets/profile",
					filename: editFileName,
				}),
				fileFilter: imageFileFilter,
				limits: { fileSize: 2097152 }
			},
		),
	)
	async createUser(
		@Body() saveUserDto: SaveUserDto,
		@UploadedFiles() files: ProfilePicDto,
		@Req() req,
		@GetUser() user: User
	) {
		if (req.fileValidationError) {
			throw new BadRequestException(`${req.fileValidationError}`);
		}
		console.log("user", user)
		const userId = user.userId;
		return await this.userService.create(saveUserDto, files, userId)
	}


	@Put('/:id')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiConsumes("multipart/form-data")
	@ApiOperation({ summary: "Update user by admin" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({ status: 403, description: "You are not allowed to access this resource." })
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	@UseInterceptors(
		FileFieldsInterceptor(
			[
				{ name: "profile_pic", maxCount: 1 }
			],
			{
				storage: diskStorage({
					destination: "./assets/profile",
					filename: editFileName,
				}),
				fileFilter: imageFileFilter,
				limits: { fileSize: 2097152 }
			},
		),
	)
	async updateUser(
		@Body(ValidationPipe) updateUserDto: UpdateUserDto,
		@Param('id') user_id: string,
		@GetUser() user: User,
		@UploadedFiles() files: ProfilePicDto,
		@Req() req,
	): Promise<User> {
		if (req.fileValidationError) {
			throw new BadRequestException(`${req.fileValidationError}`);
		}
		const adminId = user.userId;
		return await this.userService.updateUser(updateUserDto, user_id, files, adminId);
	}



	@Delete(':id')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "Delete user by admin" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({ status: 403, description: "You are not allowed to access this resource." })
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async deleteUser(
		@Param('id') user_id: string,
		@GetUser() user: User
	) {
		const adminId = user.userId;
		return await this.userService.deleteUser(user_id, adminId);
	}

	@Patch("active-deactive-user/:id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "Active-deactive user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async activeUser(@Param("id") user_id: string, @Body() activeDeactiveDto: ActiveDeactiveDto, @GetUser() user: User) {
		const adminId = user.userId;
		return await this.userService.activeDeactiveUser(user_id, activeDeactiveDto, adminId);
	}
	/**
	 * export Customer
	 */
	@Get('report/export')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "export customer" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async exportCustomer(@Query() paginationOption: ExportUserDto, @GetUser() user: User
	): Promise<{ data: User[] }> {

		const adminId = user.userId;
		return await this.userService.exportUser(adminId,paginationOption);
	}

	@Get('report/weekly-register')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "Count of register user in current week" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async weeklyRagisterUser(
	): Promise<any> {
		return await this.userService.weeklyRagisterUser();
	}



	@Get('report/counts')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "get-counts Of all user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async getCount(
	): Promise<{ result: any }> {

		return await this.userService.getCounts();
	}

	@Post("report/import")
	@ApiConsumes("multipart/form-data")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "import user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	@UseInterceptors(
		FileFieldsInterceptor(
			[
				{ name: "file", maxCount: 1 }
			],
			{
				storage: diskStorage({
					destination: "./assets/otherfiles",
					filename: editFileName,
				}),
				fileFilter: csvFileFilter
			},
		),
	)
	@HttpCode(200)
	async importUser(
		@Body() importUserDto: ImportUserDto,
		@UploadedFiles() files: csvFileDto,
		@Req() req,
		@GetUser() user: User,
		@SiteUrl() siteUrl: string,
	) {
		if (req.fileValidationError) {
			throw new BadRequestException(`${req.fileValidationError}`);
		}
		if (typeof files.file[0] == "undefined") {
			throw new NotFoundException(`file is not available&&&file`);
		}
		const userId = user.userId;
		const file = files.file;

		return await this.userService.importUser(importUserDto, file, userId, siteUrl)
	}

	@Get('delete-account-requests/list')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({ summary: "list all delete account requests" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async listDeleteRequest(
		@Query() dto: ListDeleteRequestDto
	) {
		console.log(dto);

		return await this.userService.listDeleteRequest(dto);
	}

	@Patch('delete-account-request/reject/:request_id')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({ summary: "list all delete account requests" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async rejectRequest(
		@GetUser() user: User,
		@Param('request_id') id: number
	) {
		return await this.userService.deleteRequestReject(id, user);
	}


	@Patch('delete-account-request/approve/:request_id')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({ summary: "list all delete account requests" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async approveRequest(
		@GetUser() user: User,
		@Param('request_id') id: number
	) {
		return await this.userService.deleteRequestAccept(id, user);
	}


	@Get('filter-options/first-name')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "list all first name of user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async getFirstName() {
		return await this.userService.getUserFirstName();
	}

	@Get('filter-options/last-name')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "list all last name of user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async getlastName() {
		return await this.userService.getUserLastName();
	}

	@Get('filter-options/email')
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
	@ApiOperation({ summary: "list all email of user" })
	@ApiResponse({ status: 200, description: "Api success" })
	@ApiResponse({ status: 422, description: "Bad Request or API error message" })
	@ApiResponse({
		status: 403,
		description: "You are not allowed to access this resource.",
	})
	@ApiResponse({ status: 404, description: "User not found!" })
	@ApiResponse({ status: 500, description: "Internal server error!" })
	async getemails() {
		return await this.userService.getUserEmail();
	}
}
