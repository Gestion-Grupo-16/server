import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";
import { Expense,Categories } from "../models/Expense.js";
import {IndividualExpense} from "../models/IndividualExpense.js";


const expenseRoutes = express.Router();

const validateNewExpense = [
    param('group_id')
        .notEmpty()
        .withMessage('Group id is required')
        .bail()
        .isInt()
        .withMessage('Group id must be an integer')
        .bail(),
    body('total_spent')
        .notEmpty()
        .withMessage('Total spent is required')
        .bail()
        .isFloat()
        .withMessage('Total spent must be a float')
        .bail(),
    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .bail()
        .isString()
        .withMessage('Category must be a string')
        .bail(),
    body('currency')
        .notEmpty()
        .withMessage('Currency is required')
        .bail()
        .isString()
        .withMessage('Currency must be a string')
        .bail(),
    body('participants')
        .notEmpty()
        .withMessage('Participants are required')
        .bail()
        .isArray()
        .withMessage('Participants must be an array')
        .bail()
];
const validateGetGroupExpenses = [
    param("group_id")
    .notEmpty()
    .withMessage("Group id is required")
    .bail()
    .isInt()
    .withMessage("Group id must be an integer")
    .bail()
];

expenseRoutes.post('/:group_id', validateNewExpense, async (req, res) => {
    const { group_id } = req.params
    const { total_spent, category, currency, participants  } = req.body
    console.log(group_id)
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }
    const validCategory = Categories.includes(category)
    if (!validCategory) {
        return res.status(400).json({ errors: [{ msg: 'Invalid category' }] })
    }
    const expense = await Expense.create({ group_id, total_spent, category, currency });

    var individualExpenses = []

    for (const participant of participants) {
        if (!participant.hasOwnProperty('user_id') || !participant.hasOwnProperty('spent') || !participant.hasOwnProperty('paid')) {
            return res.status(400).json({ errors: [{ msg: 'Invalid participant: user_id or spent or paid  is required' }] });
        }
        console.log(participant)
        const validParticipant = await GroupMember.findOne({ where: { user_id: participant['user_id'], group_id: group_id } })
        if (!validParticipant) {
            console.log('Invalid participant!!!!');
            for (const createdIndividualExpenses of individualExpenses) {
                await createdIndividualExpenses.destroy();
            }
            await expense.destroy();
            return res.status(400).json({ errors: [{ msg: 'Invalid participant: user does not belong to group' }] });
        }
        const individualExpense = await IndividualExpense.create({ expense_id: expense.id, user_id: participant['user_id'], group_id: group_id, total_spent: participant['spent'], total_paid: participant['paid'] });
        individualExpenses.push(individualExpense);
    }
    return res.status(201).json({ id: expense.id, group_id: group_id, total_spent, category, currency, participants });
  });
  

expenseRoutes.get('/:group_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id } = req.params
    console.log(group_id)

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const validExpenses = await Expense.findAll({ where: { group_id: group_id}})
    if (!validExpenses) {
        return res.status(400).json({ errors: [{ msg: 'The group has no expenses' }] })
    }

    return res.status(200).json(validExpenses);
});

expenseRoutes.get('/individual/:group_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id } = req.params
    console.log(group_id)

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const validIndividualExpenses = await IndividualExpense.findAll({ where: { group_id: group_id}})
    if (!validIndividualExpenses) {
        return res.status(400).json({ errors: [{ msg: 'The group has no individual expenses' }] })
    } 

    for (const individualExpense of validIndividualExpenses) {
        const user = await User.findOne({ where: { id: individualExpense.user_id } });
        individualExpense.dataValues.user = user;
    }
    
    console.log(validIndividualExpenses);

    return res.status(200).json(validIndividualExpenses);
});



export default expenseRoutes;