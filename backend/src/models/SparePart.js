import mongoose from "mongoose";

const sparePartSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  code:     { type: String, required: true, unique: true },
  category: { type: String, required: true },

  quantity:    { type: Number, default: 0 },
  minQuantity: { type: Number, default: 5 },  
  unit:        { type: String, default: "cái" },
  unitPrice:   { type: Number, default: 0 },

  supplier: { type: String, default: "" },
  notes:    { type: String, default: "" }

}, { timestamps: true, versionKey: false });

export default mongoose.model("spareparts", sparePartSchema);