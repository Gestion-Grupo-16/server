import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";

import {IndividualExpense} from "../models/IndividualExpense.js";
import {Debts} from "../models/Debts.js";

const debtsRoutes = express.Router();

const validateNewDebts = [
    param('group_id')
        .notEmpty()
        .withMessage('Group id is required')
        .bail()
        .isInt()
        .withMessage('Group id must be an integer')
        .bail(),
    body("debtor_id")
        .notEmpty()
        .withMessage("Debtor id is required")
        .bail(),    
    body("creditor_id")
        .notEmpty()
        .withMessage("Creditor id is required")
        .bail(),    
    body('amount_owed')
        .notEmpty()
        .withMessage('Amount owed is required')
        .bail()
        .isFloat()
        .withMessage('Amount owed must be a float')
        .bail()
];


// Mover esta logica a cuando se acepta una Invitacion
async function createDebts(group_id, new_group_member){
    
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        throw new Error('El grupo no existe');
    }

    const group_members = await GroupMember.findAll({ where: { group_id, pending: false } });
    if (!group_members || group_members.length === 0) {
        throw new Error('El grupo no tiene usuarios');
    }

    for (const group_member of group_members) {
        const { user_id } = group_member;

        if (user_id != new_group_member) {
            await Debts.create({ group_id, debtor_id: new_group_member, creditor_id: user_id, amount_owed: 0 });
        }
    }

    return;
}

  
// Mover o usar esto cuando se crea un gasto
async function modifyDebt(group_id, debtor_id, creditor_id, amount_owed){

    console.log("\n" + " modifyDebt | group_id : " + group_id + " | debtor : " + debtor_id + " | creditor : " + creditor_id + " | amount_owed : " + amount_owed + "\n" );

    let validGroup = null;
    try {
        console.log("valid group");
        
        validGroup = await Group.findOne({ where: { id: group_id } });
        console.log("0");
    }         
    catch (e) {
        console.log("invalid group!!!!!!!!");
        throw new Error('El grupo no existe');
    }


    // if (!validGroup) {
    //     console.log("invalid group!!!!!!!!");
    //     throw new Error('El grupo no existe');
    // }

    console.log("1");

    const validDebtor = await GroupMember.findOne({ where: { group_id, user_id: debtor_id } });
    if (!validDebtor) {
        throw new Error('El deudor no pertenece a este grupo');
    }

    console.log("2");

    const validCreditor = await GroupMember.findOne({ where: { group_id, user_id: creditor_id } });
    if (!validCreditor) {
        throw new Error('Acreedor no pertenece a este grupo');
    }

    console.log("3");

    const updatedDebt = await Debts.findOne({ where: { group_id, debtor_id, creditor_id } });
    if (!updatedDebt) {

        console.log("4");

        const updatedDebt = await Debts.findOne({ where: { group_id, debtor_id: creditor_id, creditor_id: debtor_id } });
        console.log("\n");
        console.log("current debt", updatedDebt);
        console.log("\n");
        if (!updatedDebt) {
            throw new Error('Error actualizando deuda');
        }

        // El que debe, antes le debían (hay que hacer el balance y ver si dar vuelta los roles o no)
        else{
            console.log("5");

            const balance = updatedDebt.amount_owed - amount_owed;

            if(balance > 0){

                console.log("6");

                updatedDebt.amount_owed = balance;
                try {
                    await updatedDebt.save();
                    console.log("\n");
                    console.log("update debt", updatedDebt);
                    console.log("\n");
                    return;
                }
                catch (e) {
                    throw new Error('Error actualizando deuda');
                }    
                         
            }
            else{

                console.log("7");

                try {                    
                    await updatedDebt.destroy();
                    const debt = await Debts.create({ group_id, debtor_id: creditor_id, creditor_id: debtor_id, amount_owed: Math.abs(balance) });
                    if(!debt){
                        throw new Error('Error creando nueva deuda');
                    }
                }
                catch (e) {
                    throw new Error('Error actualizando deuda');
                } 

                console.log("\n");
                console.log("update debt", updatedDebt);
                console.log("\n");

                // console.log("creditor nuevo : " +  creditor_id + "\n debtor nuevo : " + debtor_id);                
                // updatedDebt.debtor_id = debtor_id.toString();
                // updatedDebt.creditor_id = creditor_id.toString();
                
                // console.log("Nuevo debt:");
                // console.log(updatedDebt);
                
                return;

            }
        }
    }
    // El que debe, ya estaba debiendo (sumar las deudas y dejarlo como esta)
    else{
        console.log("\n");
        console.log("current debt", updatedDebt);
        console.log("\n");

        updatedDebt.amount_owed += amount_owed;

        try {
            await updatedDebt.save();
            console.log("\n");
            console.log("update debt", updatedDebt);
            console.log("\n");
            return;
        }
        catch (e) {
            throw new Error('Error actualizando deuda');
        } 
    }
}

export default debtsRoutes;
export { createDebts,  modifyDebt};


// Actualmente : 
//   - debtor_id = 1
//   - creditor_id = 2
//   - amount_owed = 50

// Se ingresa : 
//   - debtor_id = 2
//   - creditor_id = 1
//   - amount_owed = 150

// Resultado :
//   - debtor_id = 2
//   - creditor_id = 1
//   - amount_owed = 100

// -------------------------------

// Actualmente : 
//   - creditor_id = 1
//   - debtor_id = 2
//   - amount_owed = 50

// balance = 50 - 150 = -100

// Se ingresa : 
//   - debtor_id = 2
//   - creditor_id = 1
//   - amount_owed = 150
