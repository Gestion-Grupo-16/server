import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Categories = [
  "Comida",
  "Transporte",
  "Salud",
  "Educación",
  "Entretenimiento",
  "Servicios",
  "Otros",
];

export const Currencies = [
  "USD",
  "EUR",
  "ARS",
  "BTC",
  "ETH",
  "USDT",
  "DAI",
]

export const Expense = sequelize.define(
  "expenses",
  {
    id : {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id : {
      type: DataTypes.INTEGER,
      foreignKey: true,
    },
    total_spent : {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [Categories],  
      },
    },
    currency : {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false },
)