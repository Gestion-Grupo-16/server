import notificationapi from 'notificationapi-node-server-sdk'
import { User } from "../models/User.js";
import { GroupMember } from "../models/GroupMember.js";
import { Group } from "../models/Group.js";

notificationapi.init(
  'imb0fcfuaiouqfvo3acc7krsa', // clientId
  '172nngvvrmkmkhv1vh9lovba852csifndbuta06n1vmu7l64m20t'// clientSecret
)



export const  sendNotifiaction = async (group_id, description) => {

    const group_emails = await GroupMember.findAll({ 
        where: { group_id: group_id },
        include: [{
            model: User,
            attributes: ['email']
        }]
    });
    const group = await Group.findByPk(group_id);
    
    for(const member of group_emails){ 
        notificationapi.send({
            notificationId: 'nuevo_gasto',
            user: {
                id: member.user.email,
                email: member.user.email,
                number: "+00000000" 
            },
            mergeTags: {
                "nombre_grupo": group.name,
                "comment": description
            }
            })
                
    }

};