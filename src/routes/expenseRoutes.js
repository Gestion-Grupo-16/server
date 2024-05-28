import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";
import { modifyDebt } from "../routes/debtsRoutes.js";
import { Expense,Categories,Currencies } from "../models/Expense.js";
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
    const { group_id } = req.params;
    const { total_spent, category, currency, participants  } = req.body;
    
    let spent = 0;
    let paid = 0;
    let creditors = [];
    let debtors = [];

    for (const participant of participants) {
        spent += participant.spent;
        paid += participant.paid;

        if (participant.spent > participant.paid) {
            
            let newParticipant = participant;
            newParticipant.spent = newParticipant.spent - newParticipant.paid;
            newParticipant.paid = 0;
            debtors.push(newParticipant);
        }
        else if (participant.spent < participant.paid) {

            let newParticipant = participant;
            newParticipant.paid = newParticipant.paid - newParticipant.spent;
            newParticipant.spent = 0;
            creditors.push(newParticipant);
        }
    };
    console.log(debtors);
    console.log(creditors);

    if (spent !== total_spent || paid !== total_spent) {
        return res.status(400).json({ errors: [{ msg: 'El total gastado y el total pagado tienen que ser iguales a la suma de los gastos individuales' }] });
    }
    
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }
    const validCategory = Categories.includes(category);
    if (!validCategory) {
        return res.status(400).json({ errors: [{ msg: 'Categoria invalida' }] });
    }
    const expense = await Expense.create({ group_id, total_spent, category, currency });

    var individualExpenses = [];

    for (const participant of participants) {
        if (!participant.hasOwnProperty('user_id') || !participant.hasOwnProperty('spent') || !participant.hasOwnProperty('paid')) {
            return res.status(400).json({ errors: [{ msg: 'Participante invalido: se requieren los campos user_id, spent o paid' }] });
        }
        const validParticipant = await GroupMember.findOne({ where: { user_id: participant['user_id'], group_id: group_id } });
        if (!validParticipant) {
            for (const createdIndividualExpenses of individualExpenses) {
                await createdIndividualExpenses.destroy();
            }
            await expense.destroy();
            return res.status(400).json({ errors: [{ msg: 'Participante invalido: El usuario no pertenece al grupo' }] });
        }
        const individualExpense = await IndividualExpense.create({ expense_id: expense.id, user_id: participant['user_id'], group_id: group_id, total_spent: participant['spent'], total_paid: participant['paid'] });
        individualExpenses.push(individualExpense);
    }
    // Modificar la deuda entre los dos usuarios pertenecientes a la individual expense
    for (const creditor of creditors) {
        
        if (creditor.paid  > 0) { 
            for (const debtor of debtors) {
                if (debtor.spent > 0){
                    if (debtor.spent < creditor.paid) {                        
                        creditor.paid = creditor.paid - debtor.spent;
                        modifyDebt(group_id, debtor.user_id, creditor.user_id, debtor.spent);
                        debtor.spent = 0;
                    }                                         
                    else if (debtor.spent > creditor.paid){
                        debtor.spent = debtor.spent - creditor.paid;
                        modifyDebt(group_id, debtor.user_id, creditor.user_id, creditor.paid);
                        creditor.paid = 0;
                    }                     
                    else {
                        modifyDebt(group_id, debtor.user_id, creditor.user_id, debtor.spent);
                        debtor.spent = 0;
                        creditor.paid = 0;
                    }
                }
            }
        }
    } 

    return res.status(201).json({ id: expense.id, group_id: group_id, total_spent, category, currency, participants });
  });
  

expenseRoutes.get('/:group_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id } = req.params
    console.log(group_id)

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const validExpenses = await Expense.findAll({ where: { group_id: group_id}})
    if (!validExpenses) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no tiene gastos' }] })
    }

    return res.status(200).json(validExpenses);
});

expenseRoutes.get('/individual/:group_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id } = req.params
    console.log(group_id)

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const validIndividualExpenses = await IndividualExpense.findAll({ where: { group_id: group_id}})
    if (!validIndividualExpenses) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no tiene gastos individuales' }] })
    } 

    for (const individualExpense of validIndividualExpenses) {
        const user = await User.findOne({ where: { id: individualExpense.user_id } });
        individualExpense.dataValues.user = user;
    }
    
    console.log(validIndividualExpenses);

    return res.status(200).json(validIndividualExpenses);
});


expenseRoutes.get('/balance/:group_id', async (req, res) => {
    const { group_id } = req.params
    
    const group = await Group.findOne({ where: { id: group_id } });
    
    if(!group){
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    const expenses = await IndividualExpense.findAll({ where: { group_id: group_id }});
    
    if (!expenses) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no tiene gastos individuales' }] })
    }
    
    const group_members = await GroupMember.findAll({ 
        where: { group_id: group_id },
        include: [{
            model: User,
            attributes: ['id', 'username', 'email']
        }]
    });
    
    let members = {};
    
    for(const member of group_members){
        // console.log(member);    
        const user = member.user;
        console.log("User:",user);
        members[user.id] = {
            username: user.username,
            email: user.email,
            balance: 0
        };
    }
    // return res.status(200).json({ members});
    let total_debt = 0;
    
    for (const expense of expenses){                
        members[expense.user_id]["balance"] += expense.total_paid - expense.total_spent;
    }
    
    for (const member in members){
        if(members[member] < 0){
            total_debt += members[member];
        }        
    }
    members = Object.entries(members).map(([id, content]) => ({id, ...content}))
    return res.status(200).json({"total_debt":total_debt, members});

});


expenseRoutes.get('/options/categories', async (req, res) => {
    return res.status(200).json(Categories);
});

expenseRoutes.get('/options/currencies', async (req, res) => {
    return res.status(200).json(Currencies);
});



export default expenseRoutes;