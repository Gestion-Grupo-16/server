import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { GroupMember } from "../models/GroupMember.js";

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
        return res.status(404).send({ error: "User not found" });
    }  
    
    const group = await Group.create({name: name, admin_id: user_id, description: description});
    if (!group) {
        return res.status(500).send({ error: "Error while creating group" });
    }

    const group_member= await GroupMember.create({group_id: group.id, user_id, pending:false});
    if (!group_member) {
        return res.status(500).send({ error: "Error while creating group member" });
    }

    res.status(201).send({ message: "Group successfully created" });
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
        return res.status(400).json({ errors: [{ msg: 'User does not exist' }] })
    }

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const existingGroupMember = await GroupMember.findOne({ where: { user_id, group_id } })
    if (existingGroupMember) {
        return res.status(400).json({ errors: [{ msg: 'User is already a member of the group'}]})
    }

    const groupMember = await GroupMember.create({ user_id, group_id })
    if (!groupMember) {
        return res.status(500).json({ errors: [{ msg: 'Failed to add user to group' }] })
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
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const groupMember = await GroupMember.findOne({where: {group_id:group_id, user_id:user_id, pending:true}})

    if(!groupMember){
        return res.status(400).json({ errors: [{ msg: 'No invitation for this group' }] })
    }

    groupMember.pending = false;
    try{
        await groupMember.save();
        return res.status(200).send({ message: "Invitation accepted" });
    }catch(e) {
        return res.status(500).send({ message: "Couldn save groupmember" });
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
        return res.status(400).json({ errors: [{ msg: 'User does not exist' }] })
    }
    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    const groupMember = await GroupMember.findOne({ where: { user_id, group_id, pending: true } })
    if (!groupMember) {
        return res.status(400).json({ errors: [{ msg: 'No invitation for this group' }] })
    }
    const deletedGroupMember = await groupMember.destroy()
    if (!deletedGroupMember) {
        return res.status(500).json({ errors: [{ msg: 'Failed to delete the group invitation' }] })
    }

    return res.status(200).send({ message: 'Invitation Deleted'})
});



groupRoutes.delete('/:group_id/:user_id', validateGroupMemberOperation, async (req, res) => {
    const { user_id, group_id } = req.params

    const validGroup = await Group.findOne({ where: { id: group_id } })
    if (!validGroup) {
        return res.status(400).json({ errors: [{ msg: 'Group does not exist' }] })
    }

    if (validGroup.admin_id == user_id) {
        return res.status(403).json({ errors: [{ msg: 'Group admin cannot leave the group' }] })
    }

    const groupMember = await GroupMember.findOne({ where: { user_id, group_id } })
    if (!groupMember) {
        return res.status(404).json({ errors: [{ msg: 'Group member not found' }] })
    }

    const deletedGroupMember = await groupMember.destroy()
    if (!deletedGroupMember) {
        return res.status(500).json({ errors: [{ msg: 'Failed to delete group member' }] })
    }

    return res.status(200).send({ message: 'Group member deleted'})
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
        return res.status(404).send({ error: "Group not found" });
    }
    
    if (group.admin_id != admin_id){
        return res.status(403).send({ error: "You are not the admin of this group" });
    }

    if (new_name) {
        group.name = new_name;
    }

    if (new_description) {
        group.description = new_description;
    }
    
    try {
      await group.save();
      return res.status(200).send({ message: "Group updated successfully" });
    }
    catch (e) {
      return res.status(500).send({ error: "Error while updating group" });
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
        return res.status(404).send({ error: "Group not found" });
    }

    if (group.admin_id != user_id){
        return res.status(403).send({ error: "You are not the admin of this group" });
    }

    try {
        await User.findOne({ where: { id: new_admin_id } })
    }
    catch{
        return res.status(400).json({ errors: [{ msg: 'New admin does not exist' }] })
    }

    try{
        await GroupMember.findOne({ where: { user_id: new_admin_id,group_id: group_id } })
    }
    catch{
        return res.status(404).json({ errors: [{ msg: 'New admin does not belongs to this group' }] })
    }

    group.admin_id = new_admin_id;
    
    try {
      await group.save();
      return res.status(200).send({ message: "Group updated successfully" });
    }
    catch (e) {
      return res.status(500).send({ error: "Error while updating group" });
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
      return res.status(404).send({ error: "User has no groups" });
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
        return res.status(404).send({ error: "User has no groups" });
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
    return res.status(404).send({ error: "Group has no members" });
    }

    return res.status(200).json(group_members);

    // const group_id = req.params.group_id;
    // const group_members = await GroupMember.findAll({ where: { group_id } });
    
    // if (!group_members) {
    //   return res.status(404).send({ error: "Group has no members" });
    // }

    // const members_info_promises = group_members.map(member => {
    //   return User.findOne({ where: { id: member.user_id } });
    // });

    // const members_info = await Promise.all(members_info_promises);

    // return res.status(200).json(members_info);
});

export default groupRoutes;