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

    const group_member= await GroupMember.create({group_id: group.id, user_id});
    if (!group_member) {
        return res.status(500).send({ error: "Error while creating group member" });
    }

    res.status(201).send({ message: "Group successfully created" });
    // res.status(201).send({group_id, name})


});

// groupRoutes.patch('/groups/:group_id', validatePatchGroupName, validatePatchGroupDescription ,async (req, res) => {
groupRoutes.patch('/:group_id', validatePatchGroup,async (req, res) => {

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
      return Group.findOne({ where: { id: group.group_id } });
    });

    const groups_info = await Promise.all(groups_info_promises);

    return res.status(200).json(groups_info);
});

groupRoutes.get('/members/:group_id', validateGetGroupMembers, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const group_id = req.params.group_id;
    const group_members = await GroupMember.findAll({ where: { group_id } });
    
    if (!group_members) {
      return res.status(404).send({ error: "Group has no members" });
    }

    const members_info_promises = group_members.map(member => {
      return User.findOne({ where: { id: member.user_id } });
    });

    const members_info = await Promise.all(members_info_promises);

    return res.status(200).json(members_info);
});

export default groupRoutes;