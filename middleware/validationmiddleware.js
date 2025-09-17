
const Input = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if(error){
            console.log("error", error);
            return res.status(401).json({message: error.details[0].message});
        }
        else{
            next();
        }
    };
};

export default Input;