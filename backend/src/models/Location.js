import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["room", "lobby", "restaurant", "pool", "gym", "elevator", "other"],
      default: "room",
    },
    floor: { type: Number, default: null },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "maintenance"],
      default: "active",
    },
  },
  { versionKey: false }
);

export default mongoose.model("locations", locationSchema);
