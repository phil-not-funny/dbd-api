import { Schema, model } from "mongoose";

export interface IPerk {
  name: string;
  url: string | null;
  icon: string | null;
  description: string;
}

export interface ICharacterBase {
  name: string;
  url: string;
  icon: string | null;
  perks: IPerk[];
}

export interface IKiller extends ICharacterBase {
  power: string | null;
  powerIcon: string | null;
}

export type ISurvivor = ICharacterBase;

const PerkSchema = new Schema<IPerk>({
  name: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  icon: { type: String },
  description: { type: String },
});

export const Perk = model("Perk", PerkSchema);

// Schema for Killer
const KillerSchema = new Schema<IKiller>({
  name: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  icon: { type: String },
  power: { type: String, required: true },
  powerIcon: { type: String },
  perks: [{ type: PerkSchema }],
});

export const Killer = model("Killer", KillerSchema);

// Schema for Survivor
const SurvivorSchema = new Schema<ISurvivor>({
  name: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  icon: { type: String },
  perks: [{ type: PerkSchema }],
});

export const Survivor = model("Survivor", SurvivorSchema);
