import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";
import { modifyDebt } from "../routes/debtsRoutes.js";
import { Expense,Categories,Currencies } from "../models/Expense.js";
import {IndividualExpense} from "../models/IndividualExpense.js";
import { Debts } from "../models/Debts.js";
import { Payment } from "../models/Payments.js";
import { sendNotifiaction } from "../notifications/notifications.js";
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
    body('description')
        .notEmpty()
        .withMessage('Expsnse description is required')
        .bail()
        .isString()
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

const validatePatchGroupExpenses = [
    param('group_id')
        .notEmpty()
        .withMessage('Group id is required')
        .bail()
        .isInt()
        .withMessage('Group id must be an integer')
        .bail(),
    param('description')
        .notEmpty()
        .withMessage('Expsnse description is required')
        .bail()
        .isString()
        .withMessage('Group id must be an integer')
        .bail(),
    param('expense_id')
        .notEmpty()
        .withMessage('Expense id is required')
        .bail()
        .isInt()
        .withMessage('Expense id must be an integer')
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
]

expenseRoutes.post('/:group_id', validateNewExpense, async (req, res) => {
    const { group_id } = req.params;
    const {description, total_spent, category, currency, participants  } = req.body;
    
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    var cumulative_total_spent = 0;
    const validExpenses = await Expense.findAll({ where: { group_id: group_id } });
    for (const valExpenses of validExpenses) {
        cumulative_total_spent += valExpenses.total_spent;
    }

    if ((cumulative_total_spent + total_spent) > validGroup.budget * 0.9 && validGroup.budget > 0){
        sendNotifiaction(group_id, `El grupo ha gastado más del 90% de su presupuesto.\n     - Presupuesto actual: ${validGroup.budget}\n     - Gasto actual: ${cumulative_total_spent + total_spent}`);
    }

    if (validGroup.budget > 0 && (cumulative_total_spent + total_spent) > validGroup.budget){                
        return res.status(403).send({ error: "Error: el nuevo gasto excede el presupuesto" });
    }
    
    let spent = 0;
    let paid = 0;
    let creditors = [];
    let debtors = [];

    for (const participant of participants) {
        spent += participant.spent;
        paid += participant.paid;
    }

    if (spent !== total_spent || paid !== total_spent) {
        return res.status(400).json({ errors: [{ msg: 'El total gastado y el total pagado tienen que ser iguales a la suma de los gastos individuales' }] });
    }
    
    const validCategory = Categories.includes(category);
    if (!validCategory) {
        return res.status(400).json({ errors: [{ msg: 'Categoria invalida' }] });
    }
    const expense = await Expense.create({ group_id,description, total_spent, category, currency });

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
        // console.log("participant",participant);
        const individualExpense = await IndividualExpense.create({ expense_id: expense.id, user_id: participant['user_id'], group_id: group_id, total_spent: participant.spent, total_paid: participant.paid });
        individualExpenses.push(individualExpense);
    }
    for (const participant of participants) {
        spent += participant.spent;
        paid += participant.paid;
        // console.log("participant paid ",participant.paid);

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
    // Modificar la deuda entre los dos usuarios pertenecientes a la individual expense

    creditors.sort((a, b) => b.user_id - a.user_id);
    debtors.sort((a, b) => b.user_id - a.user_id);

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
    sendNotifiaction(group_id, `Se ha añadido un nuevo gasto \n - ${description} \n - Total gastado: ${total_spent} \n - Categoria: ${category} \n - Moneda: ${currency}`);


    return res.status(201).json({ id: expense.id, group_id: group_id, total_spent, category, currency, description, participants });
  });

expenseRoutes.put('/:group_id/:expense_id', validatePatchGroupExpenses, async (req, res) => {
    const { group_id, expense_id } = req.params;
    const { description,total_spent, category, currency, participants } = req.body;
    
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    const validExpense = await Expense.findOne({ where: { id: expense_id } });
    if (!validExpense) {
        return res.status(400).json({ errors: [{ msg: 'El gasto no existe' }] });
    }

    // Tenemos que chequear que el cambio que se hará dejará el grupo en un estado válido
    let users_total_spent = 0;
    let users_total_paid = 0;

    for (const participant of participants) {
        if (!participant.hasOwnProperty('user_id') || !participant.hasOwnProperty('spent') || !participant.hasOwnProperty('paid')) {
            return res.status(400).json({ errors: [{ msg: 'Participante invalido: se requieren los campos user_id, spent o paid' }] });
        }
        const validParticipant = await GroupMember.findOne({ where: { user_id: participant['user_id'], group_id: group_id } });
        if (!validParticipant) {
            return res.status(400).json({ errors: [{ msg: 'Participante invalido: El usuario no pertenece al grupo' }] });
        }
        users_total_spent += participant.spent;
        users_total_paid += participant.paid;
    }

    if (users_total_spent !== total_spent || users_total_paid !== total_spent) {
        return res.status(400).json({ errors: [{ msg: 'El total gastado y el total pagado tienen que ser iguales a la suma de los gastos individuales' }] });
    }

    if (validGroup.budget > 0 && (validGroup.total_spent + total_spent - validExpense.total_spent > validGroup.budget)) {
        return res.status(400).json({ errors: [{ msg: 'La modificación en el gasto hace que se exceda del presupuesto' }] });
    }

    const validCategory = Categories.includes(category);
    if (!validCategory) {
        return res.status(400).json({ errors: [{ msg: 'Categoria invalida' }] });
    }

    // Ahora tenemos que ver la manera en la que los viejos individual expenses afectaron a los diferentes usuarios y hacer la inversa
    const old_individual_expenses = await IndividualExpense.findAll({ where: { expense_id: expense_id } });
    var old_creditors = [];
    var old_debtors = [];
    
    for (const old_individual_expense of old_individual_expenses) {
        const user = {
            user_id: old_individual_expense.user_id,
            spent: old_individual_expense.total_spent,
            paid: old_individual_expense.total_paid
        }
        if (user.spent > user.paid) {
            user.spent = user.spent - user.paid;
            user.paid = 0;
            old_debtors.push(user);
        } else if (user.spent < user.paid) {
            user.paid = user.paid - user.spent;
            user.spent = 0;
            old_creditors.push(user);
        }
    }

    old_creditors.sort((a, b) => b.user_id - a.user_id);
    old_debtors.sort((a, b) => b.user_id - a.user_id);

    for (const old_creditor of old_creditors) {
        
        if (old_creditor.paid  > 0) { 
            for (const old_debtor of old_debtors) {
                if (old_debtor.spent > 0){
                    if (old_debtor.spent < old_creditor.paid) {                        
                        old_creditor.paid = old_creditor.paid - old_debtor.spent;
                        modifyDebt(group_id, old_creditor.user_id, old_debtor.user_id, old_debtor.spent);
                        old_debtor.spent = 0;
                    }                                         
                    else if (old_debtor.spent > old_creditor.paid){
                        old_debtor.spent = old_debtor.spent - old_creditor.paid;
                        modifyDebt(group_id, old_creditor.user_id, old_debtor.user_id, old_creditor.paid);
                        old_creditor.paid = 0;
                    }                     
                    else {
                        modifyDebt(group_id, old_creditor.user_id, old_debtor.user_id, old_debtor.spent);
                        old_debtor.spent = 0;
                        old_creditor.paid = 0;
                    }
                }
            }
        }
    }

    // Ahora que ya revertimos los efectos de la deuda y sabemos que la nueva será válida, borramos los individual expenses viejos
    for (const old_individual_expense of old_individual_expenses) {
        await old_individual_expense.destroy();
    }

    // Actualizamos el gasto total
    validExpense.total_spent = total_spent;

    // Actualizamos la categoría
    validExpense.category = category;

    // Actualizamos la moneda
    validExpense.currency = currency;


    // Actualizamos la descripcion
    validExpense.description = description;

    try {
        await validExpense.save();
    } catch (error) {
        return res.status(500).json({ errors: [{ msg: 'Error al actualizar el gasto' }] });
    }

    // Como antes ya chequeamos que los valores del nuevo gasto son de usuarios y montos válidos, podemos crear los nuevos individual expenses
    var new_creditors = [];
    var new_debtors = [];

    for (const participant of participants) {
        if (participant.spent > participant.paid) {
            let newParticipant = {...participant};
            newParticipant.spent = newParticipant.spent - newParticipant.paid;
            newParticipant.paid = 0;
            new_debtors.push(newParticipant);
        }
        else if (participant.spent < participant.paid) {
            let newParticipant = {...participant};
            newParticipant.paid = newParticipant.paid - newParticipant.spent;
            newParticipant.spent = 0;
            new_creditors.push(newParticipant);
        }
    };

    var new_individual_expenses = [];

    for (const participant of participants) {
        const individualExpense = await IndividualExpense.create({ expense_id: expense_id, user_id: participant['user_id'], group_id: group_id, total_spent: participant['spent'], total_paid: participant['paid'] });
        if (!individualExpense) {
            for (const createdIndividualExpense of new_individual_expenses) {
                await createdIndividualExpense.destroy();
            }
            return res.status(500).json({ errors: [{ msg: 'Error al crear gasto individual' }] });
        }
        new_individual_expenses.push(individualExpense);
    }

    new_creditors.sort((a, b) => b.user_id - a.user_id);
    new_debtors.sort((a, b) => b.user_id - a.user_id);

    for (const new_creditor of new_creditors) {
        
        if (new_creditor.paid  > 0) { 
            for (const new_debtor of new_debtors) {
                if (new_debtor.spent > 0){
                    if (new_debtor.spent < new_creditor.paid) {                        
                        new_creditor.paid = new_creditor.paid - new_debtor.spent;
                        modifyDebt(group_id, new_debtor.user_id, new_creditor.user_id, new_debtor.spent);
                        new_debtor.spent = 0;
                    }                                         
                    else if (new_debtor.spent > new_creditor.paid){
                        new_debtor.spent = new_debtor.spent - new_creditor.paid;
                        modifyDebt(group_id, new_debtor.user_id, new_creditor.user_id, new_creditor.paid);
                        new_creditor.paid = 0;
                    }                     
                    else {
                        modifyDebt(group_id, new_debtor.user_id, new_creditor.user_id, new_debtor.spent);
                        new_debtor.spent = 0;
                        new_creditor.paid = 0;
                    }
                }
            }
        }
    }
    
    sendNotifiaction(group_id, `Se modificó el gasto ${description}`);

    return res.status(201).json({ id: validExpense.id, group_id: group_id, total_spent, category, currency, participants, description });
});

  

expenseRoutes.get('/:group_id', validateGetGroupExpenses, async (req, res) => {
    const { group_id } = req.params
    // console.log(group_id)

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
    // console.log(group_id)

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
        // console.log("User:",user);
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
    
    const payment = await Payment.create({ group_id, creditor_id, debtor_id, amount: updatedDebt.amount_owed });
    
    const oldOwed = updatedDebt.amount_owed;
    updatedDebt.amount_owed = 0;
    
    if(!payment){
        return res.status(500).send({ error: "Error registrando el pago" });
    }
    await payment.save();
    
    try {
        const debtor_name = await User.findOne({ where: { id: debtor_id } });
        const creditor_name = await User.findOne({ where: { id: creditor_id } });
        sendNotifiaction(group_id, `Se ha realizado un pago de deuda \n - Deudor: ${debtor_name.username} \n - Acreedor: ${creditor_name.username} \n - Monto: ${oldOwed}`);        
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

expenseRoutes.get('/categories/:group_id/', async (req, res) => {
    console.log("entro");
    const { group_id } = req.params;
    let categories = req.query.categories;

    console.log(categories);
    // Ensure categories is an array
    if (typeof categories === 'string') {
        categories = categories.split(',');
    }

    
    let arrayExpenses = [];

    try {
        for (const category of categories) {
            // Assuming 'Categories' is a predefined array of valid categories
            if (!Categories.includes(category)) {
                return res.status(400).json({ errors: [{ msg: 'Categoría inexistente' }] });
            }
            
            const validExpenses = await Expense.findAll({ where: { category: category, group_id: group_id } });
            let total_spent = 0;
            for (const valExpense of validExpenses) {
                
                total_spent += valExpense.total_spent;
                arrayExpenses.push(valExpense);
                console.log("validExpenses",validExpenses);
            }
        }

        if (arrayExpenses.length === 0) {
            return res.status(404).json({ errors: [{ msg: 'No expenses found for the given categories and group' }] });
        }

        const expenseIds = arrayExpenses.map(expense => expense.id);
        const individualExpenses = await IndividualExpense.findAll({
            where: { expense_id: { [Op.in]: expenseIds } },
            include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
        });

        if (individualExpenses.length === 0) {
            return res.status(400).json({ errors: [{ msg: 'El grupo no tiene gastos individuales' }] });
        }

        let transformedExpenses = arrayExpenses.map(expense => {
            return {
                id: expense.id,
                group_id: expense.group_id,
                total_spent: expense.total_spent,
                category: expense.category,
                currency: expense.currency,
                description: expense.description,
                participants: []
            };
        });

        individualExpenses.forEach(indExpense => {
            const indExpenseJson = indExpense.toJSON();
            indExpenseJson.username = indExpenseJson.user.username;
            indExpenseJson.email = indExpenseJson.user.email;
            delete indExpenseJson.user;

            const expense = transformedExpenses.find(exp => exp.id === indExpenseJson.expense_id);
            if (expense) {
                expense.participants.push(indExpenseJson);
            }
        });

        return res.status(200).json(transformedExpenses);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ errors: [{ msg: 'Error al buscar gastos por categorías' }] });
    }
});



expenseRoutes.get("/history/:group_id", async (req, res) => {

    const { group_id } = req.params;
    console.log("group_id",group_id)
    const group = await Group.findOne({ where: { id: group_id } });

    if (!group) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    const payments = await Payment.findAll({
        attributes: ['group_id','debtor_id', 'creditor_id', 'amount', "creation_date"],
        where: { group_id: group_id },
        include: [
            {
                model: User,
                as: 'debtor',
                attributes: ['email', 'username']
            },
            {
                model: User,
                as: 'creditor',
                attributes: ['email', 'username']
            }
        ],
        raw: true
    });
    if (!payments || payments.length == 0) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no tiene pagos' }] });
    }

    const formattedPayments = payments.map(payment => ({
        debtor: {
            id: payment.debtor_id,
            email: payment['debtor.email'],
            username: payment['debtor.username']
        },
        creditor: {
            id: payment.creditor_id,
            email: payment['creditor.email'],
            username: payment['creditor.username']
        },
        amount: payment.amount,
        date: payment.creation_date
    }));
    
    
    let total = 0;

    for (const payment of payments) {
        total += payment.amount;
    }
     
    return res.status(200).json({
        total_spent: total,
        payments: formattedPayments
    });

});


expenseRoutes.get("/budget/:group_id", async (req, res) => {
    const { group_id } = req.params;
        
    const validGroup = await Group.findOne({ where: { id: group_id } });
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] });
    }

    var cumulative_total_spent = 0;
    const validExpenses = await Expense.findAll({ where: { group_id: group_id } });
    for (const valExpenses of validExpenses) {
        cumulative_total_spent += valExpenses.total_spent;
    }

    if (validGroup.budget > 0) {
        const budget_percentage = (cumulative_total_spent / validGroup.budget) * 100;
        return res.status(200).json(budget_percentage);
    }

});


export default expenseRoutes;