// Library
import {
  prop,
  Ref,
  Typegoose,
  arrayProp,
} from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";
import { Image } from "../image";
import { Address } from "../address";
import { Floor } from "./floor";

export class MotelRoom extends Basic {
  @prop()
  name: string;

  @prop()
  contactPhone: string;

  @prop({ ref: User })
  owner: Ref<User>;

  @arrayProp({ itemsRef: Image, default: [] })
  images: Ref<Image>[];

  // @prop()
  // images: string;

  @prop({ ref: Address })
  address: Ref<Address>;

  @prop({ default: 0 })
  roomAcreage: number;

  @prop({ default: 0 })
  totalFloor: number;

  @prop({ default: 0 })
  totalRoom: number;

  @prop({ default: 0 })
  availableRoom: number;

  @prop({ default: 0 })
  rentedRoom: number;

  @prop({ default: 0 })
  depositedRoom: number;

  @prop({ default: 0 })
  price: number;

  @prop({ default: 0 })
  minPrice: number;

  @prop({ default: 0 })
  maxPrice: number;

  @prop({ default: 0 })
  electricityPrice: number;

  @prop({ default: 0 })
  waterPrice: number;

  @prop({ default: 0 })
  garbagePrice: number;

  @prop({ default: 0 })
  wifiPrice: number;

  @prop()
  description?: string;

  @prop({ default: [] })
  utilities: string[];

  @arrayProp({ itemsRef: Floor, default: [] })
  floors: Ref<Floor>[];

  @prop({ default: false })
  isCompleted: boolean;
}

export const MotelRoomModel = (connection) => {
  return new MotelRoom().getModelForClass(MotelRoom, {
    existingConnection: connection,
    schemaOptions: {
      collection: "motelRooms",
      timestamps: true,
    },
  });
};
