import bcrypt from 'bcrypt';
import logger from '../logger.js';

export const HashedPassword = async (password,saltRange) => {
  const salt = await bcrypt.genSalt(saltRange);
  if(!salt){
    logger.error("Error in generating salt");
    return "Error in generating salt"; 
  }
  const  hashedPassword = await bcrypt.hash(password, salt);
  if(!hashedPassword){
    logger.error("Error in hashing password");
    return "Error in hashing password"; 
  }
  return hashedPassword;
}
