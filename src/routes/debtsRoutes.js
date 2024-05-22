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
debtsRoutes.post('/:group_id/:new_group_member', validateNewDebts, async (req, res) => {
    
    const { group_id, new_group_member } = req.params
    
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const group_members = await GroupMember.findAll({ 
        where: { group_id} 
    });  
        
    if (!group_members) {
      return res.status(404).send({ error: "Group has no users" });
    }

    for (const group_member of group_members) {
        const { user_id } = group_member;

        if (user_id != new_group_member) {

            const newDebt = await Debts.create({ group_id, debtor_id: new_group_member, creditor_id: user_id, amount_owed: 0 });
            if (!newDebt) {
                return res.status(500).send({ error: "Error while creating a new debt" });
            }
        }
    }

    return res.status(201).json({ group_id: group_id, debtor_id: new_group_member, creditor_id: group_members.map(group_member => group_member.user_id), amount_owed: 0 });
});
  
// Mover o usar esto cuando se crea un gasto
debtsRoutes.patch('/:group_id', validateNewDebts, async (req, res) => {

    const { group_id } = req.params
    const { debtor_id, creditor_id, amount_owed } = req.body

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const validDebtor = await GroupMember.findOne({ where: { group_id, user_id: debtor_id } })
    if (!validDebtor) {
        return res.status(400).json({ errors: [{ msg: 'Debtor does not belong to this group' }] })
    }

    const validCreditor = await GroupMember.findOne({ where: { group_id, user_id: creditor_id } })
    if (!validCreditor) {
        return res.status(400).json({ errors: [{ msg: 'Creditor does not belong to this group' }] })
    }

    const updatedDebt = await Debts.findOne({ where: { group_id, debtor_id, creditor_id } })
    if (!updatedDebt) {

        const updatedDebt = await Debts.findOne({ where: { group_id, debtor_id: creditor_id, creditor_id: debtor_id } })
        console.log("Deuda actual : \n");
        console.log(updatedDebt);
        console.log("\n");
        console.log("Debtor : " + creditor_id + "\n");
        console.log("Creditor : " + debtor_id + "\n");
        if (!updatedDebt) {
            return res.status(500).send({ error: "Error while updating the debt" });
        }
        // El que debe, antes le debían (hay que hacer el balance y ver si dar vuelta los roles o no)
        else{
            const balance = updatedDebt.amount_owed - amount_owed;
            console.log(balance);

            if(balance > 0){

                console.log("balance > 0")

                updatedDebt.amount_owed = balance;
                try {
                    await updatedDebt.save();
                    return res.status(200).send({ message: "Debt updated successfully" });
                }
                catch (e) {
                    return res.status(500).send({ error: "Error while updating debt" });
                }             }
            else{

                console.log("balance < 0")
                // updatedDebt.amount_owed = Math.abs(balance);
                const debt = await Debts.create({ group_id, debtor_id: creditor_id, creditor_id: debtor_id, amount_owed: Math.abs(balance) });
                
                if(!debt){
                    return res.status(500).send({ error: "Error while creating a new debt" });
                }

                // console.log("creditor nuevo : " +  creditor_id + "\n debtor nuevo : " + debtor_id);                
                // updatedDebt.debtor_id = debtor_id.toString();
                // updatedDebt.creditor_id = creditor_id.toString();
                
                console.log("Nuevo debt:");
                // console.log(updatedDebt);
                
                try {                    
                    await updatedDebt.delete();
                    return res.status(200).send({ message: "Debt updated successfully" });
                }
                catch (e) {
                    await debt.delete();
                    return res.status(500).send({ error: "Error while updating debt" });
                } 

            }
        }
    }
    // El que debe, ya estaba debiendo (sumar las deudas y dejarlo como esta)
    else{
        updatedDebt.amount_owed += amount_owed;

        try {
            await updatedDebt.save();
            return res.status(200).send({ message: "Debt updated successfully" });
        }
        catch (e) {
            return res.status(500).send({ error: "Error while updating debt" });
        } 
    }
});

export default debtsRoutes;


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
