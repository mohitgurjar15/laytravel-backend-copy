import {
    BaseEntity,
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn
} from "typeorm";
import { LaytripCategory } from "./laytrip-category.entity";
import { User } from "./user.entity";

@Entity("flight_route")
export class FlightRoute extends BaseEntity {
    @PrimaryGeneratedColumn({ type: "integer", name: "id" })
    id: number;

    @Column("integer", { name: "parent_id", nullable: true })
    parentBy: number;

    @Column("integer", { name: "category_id"})
    categoryId: number;

    @Column("character varying", { name: "from_airport_code" })
    fromAirportCode: string;

    @Column("character varying", { name: "from_airport_name" })
    fromAirportName: string;

    @Column("character varying", { name: "from_airport_city " })
    fromAirportCity : string;

    @Column("character varying", { name: "from_airport_country" })
    fromAirportCountry: string;

    @Column("character varying", { name: "to_airport_code" })
    toAirportCode: string;

    @Column("character varying", { name: "to_airport_name" })
    toAirportName: string;

    @Column("character varying", { name: "to_airport_city " })
    toAirportCity : string;

    @Column("character varying", { name: "to_airport_country" })
    toAirportCountry: string;

    @Column("uuid", { name: "create_by", nullable: true })
    createBy: string;

    @Column("integer", { name: "installment_available_after", nullable: true })
    installmentAvailableAfter: number;

    @Column("uuid", { name: "update_by", nullable: true })
    updateBy: string;

    @Column("timestamp without time zone", { name: "create_date" })
    createDate: Date;

    @Column("boolean", { name: "status", default: () => "false" })
    status: boolean;

    @Column("boolean", { name: "is_deleted", default: () => "false" })
    isDeleted: boolean;

    @Column("timestamp without time zone", { name: "update_date" })
    updateDate: Date;

    @ManyToOne(
        () => FlightRoute,
        flightRoute => flightRoute.childRoute
    )
    @JoinColumn([{ name: "parent_id", referencedColumnName: "id" }])
    parentRoute: FlightRoute;

    @ManyToOne(
        () => LaytripCategory,
        laytripCategory => laytripCategory.flightRoutes
    )
    @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
    category: FlightRoute;

    @OneToMany(
        () => FlightRoute,
        flightRoute => flightRoute.parentRoute
    )
    childRoute: FlightRoute[];

    @ManyToOne(
        () => User,
        user => user.createdLaytripCategory
    )
    @JoinColumn([{ name: "create_by", referencedColumnName: "userId" }])
    createByUser: User;

    @ManyToOne(
        () => User,
        user => user.updatedLaytripCategory
    )
    @JoinColumn([{ name: "update_by", referencedColumnName: "userId" }])
    updateByUser: User;
}
