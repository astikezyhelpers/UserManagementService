import bcrypt from 'bcrypt';

export const HashedPassword = async (password,saltRange) => {
  const salt = await bcrypt.genSalt(saltRange);
  if(!salt){
    console.log("Error in generating salt");
    return "Error in generating salt"; 
  }
  const  hashedPassword = await bcrypt.hash(password, salt);
  if(!hashedPassword){
    console.log("Error in hashing password");
    return "Error in hashing password"; 
  }
  return hashedPassword;
}
