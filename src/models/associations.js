import { GroupMember } from "./GroupMember.js";
import { User } from "./User.js";
import { Group } from "./Group.js";

User.hasMany(GroupMember, { foreignKey: 'user_id' });
Group.hasMany(GroupMember, { foreignKey: 'group_id' });
GroupMember.belongsTo(User, { foreignKey: 'user_id' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id' });