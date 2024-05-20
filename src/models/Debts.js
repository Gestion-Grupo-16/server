import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Debts = sequelize.define(
  "debts",
  {
    group_id : {
      type: DataTypes.INTEGER,
      primaryKey: true,
      foreignKey: true,
    },
    debtor_id : {
      type: DataTypes.STRING,
      primaryKey: true,
      foreignKey: true,
    },
    creditor_id : {
      type: DataTypes.STRING,
      primaryKey: true,
      foreignKey: true,
    },
    amount_owed : {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  { timestamps: false },
)