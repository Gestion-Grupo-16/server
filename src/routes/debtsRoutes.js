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
  

// expenseRoutes.get('/:group_id', validateGetGroupExpenses, async (req, res) => {
//     const { group_id } = req.params
//     console.log(group_id)

//     const validGroup = await Group.findOne({ where: { id: group_id } })
//     if (!validGroup) {
//         return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
//     }

//     const validExpenses = await Expense.findAll({ where: { group_id: group_id}})
//     if (!validExpenses) {
//         return res.status(400).json({ errors: [{ msg: 'The group has no expenses' }] })
//     }

//     return res.status(200).json(validExpenses);
// });

// expenseRoutes.get('/individual/:group_id', validateGetGroupExpenses, async (req, res) => {
//     const { group_id } = req.params
//     console.log(group_id)

//     const validGroup = await Group.findOne({ where: { id: group_id } })
//     if (!validGroup) {
//         return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
//     }

//     const validIndividualExpenses = await IndividualExpense.findAll({ where: { group_id: group_id}})
//     if (!validIndividualExpenses) {
//         return res.status(400).json({ errors: [{ msg: 'The group has no individual expenses' }] })
//     }

//     return res.status(200).json(validIndividualExpenses);
// });


export default debtsRoutes;