import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";
import { modifyDebt } from "../routes/debtsRoutes.js";
import { Expense,Categories,Currencies } from "../models/Expense.js";
import {IndividualExpense} from "../models/IndividualExpense.js";
import { Debts } from "../models/Debts.js";

import { Op } from "sequelize";

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

const validatePayDebts = [
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
    param("creditor_id")
        .notEmpty()
        .withMessage("Creditor id is required")
        .bail(),
];

expenseRoutes.post('/:group_id', validateNewExpense, async (req, res) => {
    const { group_id } = req.params;
    const { total_spent, category, currency, participants  } = req.body;
    
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    var cumulative_total_spent = 0;
    const validExpenses = await Expense.findAll({ where: { group_id: group_id } });
    for (const valExpenses of validExpenses) {
        cumulative_total_spent += valExpenses.total_spent;
    }

    if ((cumulative_total_spent + total_spent) > validGroup.budget){
        return res.status(403).send({ error: "Error: el nuevo gasto excede el presupuesto" });
    }
    
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

expenseRoutes.get('/debts/:group_id/:user_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id, user_id } = req.params

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const validUser = await User.findOne({ where: { id: user_id } })
    if (!validUser) {
        return res.status(400).json({ errors: [{ msg: 'El usuario no existe' }] })
    }

    const validGroupMember = await GroupMember.findOne({ where: { group_id, user_id } });
    if (!validGroupMember) {
        throw new Error('El usuario no pertenece a este grupo');
    }

    const validDebts = await Debts.findAll({
    where: {
        group_id: group_id,
        [Op.or]: [
        { debtor_id: user_id },
        { creditor_id: user_id }
        ]
    }
    });

    if (!validDebts) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no tiene gastos' }] })
    }

    return res.status(200).json(validDebts);
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

    const debts = await Debts.findAll({ where: { group_id: group_id }});

    if (!debts) {
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

    for (const debt of debts){
        members[debt.debtor_id]["balance"] -= debt.amount_owed;
        members[debt.creditor_id]["balance"] += debt.amount_owed;
    }

    let total_debt = 0;
    
    for (const member in members){
        if(members[member]["balance"] < 0){
            total_debt += members[member]["balance"];
        }        
    }
    members = Object.entries(members).map(([id, content]) => ({id, ...content}))
    return res.status(200).json({"total_debt":total_debt, members});
});

expenseRoutes.patch('/debts/:group_id/:creditor_id', validatePayDebts, async (req, res) => {

    const { group_id, creditor_id } = req.params
    const { debtor_id } = req.body

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const validDebtor = await GroupMember.findOne({ where: { group_id, user_id: debtor_id } })
    if (!validDebtor) {
        return res.status(400).json({ errors: [{ msg: 'El deudor no pertenece a este grupo' }] })
    }

    const validCreditor = await GroupMember.findOne({ where: { group_id, user_id: creditor_id } })
    if (!validCreditor) {
        return res.status(400).json({ errors: [{ msg: 'El acreedor no pertenece a este grupo' }] })
    }

    const updatedDebt = await Debts.findOne({ where: { group_id, debtor_id, creditor_id } })
    if (!updatedDebt) {
        return res.status(500).send({ error: "Error encontrando deuda" });
    }
    if (updatedDebt.amount_owed === 0 || updatedDebt.amount_owed < 0) {
        return res.status(400).send({ error: "No hay deuda que pagar" });
    }

    updatedDebt.amount_owed = 0;

    try {
        await updatedDebt.save();
        return res.status(200).send({ message: "Deuda pagada exitosamente" });
    }
    catch (e) {
        return res.status(500).send({ error: "Error pagando deuda" });
    }
}
);

expenseRoutes.get('/options/categories', async (req, res) => {
    return res.status(200).json(Categories);
});

expenseRoutes.get('/options/currencies', async (req, res) => {
    return res.status(200).json(Currencies);
});
expenseRoutes.put('/:group_id/categories', async (req, res) => {
    const { categories } = req.body;
    const { group_id } = req.params;
    let total_spent = 0;
    let arrayExpenses = [];

    try {
        for (const category of categories) {

            if (!Categories.includes(category)) {
                return res.status(400).json({ errors: [{ msg: 'Categoría inexistente' }] });
            }

            const validExpenses = await Expense.findAll({ where: { category: category, group_id: group_id } });
            for (const valExpenses of validExpenses) {
                total_spent += valExpenses.total_spent;
                arrayExpenses = arrayExpenses.concat(valExpenses);
            }
        }
    } catch (error) {
        return res.status(400).json({ errors: [{ msg: 'Error al buscar gastos por categorías' }] });
    }

    return res.status(200).json({ total_spent, arrayExpenses });
});



export default expenseRoutes;