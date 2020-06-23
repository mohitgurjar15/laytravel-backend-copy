import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Flight } from "./flight.entity";

//@Index("seat_plan_pk", ["id"], { unique: true })
@Entity("seat_plan")
export class SeatPlan extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "row_no" })
  rowNo: number;

  @Column("character varying", { name: "seat_label", length: 20 })
  seatLabel: string;

  @Column("boolean", { name: "is_window", default: () => "false" })
  isWindow: boolean;

  @Column("boolean", { name: "is_enabled", default: () => "true" })
  isEnabled: boolean;

  @ManyToOne(
    () => Flight,
    flight => flight.seatPlans
  )
  @JoinColumn([{ name: "flight_id", referencedColumnName: "id" }])
  flight: Flight;
}
