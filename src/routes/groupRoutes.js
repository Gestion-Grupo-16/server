import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { Expense } from "../models/Expense.js";
import { GroupMember } from "../models/GroupMember.js";
import { createDebts } from "../routes/debtsRoutes.js";


const groupRoutes = express.Router();


const validatePatchGroup = [
    param("group_id")
        .notEmpty()
        .withMessage("Group id is required")
        .bail()
        .isInt()
        .withMessage("Group Id must be an integer")
        .bail(),
    body("admin_id")
        .notEmpty()
        .withMessage("Admin id is required")
        .bail()    
]

const validatePatchAdminGroup = [
    param("group_id")
        .notEmpty()
        .withMessage("Group id is required")
        .bail()
        .isInt()
        .withMessage("Group Id must be an integer")
        .bail(),
    param("user_id")
        .notEmpty()
        .withMessage("User id is required")
        .bail()    
]

const validateGetGroupsOfUser = [
    param("user_id")
    .notEmpty()
    .withMessage("User id is required")
    .bail()
]
const validateGetGroupMembers = [
    param("group_id")
    .notEmpty()
    .withMessage("Group id is required")
    .bail()
    .isInt()
    .withMessage("Group Id must be an integer")
    .bail()
]
const validateCreateGroup = [
    body("user_id")
    .notEmpty()
    .withMessage("User id is required")
    .bail(),
    body("name")
    .notEmpty()
    .withMessage("Group name is required")
    .bail()
];

const validateGroupMemberOperation = [
  param('user_id')
      .notEmpty()
      .withMessage('User id is required')
      .bail()
      .isString()
      .withMessage('User id must be an integer')
      .bail(),
  param('group_id')
      .notEmpty()
      .withMessage('Group id is required')
      .bail()
      .isInt()
      .withMessage('Group id must be an integer')
      .bail()
];

groupRoutes.post('/',validateCreateGroup , async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }  

    const { user_id, name} = req.body;    

    const description = req.body.description || `Group ${name}`;

    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
        return res.status(404).send({ error: "Usuario no encontrado" });
    }  
    
    const group = await Group.create({name: name, admin_id: user_id, description: description, budget: -1});
    if (!group) {
        return res.status(500).send({ error: "Error creando el grupo" });
    }

    const group_member= await GroupMember.create({group_id: group.id, user_id, pending:false});
    if (!group_member) {
        return res.status(500).send({ error: "Error creando al miembro del grupo" });
    }

    res.status(201).send({ message: "Grupo creado exitosamente" });
    // res.status(201).send({group_id, name})
});

groupRoutes.post('/members/:group_id/:user_id', validateGroupMemberOperation, async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const { user_id, group_id } = req.params

    const validUser = await User.findOne({ where: { id: user_id } })
    if (!validUser) {
        return res.status(400).json({ errors: [{ msg: 'El usuario no existe' }] })
    }

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const existingGroupMember = await GroupMember.findOne({ where: { user_id, group_id } })
    if (existingGroupMember) {
        return res.status(400).json({ errors: [{ msg: 'El usuario ya es miembro del grupo'}]})
    }

    const groupMember = await GroupMember.create({ user_id, group_id })
    if (!groupMember) {
        return res.status(500).json({ errors: [{ msg: 'Error agregando usuario al grupo' }] })
    }

    return res.status(201).json(groupMember)
})

groupRoutes.patch('/members/:group_id/:user_id', validatePatchAdminGroup, async (req, res) => {
    
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    const { user_id, group_id } = req.params
    
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const groupMember = await GroupMember.findOne({where: {group_id:group_id, user_id:user_id, pending:true}})

    if(!groupMember){
        return res.status(400).json({ errors: [{ msg: 'No hay invitaciones para este grupo' }] })
    }

    // Agregar la relación de deudas entre el nuevo integrantes y el resto de los integrantes del grupo
    createDebts(group_id, user_id);

    groupMember.pending = false;
    try{
        await groupMember.save();
        return res.status(200).send({ message: "Invitacion aceptada" });
    }catch(e) {
        return res.status(500).send({ message: "No se pudo cambiar el miembro del grupo" });
    }
});

groupRoutes.patch('/:group_id/:user_id/budget', validatePatchAdminGroup, async (req, res) => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    const { group_id, user_id } = req.params
    const { new_budget } = req.body
    
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const groupMember = await GroupMember.findOne({where: {group_id:group_id, user_id:user_id, pending:false}})
    if(!groupMember){
        return res.status(400).json({ errors: [{ msg: 'No hay invitaciones para este grupo' }] })
    }

    var total_spent = 0;

    try{
        const validExpenses = await Expense.findAll({ where: { group_id: group_id } });
        for (const valExpenses of validExpenses) {
            total_spent += valExpenses.total_spent;
        }
    }
    catch{
        return res.status(400).send({ error: "Error: al encontrar todos los gastos" });
    }

    if (total_spent > new_budget){
        return res.status(400).send({ error: "Error:el presupuesto debe ser mayor que lo gastado" });
    }
    else if (new_budget < 0) {
        return res.status(400).send({ error: "Error:el presupuesto debe ser mayor a 0" });
    }

    validGroup.budget = new_budget;

    try {
      await validGroup.save();
      return res.status(200).send({ message: "Presupuesto Actualizado" });
    }
    catch (e) {
      return res.status(500).send({ error: "Error al intentar actualizar el presupuesto del grupo" });
    } 
});


groupRoutes.delete('/members/:group_id/:user_id', validatePatchAdminGroup, async (req, res) =>{
    console.log("DELETE res.body", req.body)
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    const { user_id, group_id } = req.params


    const validUser = await User.findOne({ where: { id: user_id } })
    if (!validUser) {
        return res.status(400).json({ errors: [{ msg: 'El usuario no existe' }] })
    }
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    const groupMember = await GroupMember.findOne({ where: { user_id, group_id, pending: true } })
    if (!groupMember) {
        return res.status(400).json({ errors: [{ msg: 'No hay invitacion para este grupo' }] })
    }
    const deletedGroupMember = await groupMember.destroy()
    if (!deletedGroupMember) {
        return res.status(500).json({ errors: [{ msg: 'Fallo borrando la invitacion para este grupo' }] })
    }

    return res.status(200).send({ message: 'Invitacion borrada'})
});



groupRoutes.delete('/:group_id/:user_id', validateGroupMemberOperation, async (req, res) => {
    const { user_id, group_id } = req.params

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    if (validGroup.admin_id == user_id) {
        return res.status(403).json({ errors: [{ msg: 'El administrador no puede abandonar el grupo' }] })
    }

    const groupMember = await GroupMember.findOne({ where: { user_id, group_id } })
    if (!groupMember) {
        return res.status(404).json({ errors: [{ msg: 'Miembro del grupo no encontrado' }] })
    }

    const deletedGroupMember = await groupMember.destroy()
    if (!deletedGroupMember) {
        return res.status(500).json({ errors: [{ msg: 'Fallo al borrar el miembro del grupo' }] })
    }

    return res.status(200).send({ message: 'Se borro al miembro del grupo exitosamente'})
})

// groupRoutes.patch('/groups/:group_id', validatePatchGroupName, validatePatchGroupDescription ,async (req, res) => {
groupRoutes.patch('/:group_id', validatePatchGroup,async (req, res) => {
    console.log("PATCH res.body", req.body)
    console.log("PATCH res.params", req.params)
    console.log("PATCH res.body", req.query)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }  

    const { admin_id, new_name, new_description} = req.body;    
    const group_id = req.params.group_id;

    const group = await Group.findOne({ where: { id: group_id } });
    
    if (!group) {
        return res.status(404).send({ error: "Grupo no encontrado" });
    }
    
    if (group.admin_id != admin_id){
        return res.status(403).send({ error: "No eres el admin de este grupo" });
    }

    if (new_name) {
        group.name = new_name;
    }

    if (new_description) {
        group.description = new_description;
    }
    
    try {
      await group.save();
      return res.status(200).send({ message: "Grupo actualizado exitosamente" });
    }
    catch (e) {
      return res.status(500).send({ error: "Error al intentar actualizar el grupo" });
    } 

});

// Change the admin of the group
groupRoutes.patch('/admins/:group_id/:user_id', validatePatchAdminGroup,async (req, res) => {
    console.log("PATCH res.body", req.body)
    console.log("PATCH res.params", req.params)
    console.log("PATCH res.body", req.query)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }  

    const {new_admin_id} = req.body;    
    const group_id = req.params.group_id;
    const user_id = req.params.user_id;

    const group = await Group.findOne({ where: { id: group_id } });
    
    if (!group) {
        return res.status(404).send({ error: "Grupo no encontrado" });
    }

    if (group.admin_id != user_id){
        return res.status(403).send({ error: "No eres el admin de este grupo" });
    }

    try {
        await User.findOne({ where: { id: new_admin_id } })
    }
    catch{
        return res.status(400).json({ errors: [{ msg: 'El nuevo admin no existe' }] })
    }

    try{
        await GroupMember.findOne({ where: { user_id: new_admin_id,group_id: group_id } })
    }
    catch{
        return res.status(404).json({ errors: [{ msg: 'El nuevo admin no pertenece a este grupo' }] })
    }

    group.admin_id = new_admin_id;
    
    try {
      await group.save();
      return res.status(200).send({ message: "Grupo actualizado exitosamente" });
    }
    catch (e) {
      return res.status(500).send({ error: "Error al intentar actualizar el grupo" });
    } 

});


groupRoutes.get('/member/:user_id', validateGetGroupsOfUser , async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.params.user_id;
    const user_groups = await GroupMember.findAll({ where: { user_id } });
    
    if (!user_groups) {
      return res.status(404).send({ error: "El usuario no tiene grupos" });
    }

    const groups_info_promises = user_groups.map(group => {
        return Group.findOne({ where: { id: group.group_id },
          include: [{
              model: GroupMember,
              as: 'group_members',
              where: { user_id },
              attributes: ['pending'] // Only select 'pending'
          }] })
          .then(group => {
            // Destructure the group object to separate group_members from the rest
            const { group_members, ...groupProps } = group.get();
            // Return a new object with the group properties and the 'pending' property
            return { ...groupProps, pending: group_members[0].pending };
          });
      });

    const groups_info = await Promise.all(groups_info_promises);

    if(!groups_info){
        return res.status(404).send({ error: "El usuario no tiene grupos" });
    }

    return res.status(200).json(groups_info);
});

groupRoutes.get('/members/:group_id', validateGetGroupMembers, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const group_id = req.params.group_id;

    const group_members = await GroupMember.findAll({
        where: { group_id },
        attributes: ['pending'], // Only select the 'pending' field from GroupMember
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'] // Only select 'id', 'username', 'email' from User
        }]
    });

    if (!group_members) {
    return res.status(404).send({ error: "El grupo no tiene miembros" });
    }

    return res.status(200).json(group_members);
});

groupRoutes.get('/:group_id/budget', validateGetGroupMembers, async (req, res) => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    const { group_id } = req.params
    
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'El grupo no existe' }] })
    }

    var total_spent = 0;
    try{
        const validExpenses = await Expense.findAll({ where: { group_id: group_id } });
        for (const valExpenses of validExpenses) {
            total_spent += valExpenses.total_spent;
        }
    }
    catch{
        return res.status(400).send({ error: "Error: al encontrar todos los gastos" });
    }

    const group_budget = validGroup.budget;
    const dif_budget = group_budget - total_spent;

    
    return res.status(200).json({group_budget : group_budget, total_spent : total_spent, dif_budget : dif_budget});
});

export default groupRoutes;